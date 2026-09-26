import { useAction } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { userErrorMessage } from "@/lib/errors";

import { PopIn, useLoop } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { authClient } from "@/lib/auth/client";

import { api } from "../../../convex/_generated/api";

const PAYOUT_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type PayoutWeekday = (typeof PAYOUT_WEEKDAYS)[number];
type SetupMode = "start" | "create" | "join";
type InviteErrorKind = "invalid" | "revoked" | "used" | "expired" | "other";

const SHORT_WEEKDAYS: Record<PayoutWeekday, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return "";
  }
}

function getInviteError(message: string) {
  const normalized = message.toLowerCase();
  let kind: InviteErrorKind = "other";

  if (normalized.includes("revoked")) kind = "revoked";
  else if (normalized.includes("already been used")) kind = "used";
  else if (normalized.includes("expired")) kind = "expired";
  else if (normalized.includes("invalid parent invite")) kind = "invalid";

  const copy: Record<InviteErrorKind, { title: string; detail: string }> = {
    invalid: {
      title: "Invalid parent invite.",
      detail: "Check the code and try again.",
    },
    revoked: {
      title: "This parent invite has been revoked.",
      detail: "Ask the inviting parent for a new invite.",
    },
    used: {
      title: "This parent invite has already been used.",
      detail: "Ask the inviting parent for a new invite.",
    },
    expired: {
      title: "This parent invite has expired.",
      detail: "Ask the inviting parent for a new invite.",
    },
    other: {
      title: "Could not join household.",
      detail: message,
    },
  };

  return copy[kind];
}

/**
 * The household as a little house that grows as it's set up: a window lights
 * up for each kid added, with their initial in it. Smoke drifts from the
 * chimney once it has a name.
 */
function HomeBuild({ name, kids }: { name: string; kids: string[] }) {
  const { tokens } = useTheme();
  const smoke = useLoop({ duration: 2600, rest: 0.4 });
  const smokeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(smoke.get(), [0, 0.2, 1], [0, 0.6, 0]),
    transform: [
      { translateY: interpolate(smoke.get(), [0, 1], [0, -26]) },
      { scale: interpolate(smoke.get(), [0, 1], [0.6, 1.3]) },
    ],
  }));
  const windows = kids.slice(0, 4);
  const width = 220;
  return (
    <View className="items-center" accessible={false}>
      <View style={{ width, height: 170 }}>
        {name.trim() ? (
          <Animated.View
            style={[
              {
                position: "absolute",
                left: 146,
                top: 18,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: tokens.line,
              },
              smokeStyle,
            ]}
          />
        ) : null}
        <Svg width={width} height={170}>
          <Rect
            x={140}
            y={34}
            width={18}
            height={30}
            rx={3}
            fill={tokens.inkMuted}
          />
          <Path d="M24 88 L110 22 L196 88 Z" fill={tokens.urgency} />
          <Rect
            x={38}
            y={84}
            width={144}
            height={80}
            rx={10}
            fill={tokens.surface}
          />
          <Rect
            x={96}
            y={120}
            width={28}
            height={44}
            rx={6}
            fill={tokens.reward}
          />
          <Circle cx={118} cy={143} r={2.5} fill={tokens.ink} />
        </Svg>
        {Array.from({ length: 4 }, (_, i) => {
          const kid = windows[i]?.trim();
          const x = [50, 140, 50, 140][i];
          const y = [94, 94, 128, 128][i];
          if (i >= 2 && windows.length <= 2) return null;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 30,
                height: 28,
                borderRadius: 6,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: kid ? tokens.reward : tokens.surfaceMuted,
              }}
            >
              {kid ? (
                <PopIn key={kid.charAt(0)}>
                  <AppText variant="label">
                    {kid.charAt(0).toUpperCase()}
                  </AppText>
                </PopIn>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BigChoice({
  icon,
  title,
  body,
  primary,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Animated.View
          className="min-h-[84px] flex-row items-center gap-4 rounded-[24px] px-5 py-4"
          style={[
            {
              backgroundColor: primary ? tokens.ink : tokens.surface,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: primary ? tokens.action : tokens.actionSoft,
            }}
          >
            <Icon
              name={icon}
              color={primary ? tokens.onAction : tokens.action}
              size={22}
            />
          </View>
          <View className="flex-1">
            <AppText
              variant="cardTitle"
              style={{ color: primary ? tokens.surface : tokens.ink }}
            >
              {title}
            </AppText>
            <AppText
              variant="caption"
              style={{ color: primary ? tokens.inkFaint : tokens.inkMuted }}
            >
              {body}
            </AppText>
          </View>
          <Icon
            name="chevron"
            color={primary ? tokens.surface : tokens.inkMuted}
            size={18}
          />
        </Animated.View>
      )}
    </Pressable>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  const { tokens } = useTheme();
  if (!message) return null;
  return (
    <View
      className="mt-4 rounded-[18px] px-4 py-3"
      style={{ backgroundColor: tokens.urgencySoft }}
    >
      <AppText variant="bodySmall" color="urgency">
        {message}
      </AppText>
    </View>
  );
}

function Frame({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {onBack ? (
          <View className="px-5 pt-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: tokens.surface }}
            >
              <Icon name="back" color={tokens.ink} size={20} />
            </Pressable>
          </View>
        ) : null}
        <ScrollView
          contentContainerClassName="flex-grow px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HouseholdStart({
  onCreate,
  onJoin,
  onSignOut,
  signingOut,
  errorMessage,
}: {
  onCreate: () => void;
  onJoin: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  errorMessage: string | null;
}) {
  return (
    <Frame>
      <View className="flex-1 justify-center pt-6">
        <HomeBuild name="" kids={[]} />
        <AppText variant="display" className="mt-4 text-center">
          Let’s set up home
        </AppText>
        <AppText color="ink-muted" className="mt-2 text-center">
          Start a new household, or join one another parent already made.
        </AppText>
        <View className="mt-8 gap-3">
          <BigChoice
            primary
            icon="home"
            title="Start a household"
            body="Add your kids and set payday"
            onPress={onCreate}
          />
          <BigChoice
            icon="personPlus"
            title="Join with an invite"
            body="Another parent sent you a code"
            onPress={onJoin}
          />
        </View>
        <ErrorNote message={errorMessage} />
        <ActionButton
          className="mt-6"
          tone="quiet"
          label={signingOut ? "Signing out…" : "Sign out"}
          disabled={signingOut}
          onPress={onSignOut}
        />
      </View>
    </Frame>
  );
}

type CreateScreenProps = {
  onBack: () => void;
  householdName: string;
  setHouseholdName: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  payoutWeekday: PayoutWeekday | null;
  setPayoutWeekday: (value: PayoutWeekday) => void;
  weeklyUnclaimAllowance: string;
  setWeeklyUnclaimAllowance: (value: string) => void;
  children: string[];
  updateChild: (index: number, value: string) => void;
  addChild: () => void;
  removeChild: (index: number) => void;
  errorMessage: string | null;
  creatingHousehold: boolean;
  onCreate: () => void;
};

function CreateHousehold(props: CreateScreenProps) {
  const { tokens } = useTheme();
  const allowance = Number(props.weeklyUnclaimAllowance) || 0;
  return (
    <Frame onBack={props.onBack}>
      <HomeBuild name={props.householdName} kids={props.children} />

      <AppText variant="label" color="ink-muted" className="mt-4">
        Household name
      </AppText>
      <TextInput
        accessibilityLabel="Household name"
        value={props.householdName}
        onChangeText={props.setHouseholdName}
        placeholder="The Krasniqi Family"
        placeholderTextColor={tokens.inkFaint}
        className="mt-2 min-h-[54px] rounded-[16px] px-4 font-body-heavy text-ink"
        style={{ backgroundColor: tokens.surface, fontSize: 18 }}
      />

      <AppText variant="label" color="ink-muted" className="mt-6">
        Kids
      </AppText>
      <View className="mt-2 gap-2">
        {props.children.map((child, index) => (
          <View key={index} className="flex-row items-center gap-2">
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: child.trim()
                  ? tokens.reward
                  : tokens.surfaceMuted,
              }}
            >
              <AppText variant="label">
                {child.trim().charAt(0).toUpperCase() || index + 1}
              </AppText>
            </View>
            <TextInput
              accessibilityLabel={`Kid ${index + 1} name`}
              value={child}
              onChangeText={(value) => props.updateChild(index, value)}
              placeholder="First name"
              placeholderTextColor={tokens.inkFaint}
              className="min-h-[48px] flex-1 rounded-[14px] px-3 font-body-heavy text-ink"
              style={{ backgroundColor: tokens.surface }}
            />
            {props.children.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove kid ${index + 1}`}
                onPress={() => props.removeChild(index)}
                hitSlop={8}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="close" color={tokens.inkMuted} size={18} />
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={props.addChild}
          className="min-h-[48px] flex-row items-center gap-2 rounded-[14px] border-2 border-dashed border-line px-3"
        >
          <Icon name="plus" color={tokens.action} size={18} />
          <AppText variant="label" color="action">
            Add another kid
          </AppText>
        </Pressable>
      </View>

      <AppText variant="label" color="ink-muted" className="mt-6">
        Payday
      </AppText>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {PAYOUT_WEEKDAYS.map((day) => {
          const active = props.payoutWeekday === day;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={day}
              accessibilityState={{ selected: active }}
              onPress={() => props.setPayoutWeekday(day)}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: active ? tokens.ink : tokens.surface }}
            >
              <AppText
                variant="caption"
                style={{ color: active ? tokens.surface : tokens.ink }}
              >
                {SHORT_WEEKDAYS[day]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="label" color="ink-muted" className="mt-6">
        Unclaim keys per week
      </AppText>
      <View
        className="mt-2 flex-row items-center gap-4 rounded-[18px] px-4 py-3"
        style={{ backgroundColor: tokens.surface }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="One fewer"
          disabled={allowance === 0}
          onPress={() =>
            props.setWeeklyUnclaimAllowance(String(Math.max(0, allowance - 1)))
          }
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.surfaceMuted }}
        >
          <Icon name="minus" color={tokens.ink} size={16} />
        </Pressable>
        <View className="flex-1 flex-row items-center justify-center gap-1">
          {Array.from({ length: Math.min(allowance, 6) }, (_, i) => (
            <Icon key={i} name="key" color={tokens.reward} size={18} />
          ))}
          <AppText variant="cardTitle" className="ml-1">
            {allowance}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="One more"
          onPress={() => props.setWeeklyUnclaimAllowance(String(allowance + 1))}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.surfaceMuted }}
        >
          <Icon name="plus" color={tokens.ink} size={16} />
        </Pressable>
      </View>
      <AppText variant="caption" color="ink-muted" className="mt-1">
        How many bonus quests a kid may drop each week.
      </AppText>

      <AppText variant="label" color="ink-muted" className="mt-6">
        Time zone
      </AppText>
      <TextInput
        accessibilityLabel="Time zone"
        value={props.timezone}
        onChangeText={props.setTimezone}
        autoCapitalize="none"
        autoCorrect={false}
        className="mt-2 min-h-[48px] rounded-[14px] px-3 font-body-heavy text-ink"
        style={{ backgroundColor: tokens.surface }}
      />

      <ErrorNote message={props.errorMessage} />
      <ActionButton
        className="mt-8"
        label="Create household"
        loading={props.creatingHousehold}
        onPress={props.onCreate}
      />
    </Frame>
  );
}

/** An envelope with the invite, flap bobbing gently. */
function InviteEnvelope() {
  const { tokens } = useTheme();
  const bob = useLoop({ duration: 3000, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(bob.get(), [0, 1], [-4, 4]) },
      { rotate: `${interpolate(bob.get(), [0, 1], [-3, 3])}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ alignSelf: "center" }, style]} accessible={false}>
      <Svg width={170} height={120}>
        <Rect
          x={10}
          y={20}
          width={150}
          height={96}
          rx={12}
          fill={tokens.surface}
        />
        <Path
          d="M10 30 L85 78 L160 30"
          fill="none"
          stroke={tokens.line}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Circle cx={85} cy={78} r={14} fill={tokens.urgency} />
        <Path
          d="M79 78 l4 4 8 -9"
          fill="none"
          stroke={tokens.surface}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

function JoinHousehold({
  onBack,
  onCreate,
  token,
  setToken,
  errorMessage,
  joiningHousehold,
  onJoin,
}: {
  onBack: () => void;
  onCreate: () => void;
  token: string;
  setToken: (value: string) => void;
  errorMessage: string | null;
  joiningHousehold: boolean;
  onJoin: () => void;
}) {
  const { tokens } = useTheme();
  const inviteError = errorMessage ? getInviteError(errorMessage) : null;
  return (
    <Frame onBack={onBack}>
      <View className="pt-4">
        <InviteEnvelope />
        <AppText variant="display" className="mt-4 text-center">
          Join a household
        </AppText>
        <AppText color="ink-muted" className="mt-2 text-center">
          Paste the invite another parent sent you. You’ll share the same
          controls.
        </AppText>
        <TextInput
          accessibilityLabel="Invite code"
          value={token}
          onChangeText={setToken}
          placeholder="Paste invite"
          placeholderTextColor={tokens.inkFaint}
          autoCapitalize="none"
          autoCorrect={false}
          className="mt-6 min-h-[56px] rounded-[16px] px-4 font-body-heavy text-ink"
          style={{ backgroundColor: tokens.surface }}
        />
        {inviteError ? (
          <View
            className="mt-4 rounded-[18px] px-4 py-3"
            style={{ backgroundColor: tokens.urgencySoft }}
          >
            <AppText variant="label" color="urgency">
              {inviteError.title}
            </AppText>
            <AppText variant="caption" color="urgency" className="mt-0.5">
              {inviteError.detail}
            </AppText>
          </View>
        ) : null}
        <ActionButton
          className="mt-6"
          label="Join household"
          loading={joiningHousehold}
          onPress={onJoin}
        />
        <ActionButton
          className="mt-2"
          tone="quiet"
          label="Start a new household instead"
          onPress={onCreate}
        />
      </View>
    </Frame>
  );
}

export type HouseholdSetupVisualFixture = {
  mode: SetupMode;
  householdName?: string;
  timezone?: string;
  payoutWeekday?: PayoutWeekday;
  weeklyUnclaimAllowance?: string;
  children?: string[];
  parentInviteToken?: string;
  errorMessage?: string;
};

export function HouseholdSetupScreen({
  visualFixture,
}: {
  visualFixture?: HouseholdSetupVisualFixture;
} = {}) {
  const [mode, setMode] = useState<SetupMode>(visualFixture?.mode ?? "start");
  const [householdName, setHouseholdName] = useState(
    visualFixture?.householdName ?? "",
  );
  const [timezone, setTimezone] = useState(
    visualFixture?.timezone ?? getDeviceTimezone,
  );
  const [payoutWeekday, setPayoutWeekday] = useState<PayoutWeekday | null>(
    visualFixture?.payoutWeekday ?? "friday",
  );
  const [weeklyUnclaimAllowance, setWeeklyUnclaimAllowance] = useState(
    visualFixture?.weeklyUnclaimAllowance ?? "2",
  );
  const [children, setChildren] = useState<string[]>(
    visualFixture?.children ?? [""],
  );
  const [parentInviteToken, setParentInviteToken] = useState(
    visualFixture?.parentInviteToken ?? "",
  );
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    visualFixture?.errorMessage ?? null,
  );

  const createHousehold = useServerConfirmedMutation(api.households.create);
  const acceptParentInvite = useAction(api.parentInvites.accept);

  function showMode(nextMode: SetupMode) {
    setErrorMessage(null);
    setMode(nextMode);
  }

  async function handleCreateHousehold() {
    setErrorMessage(null);
    const name = householdName.trim();
    const householdTimezone = timezone.trim();

    if (!name) return setErrorMessage("Enter a household name.");
    if (!householdTimezone)
      return setErrorMessage("Enter a household timezone.");
    if (!payoutWeekday) return setErrorMessage("Choose a payout weekday.");
    if (!/^\d+$/.test(weeklyUnclaimAllowance)) {
      return setErrorMessage(
        "Weekly unclaim allowance must be a non-negative whole number.",
      );
    }

    const normalizedChildren = children.map((child) => child.trim());
    if (normalizedChildren.some((child) => !child)) {
      return setErrorMessage("Each child needs a name.");
    }

    setCreatingHousehold(true);
    try {
      await createHousehold({
        name,
        timezone: householdTimezone,
        payoutWeekday,
        weeklyUnclaimAllowance: Number(weeklyUnclaimAllowance),
        children: normalizedChildren.map((displayName) => ({ displayName })),
      });
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not create household."));
    } finally {
      setCreatingHousehold(false);
    }
  }

  async function handleJoinHousehold() {
    setErrorMessage(null);
    const token = parentInviteToken.trim();
    if (!token) return setErrorMessage("Invite token is required.");

    setJoiningHousehold(true);
    try {
      await acceptParentInvite({ token });
      setParentInviteToken("");
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not join household."));
    } finally {
      setJoiningHousehold(false);
    }
  }

  function updateChild(index: number, value: string) {
    setChildren((current) =>
      current.map((child, childIndex) =>
        childIndex === index ? value : child,
      ),
    );
  }

  async function handleSignOut() {
    setErrorMessage(null);
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not sign out."));
      setSigningOut(false);
    }
  }

  if (mode === "create") {
    return (
      <CreateHousehold
        onBack={() => showMode("start")}
        householdName={householdName}
        setHouseholdName={setHouseholdName}
        timezone={timezone}
        setTimezone={setTimezone}
        payoutWeekday={payoutWeekday}
        setPayoutWeekday={setPayoutWeekday}
        weeklyUnclaimAllowance={weeklyUnclaimAllowance}
        setWeeklyUnclaimAllowance={setWeeklyUnclaimAllowance}
        children={children}
        updateChild={updateChild}
        addChild={() => setChildren((current) => [...current, ""])}
        removeChild={(index) =>
          setChildren((current) =>
            current.filter((_, childIndex) => childIndex !== index),
          )
        }
        errorMessage={errorMessage}
        creatingHousehold={creatingHousehold}
        onCreate={() => void handleCreateHousehold()}
      />
    );
  }

  if (mode === "join") {
    return (
      <JoinHousehold
        onBack={() => showMode("start")}
        onCreate={() => showMode("create")}
        token={parentInviteToken}
        setToken={(value) => {
          setParentInviteToken(value);
          if (errorMessage) setErrorMessage(null);
        }}
        errorMessage={errorMessage}
        joiningHousehold={joiningHousehold}
        onJoin={() => void handleJoinHousehold()}
      />
    );
  }

  return (
    <HouseholdStart
      onCreate={() => showMode("create")}
      onJoin={() => showMode("join")}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
      errorMessage={errorMessage}
    />
  );
}
