import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { authClient } from "@/lib/auth/client";
import { useAction } from "convex/react";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";

const createArtwork = require("../../../assets/images/direction-c/parent-access-hero.png");
const joinArtwork = require("../../../assets/images/direction-c/onboarding-family.png");

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
      title: "This invite was revoked.",
      detail: "Ask a Parent in the household for a new invite.",
    },
    used: {
      title: "This invite has already been used.",
      detail: "Parent invites can be used once.",
    },
    expired: {
      title: "This invite has expired.",
      detail: "Ask a Parent in the household for a new invite.",
    },
    other: {
      title: "Could not join household.",
      detail: message,
    },
  };

  return copy[kind];
}

function ChoiceCard({
  title,
  description,
  imageSource,
  tone,
  onPress,
}: {
  title: string;
  description: string;
  imageSource: number;
  tone: "mint" | "lavender";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-[152px] overflow-hidden rounded-large p-5 shadow-md ${
        tone === "mint" ? "bg-actionSoft" : "bg-infoSoft"
      }`}
    >
      <Image
        source={imageSource}
        className="absolute -bottom-3 -left-3 h-[155px] w-[175px]"
        contentFit="contain"
        accessible={false}
      />
      <View className="ml-[48%] flex-1 justify-center pr-6">
        <AppText variant="sectionTitle">{title}</AppText>
        <AppText variant="bodySmall" className="mt-2">
          {description}
        </AppText>
      </View>
      <View className="absolute right-3 top-1/2 -mt-5 h-10 w-10 items-center justify-center">
        <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={25} />
      </View>
    </Pressable>
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
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-2 flex-row justify-end">
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={onSignOut}
            className="min-h-target justify-center px-2"
          >
            <AppText>{signingOut ? "Signing out…" : "Sign out"}</AppText>
          </Pressable>
        </View>

        <AppText
          variant="label"
          color="ink-faint"
          className="mt-4 uppercase tracking-widest"
        >
          Household setup
        </AppText>
        <AppText variant="display" className="mt-3">
          Set up your family
        </AppText>
        <AppText className="mt-2 max-w-[340px]">
          Create a new household or join one using a Parent invite.
        </AppText>

        <View className="mt-7 gap-4">
          <ChoiceCard
            title="Create a household"
            description="Start a new family space, add children, and choose the weekly settings."
            imageSource={createArtwork}
            tone="mint"
            onPress={onCreate}
          />
          <ChoiceCard
            title="Join a household"
            description="Use a Parent invite from someone already in the household."
            imageSource={joinArtwork}
            tone="lavender"
            onPress={onJoin}
          />
        </View>

        <Surface
          tone="muted"
          elevated={false}
          className="mt-5 flex-row items-center p-4"
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-surfaceRaised">
            <DirectionCIcon
              name="person"
              color={DirectionC.color.green}
              size={25}
            />
          </View>
          <AppText className="ml-4 flex-1">
            Every Parent in a household has the same controls.
          </AppText>
        </Surface>

        {errorMessage ? (
          <Surface tone="coral" elevated={false} className="mt-4 p-3">
            <AppText variant="bodySmall" color="urgency">
              {errorMessage}
            </AppText>
          </Surface>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5">
          <TopBar title="Create household" onBack={props.onBack} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-5"
        >
          <Surface
            tone="mint"
            elevated={false}
            className="h-[118px] overflow-hidden px-5"
          >
            <Image
              source={createArtwork}
              className="absolute -bottom-5 left-1 h-[130px] w-[190px]"
              contentFit="contain"
              accessible={false}
            />
            <AppText variant="cardTitle" className="ml-[43%] mt-7">
              Choose the defaults for your family.
            </AppText>
          </Surface>

          <AppText variant="sectionTitle" className="mt-5">
            Household
          </AppText>
          <Surface className="mt-2 gap-4 p-4">
            <FormField
              label="Household name"
              placeholder="Krasniqi Family"
              value={props.householdName}
              onChangeText={props.setHouseholdName}
              autoCapitalize="words"
            />
            <FormField
              label="Household timezone"
              helper="Use an IANA timezone such as Europe/Stockholm."
              placeholder="Europe/Stockholm"
              value={props.timezone}
              onChangeText={props.setTimezone}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Surface>

          <AppText variant="sectionTitle" className="mt-5">
            Weekly settings
          </AppText>
          <Surface className="mt-2 p-4">
            <AppText variant="label">Payout weekday</AppText>
            <View className="mt-3 flex-row overflow-hidden rounded-control bg-infoSoft">
              {PAYOUT_WEEKDAYS.map((day) => {
                const selected = props.payoutWeekday === day;
                return (
                  <Pressable
                    key={day}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => props.setPayoutWeekday(day)}
                    className={`min-h-target flex-1 items-center justify-center rounded-control ${
                      selected ? "bg-action" : "bg-transparent"
                    }`}
                  >
                    <AppText
                      variant="bodySmall"
                      color={selected ? "white" : "ink"}
                      className="font-bold"
                    >
                      {SHORT_WEEKDAYS[day]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <View className="mt-4">
              <FormField
                label="Weekly unclaim allowance"
                helper="The same allowance applies to every child each payout week."
                placeholder="Enter a whole number"
                value={props.weeklyUnclaimAllowance}
                onChangeText={props.setWeeklyUnclaimAllowance}
                keyboardType="number-pad"
              />
            </View>
          </Surface>

          <AppText variant="sectionTitle" className="mt-5">
            Children
          </AppText>
          <Surface className="mt-2 p-4">
            <View className="gap-4">
              {props.children.map((child, index) => (
                <View key={index}>
                  <FormField
                    label={
                      props.children.length === 1
                        ? "Child name"
                        : `Child ${index + 1} name`
                    }
                    placeholder="Alex"
                    value={child}
                    onChangeText={(value) => props.updateChild(index, value)}
                    autoCapitalize="words"
                  />
                  {props.children.length > 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => props.removeChild(index)}
                      className="min-h-target justify-center self-end px-1"
                    >
                      <AppText variant="bodySmall" color="urgency">
                        Remove child
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
            <ActionButton
              tone="secondary"
              className="mt-4"
              label="Add child"
              leading={<AppText variant="sectionTitle">＋</AppText>}
              onPress={props.addChild}
            />
          </Surface>

          {props.errorMessage ? (
            <Surface tone="coral" elevated={false} className="mt-4 p-3">
              <AppText variant="bodySmall" color="urgency">
                {props.errorMessage}
              </AppText>
            </Surface>
          ) : null}
        </ScrollView>

        <View className="border-t border-line bg-surfaceRaised px-5 pt-3">
          <ActionButton
            label="Create household"
            loading={props.creatingHousehold}
            onPress={props.onCreate}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  const error = errorMessage ? getInviteError(errorMessage) : null;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5">
          <TopBar title="Household setup" onBack={onBack} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-8"
        >
          <Image
            source={joinArtwork}
            className="mt-1 h-[225px] w-full"
            contentFit="contain"
            accessible={false}
          />
          <AppText variant="display" className="mt-1">
            Join a household
          </AppText>
          <AppText className="mt-2">
            Paste the Parent invite shared with you.
          </AppText>

          <Surface
            tone="mint"
            elevated={false}
            className="mt-5 flex-row items-center p-4"
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-action">
              <DirectionCIcon
                name="checkShield"
                color={DirectionC.color.white}
                size={28}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle" color="action">
                Equal Parent authority
              </AppText>
              <AppText color="ink-muted" className="mt-1">
                You’ll have the same household controls as every other Parent.
              </AppText>
            </View>
          </Surface>

          <View className="mt-5">
            <FormField
              label="Parent invite code"
              placeholder="Paste invite code"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              error={error ? " " : undefined}
            />
          </View>

          {error ? (
            <Surface
              tone="coral"
              elevated={false}
              className="mt-3 flex-row items-center p-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-urgency">
                <AppText variant="cardTitle" color="white">
                  !
                </AppText>
              </View>
              <View className="ml-3 flex-1">
                <AppText variant="label" color="urgency">
                  {error.title}
                </AppText>
                <AppText variant="bodySmall" color="urgency" className="mt-0.5">
                  {error.detail}
                </AppText>
              </View>
            </Surface>
          ) : (
            <View className="mt-3 flex-row items-center">
              <DirectionCIcon
                name="checkShield"
                color={DirectionC.color.green}
                size={24}
              />
              <AppText variant="bodySmall" color="ink-muted" className="ml-3">
                A Parent invite can be used once.
              </AppText>
            </View>
          )}

          <ActionButton
            className="mt-6"
            label="Join household"
            loading={joiningHousehold}
            onPress={onJoin}
          />
          <ActionButton
            tone="quiet"
            className="mt-3"
            label="Create a new household"
            onPress={onCreate}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function HouseholdSetupScreen() {
  const [mode, setMode] = useState<SetupMode>("start");
  const [householdName, setHouseholdName] = useState("");
  const [timezone, setTimezone] = useState(getDeviceTimezone);
  const [payoutWeekday, setPayoutWeekday] = useState<PayoutWeekday | null>(
    "friday",
  );
  const [weeklyUnclaimAllowance, setWeeklyUnclaimAllowance] = useState("2");
  const [children, setChildren] = useState<string[]>([""]);
  const [parentInviteToken, setParentInviteToken] = useState("");
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [joiningHousehold, setJoiningHousehold] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not create household.",
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not join household.",
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign out.",
      );
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
