import { useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

import { ParentHouseholdActivity } from "@/components/activity/parent-household-activity";
import {
  ParentChildAccessContent,
  type ParentChildAccessVisualFixture,
} from "@/components/child-access/parent-child-access-content";
import { PRESS, pressTransition } from "@/components/art/motion";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText, ScrimSheet } from "@/design-system";
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
  // Insets from the provider are known on the first frame; a SafeAreaView
  // measures a frame late and the header visibly jumps down.
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-canvas"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
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
    </View>
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

const DELETE_BLOCKED_COPY = {
  other_parents: "Another parent is in this household, so it stays.",
  has_history:
    "Chores have already been done here, so this family’s history stays.",
  linked_phones: "Unlink the kids’ phones first, then try again.",
} as const;

/**
 * Undo a household made by mistake — say, before joining a partner's. Only
 * for a sole Parent, and the server refuses once anything has happened.
 */
function DeleteHousehold({ household }: { household: HouseholdSummary }) {
  const deleteHousehold = useServerConfirmedMutation(
    api.households.deleteEmptyHousehold,
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  async function confirm() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await deleteHousehold({
        householdId: household.householdId,
      });
      if (result.status === "blocked") {
        setBlocked(true);
        setMessage(DELETE_BLOCKED_COPY[result.reason]);
      }
      // On success the household list empties and the app shows setup.
    } catch (error) {
      setMessage(userErrorMessage(error, "Couldn’t delete the household."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMessage(null);
          setBlocked(false);
          setOpen(true);
        }}
        className="mt-6 min-h-[44px] items-center justify-center"
      >
        <AppText variant="bodySmall" color="ink-muted">
          Made this household by mistake?{" "}
          <AppText
            variant="bodySmall"
            color="urgency"
            className="font-body-heavy"
          >
            Delete it
          </AppText>
        </AppText>
      </Pressable>
      <ScrimSheet
        visible={open}
        onClose={() => setOpen(false)}
        dismissible={!busy}
        className="rounded-t-sheet bg-canvas px-5 pt-3"
        grabberClassName="bg-line"
      >
        <AppText variant="sectionTitle" className="mt-2">
          Delete {household.name}?
        </AppText>
        <AppText color="ink-muted" className="mt-2">
          Its kids, chores and settings are removed for good. Do this if you
          want to join another parent’s household instead. It only works while
          nothing has happened here yet.
        </AppText>
        {message ? (
          <AppText variant="bodySmall" color="urgency" className="mt-3">
            {message}
          </AppText>
        ) : null}
        <ActionButton
          className="mt-5"
          tone="destructive"
          label="Delete household"
          loading={busy}
          disabled={blocked}
          onPress={() => void confirm()}
        />
        <ActionButton
          className="mt-1"
          tone="quiet"
          label="Keep it"
          disabled={busy}
          onPress={() => setOpen(false)}
        />
      </ScrimSheet>
    </>
  );
}

export function ParentAccountScreen({
  parentName,
  parentEmail,
  household,
  onBack,
  onOpenHelp,
  onSignOut,
  signingOut,
}: {
  parentName: string;
  parentEmail: string;
  household: HouseholdSummary;
  onBack: () => void;
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

      {household.parents.length === 1 ? (
        <DeleteHousehold household={household} />
      ) : null}
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
        userErrorMessage(updateError, "Could not update household settings."),
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
          <View className="flex-row items-center justify-between gap-2">
            <AppText variant="cardTitle">{title}</AppText>
            {saving ? (
              <AppText variant="caption" color="ink-muted">
                Saving…
              </AppText>
            ) : null}
          </View>
          <AppText variant="caption" color="ink-muted">
            {body}
          </AppText>
        </View>
      </View>
      <View className="mt-4">{children}</View>
    </View>
  );
}
