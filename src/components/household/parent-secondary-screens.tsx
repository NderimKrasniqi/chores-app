import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

import { ParentHouseholdActivity } from "@/components/activity/parent-household-activity";
import {
  ParentChildAccessContent,
  type ParentChildAccessVisualFixture,
} from "@/components/child-access/parent-child-access-content";
import { PRESS, pressTransition } from "@/components/art/motion";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary, PayoutWeekday } from "./household-types";

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

const payoutWeekdays: PayoutWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Shared frame for pushed parent screens: round back button + title. */
export function ScreenFrame({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <View className="flex-row items-center gap-3 px-5 pb-2 pt-2">
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
        <AppText variant="sectionTitle" numberOfLines={1} className="flex-1">
          {title}
        </AppText>
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(". ")}
      disabled={!onPress}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Animated.View
          className="min-h-[64px] flex-row items-center gap-3 rounded-[20px] px-4 py-3"
          style={[
            {
              backgroundColor: tokens.surface,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.actionSoft }}
          >
            <Icon name={icon} color={tokens.action} size={20} />
          </View>
          <View className="flex-1">
            <AppText variant="cardTitle">{title}</AppText>
            {subtitle ? (
              <AppText variant="caption" color="ink-muted">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {trailing ??
            (onPress ? (
              <Icon name="chevron" color={tokens.inkMuted} size={18} />
            ) : null)}
        </Animated.View>
      )}
    </Pressable>
  );
}

/** A little house, tinted per household so they're easy to tell apart. */
function HouseMark({ color, size = 52 }: { color: string; size?: number }) {
  const { tokens } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 52 52">
      <Rect width={52} height={52} rx={16} fill={`${color}26`} />
      <Path d="M12 26 L26 13 L40 26 Z" fill={color} />
      <Rect x={16} y={25} width={20} height={15} rx={3} fill={tokens.surface} />
      <Rect x={23} y={31} width={6} height={9} rx={1.5} fill={color} />
    </Svg>
  );
}

export function ParentChildAccessScreen({
  householdId,
  timezone,
  child,
  onBack,
  visualFixture,
}: {
  householdId: Id<"households">;
  timezone: string;
  child: HouseholdSummary["children"][number];
  onBack: () => void;
  visualFixture?: ParentChildAccessVisualFixture;
}) {
  return (
    <ScreenFrame title={`${child.displayName}’s phones`} onBack={onBack}>
      <ParentChildAccessContent
        householdId={householdId}
        childId={child.childId}
        childDisplayName={child.displayName}
        timezone={timezone}
        visualFixture={visualFixture}
      />
    </ScreenFrame>
  );
}

export function ParentActivityScreen({
  household,
  onBack,
  onAddChore,
}: {
  household: HouseholdSummary;
  onBack: () => void;
  onAddChore: () => void;
}) {
  return (
    <ScreenFrame title="Family wins" onBack={onBack}>
      <ParentHouseholdActivity
        householdId={household.householdId}
        showHistory
        onAddChore={onAddChore}
      />
    </ScreenFrame>
  );
}

export function ParentAccountScreen({
  parentName,
  parentEmail,
  household,
  canSwitchHousehold,
  onBack,
  onSwitchHousehold,
  onOpenHelp,
  onSignOut,
  signingOut,
}: {
  parentName: string;
  parentEmail: string;
  household: HouseholdSummary;
  canSwitchHousehold: boolean;
  onBack: () => void;
  onSwitchHousehold: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <ScreenFrame title="You" onBack={onBack}>
      <View
        className="mt-2 overflow-hidden rounded-[26px]"
        style={{ backgroundColor: tokens.ink }}
      >
        <View className="flex-row items-center gap-4 p-5">
          <Avatar
            tone="parent"
            className="rounded-full"
            fallbackLabel={parentName}
            size={64}
          />
          <View className="flex-1">
            <AppText variant="label" style={{ color: tokens.reward }}>
              Parent
            </AppText>
            <AppText
              variant="sectionTitle"
              numberOfLines={1}
              style={{ color: tokens.surface }}
            >
              {parentName}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={{ color: tokens.inkFaint }}
            >
              {parentEmail}
            </AppText>
          </View>
        </View>
        <View
          className="flex-row items-center gap-3 px-5 py-3"
          style={{ backgroundColor: `${tokens.surface}14` }}
        >
          <Icon name="home" color={tokens.reward} size={16} />
          <AppText
            variant="label"
            className="flex-1"
            style={{ color: tokens.surface }}
          >
            {household.name}
          </AppText>
        </View>
      </View>

      <View className="mt-6 gap-2.5">
        {canSwitchHousehold ? (
          <ActionRow
            icon="housePair"
            title="Switch household"
            subtitle="You’re in more than one family"
            onPress={onSwitchHousehold}
          />
        ) : null}
        <ActionRow
          icon="bell"
          title="Notifications"
          subtitle="Phone settings for this app"
          onPress={() => void Linking.openSettings()}
        />
        <ActionRow
          icon="help"
          title="How it works"
          subtitle="Replay the guide"
          onPress={onOpenHelp}
        />
      </View>

      <ActionButton
        className="mt-8"
        tone="destructiveSecondary"
        label="Sign out"
        loading={signingOut}
        onPress={onSignOut}
      />
    </ScreenFrame>
  );
}

export function HouseholdSwitcherScreen({
  households,
  currentHouseholdId,
  onBack,
  onSelect,
}: {
  households: HouseholdSummary[];
  currentHouseholdId: HouseholdSummary["householdId"];
  onBack: () => void;
  onSelect: (householdId: HouseholdSummary["householdId"]) => void;
}) {
  const { tokens } = useTheme();
  const colors = [tokens.action, tokens.urgency, tokens.info, tokens.reward];
  return (
    <ScreenFrame title="Your households" onBack={onBack}>
      <View className="mt-2 gap-2.5">
        {households.map((household, index) => {
          const current = household.householdId === currentHouseholdId;
          return (
            <Pressable
              key={household.householdId}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              accessibilityLabel={`${household.name}, ${household.children.length} kids${current ? ", current" : ""}`}
              onPress={() => onSelect(household.householdId)}
            >
              {({ pressed }) => (
                <Animated.View
                  className="flex-row items-center gap-4 rounded-[22px] p-4"
                  style={[
                    {
                      backgroundColor: tokens.surface,
                      borderWidth: 2,
                      borderColor: current ? tokens.action : "transparent",
                      transform: [{ scale: pressed ? PRESS.scale : 1 }],
                    },
                    pressTransition,
                  ]}
                >
                  <HouseMark color={colors[index % colors.length]} />
                  <View className="flex-1">
                    <AppText variant="cardTitle">{household.name}</AppText>
                    <AppText variant="caption" color="ink-muted">
                      {household.children
                        .map((child) => child.displayName)
                        .join(", ") || "No kids yet"}
                    </AppText>
                  </View>
                  {current ? (
                    <Icon name="check" color={tokens.action} size={20} />
                  ) : null}
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>
    </ScreenFrame>
  );
}

const TIMEZONE_SUGGESTIONS = [
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Helsinki",
  "Europe/London",
];

/**
 * House rules edited in place: payday as day chips, weekly unclaims as a
 * stepper, time zone as suggestions plus a free field. Each change saves on
 * its own.
 */
export function HouseholdSettingsScreen({
  household,
  onBack,
}: {
  household: HouseholdSummary;
  onBack: () => void;
}) {
  const { tokens } = useTheme();
  const setTimezoneSetting = useServerConfirmedMutation(
    api.households.setTimezone,
  );
  const setPayoutWeekdaySetting = useServerConfirmedMutation(
    api.households.setPayoutWeekday,
  );
  const setWeeklyUnclaimAllowance = useServerConfirmedMutation(
    api.households.setWeeklyUnclaimAllowance,
  );
  const [timezone, setTimezone] = useState(household.timezone);
  const [saving, setSaving] = useState<
    "timezone" | "payout" | "unclaims" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    key: "timezone" | "payout" | "unclaims",
    action: () => Promise<unknown>,
  ) {
    setSaving(key);
    setError(null);
    try {
      await action();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update household settings.",
      );
    } finally {
      setSaving(null);
    }
  }

  function saveTimezone(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      setError("Timezone is required.");
      return;
    }
    setTimezone(normalized);
    void run("timezone", () =>
      setTimezoneSetting({
        householdId: household.householdId,
        timezone: normalized,
      }),
    );
  }

  function saveUnclaims(next: number) {
    if (!Number.isSafeInteger(next) || next < 0) return;
    void run("unclaims", () =>
      setWeeklyUnclaimAllowance({
        householdId: household.householdId,
        weeklyUnclaimAllowance: next,
      }),
    );
  }

  const allowance = household.weeklyUnclaimAllowance;

  return (
    <ScreenFrame title="House rules" onBack={onBack}>
      {error ? (
        <View
          className="mb-3 rounded-[18px] px-4 py-3"
          style={{ backgroundColor: tokens.urgencySoft }}
        >
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </View>
      ) : null}

      <RuleCard
        icon="calendar"
        title="Payday"
        body="The day each week closes and payouts are ready. A change starts from next week."
        saving={saving === "payout"}
      >
        <View className="flex-row flex-wrap gap-2">
          {payoutWeekdays.map((day) => {
            const active = day === household.payoutWeekday;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={formatWeekday(day)}
                accessibilityState={{ selected: active }}
                disabled={saving !== null}
                onPress={() =>
                  void run("payout", () =>
                    setPayoutWeekdaySetting({
                      householdId: household.householdId,
                      payoutWeekday: day,
                    }),
                  )
                }
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: active ? tokens.ink : tokens.surfaceMuted,
                }}
              >
                <AppText
                  variant="label"
                  style={{ color: active ? tokens.surface : tokens.ink }}
                >
                  {formatWeekday(day).slice(0, 2)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </RuleCard>

      <RuleCard
        icon="key"
        title="Unclaim keys"
        body="How many Extras each kid may drop per week. Changes apply right away."
        saving={saving === "unclaims"}
      >
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One fewer"
            disabled={saving !== null || allowance === 0}
            onPress={() => saveUnclaims(allowance - 1)}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: tokens.surfaceMuted,
              opacity: allowance === 0 ? 0.4 : 1,
            }}
          >
            <Icon name="minus" color={tokens.ink} size={18} />
          </Pressable>
          <View className="flex-1 flex-row items-center justify-center gap-1.5">
            {Array.from({ length: Math.min(allowance, 6) }, (_, i) => (
              <Icon key={i} name="key" color={tokens.reward} size={20} />
            ))}
            <AppText variant="cardTitle" className="ml-1">
              {allowance}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One more"
            disabled={saving !== null}
            onPress={() => saveUnclaims(allowance + 1)}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: tokens.surfaceMuted }}
          >
            <Icon name="plus" color={tokens.ink} size={18} />
          </Pressable>
        </View>
      </RuleCard>

      <RuleCard
        icon="globe"
        title="Time zone"
        body="Deadlines and paydays follow this clock."
        saving={saving === "timezone"}
      >
        <View className="flex-row flex-wrap gap-2">
          {TIMEZONE_SUGGESTIONS.map((zone) => {
            const active = zone === timezone.trim();
            return (
              <Pressable
                key={zone}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                disabled={saving !== null}
                onPress={() => setTimezone(zone)}
                className="min-h-[40px] items-center justify-center rounded-full px-3"
                style={{
                  backgroundColor: active ? tokens.ink : tokens.surfaceMuted,
                }}
              >
                <AppText
                  variant="caption"
                  style={{ color: active ? tokens.surface : tokens.ink }}
                >
                  {zone.split("/")[1].replace("_", " ")}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-3 flex-row gap-2">
          <TextInput
            accessibilityLabel="Time zone"
            value={timezone}
            onChangeText={setTimezone}
            autoCapitalize="none"
            autoCorrect={false}
            className="min-h-[44px] flex-1 rounded-[14px] px-3 font-body-heavy text-ink"
            style={{ backgroundColor: tokens.surfaceMuted }}
          />
          <ActionButton
            label="Save"
            disabled={saving !== null || timezone.trim() === household.timezone}
            onPress={() => saveTimezone(timezone)}
          />
        </View>
      </RuleCard>
    </ScreenFrame>
  );
}

function RuleCard({
  icon,
  title,
  body,
  saving,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  saving: boolean;
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  return (
    <View
      className="mb-3 rounded-[24px] p-4"
      style={{ backgroundColor: tokens.surface }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: tokens.actionSoft }}
        >
          <Icon name={icon} color={tokens.action} size={20} />
        </View>
        <View className="flex-1">
          <AppText variant="cardTitle">{title}</AppText>
          <AppText variant="caption" color="ink-muted">
            {saving ? "Saving…" : body}
          </AppText>
        </View>
      </View>
      <View className="mt-4">{children}</View>
    </View>
  );
}
