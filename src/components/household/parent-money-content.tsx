import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText, Surface, TopBar } from "@/design-system";
import {
  ServerConfirmationRequiredError,
  useServerConfirmedMutation,
  useServerConnectionStatus,
} from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useEntrance } from "@/components/art";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  formatLocalDate,
  formatLocalDateRange,
  formatTimestampDateTime,
} from "@/lib/dates";

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
type Weekday = (typeof weekdays)[number];

type Payout = {
  payoutId: Id<"payouts">;
  periodEndLocalDate: string;
  balanceAtCloseSek: number;
  amountDueSek: number;
  pendingOutcomeCount: number;
  status: "pending" | "paid" | "no_payment";
  paidAt: number | null;
};

type SelectedPayout = Payout & {
  childId: Id<"children">;
  childDisplayName: string;
  runningBalanceSek: number;
};

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function formatDateRange(start: string, end: string) {
  return formatLocalDateRange(start, end);
}

function formatShortDate(value: string) {
  return formatLocalDate(value);
}

function formatMoment(timestamp: number, timezone: string) {
  return formatTimestampDateTime(timestamp, timezone);
}

function formatPaidMoment(timestamp: number, timezone: string) {
  const paidDate = formatMoment(timestamp, timezone).split(" at ")[0];
  const todayDate = formatMoment(Date.now(), timezone).split(" at ")[0];
  const time = formatMoment(timestamp, timezone).split(" at ")[1] ?? "";
  return paidDate === todayDate
    ? `Paid today at ${time}`
    : `Paid ${formatMoment(timestamp, timezone)}`;
}

function ChildAvatar({
  name,
  className = "h-14 w-14",
}: {
  name: string;
  className?: string;
}) {
  return (
    <Avatar
      tone={childAvatarTone(name)}
      className={className}
      fallbackLabel={name}
    />
  );
}

export function RecoveryPayoutDetail({
  selected,
  insetTop,
  onBack,
}: {
  selected: SelectedPayout;
  insetTop: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView
      edges={["bottom"]}
      className="flex-1 bg-canvas"
      style={{ paddingTop: insetTop }}
    >
      <View className="px-5">
        <TopBar
          title="Payout detail"
          onBack={onBack}
          titleStyle={{ fontSize: 22, lineHeight: 27 }}
        />
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-3">
        <Surface className="mt-2 flex-row items-center p-4">
          <ChildAvatar name={selected.childDisplayName} className="h-20 w-20" />
          <View className="ml-4 flex-1">
            <AppText variant="sectionTitle">
              {selected.childDisplayName}
            </AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-1">
              Period ended {formatShortDate(selected.periodEndLocalDate)}
            </AppText>
            <View className="mt-2 flex-row items-center self-start rounded-full bg-infoSoft px-3 py-1.5">
              <Icon name="refresh" color={themeColors.inkMuted} size={16} />
              <AppText variant="label"> Status unknown</AppText>
            </View>
            <AppText variant="display" color="urgency" className="mt-2">
              {selected.amountDueSek} kr
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          Pay manually
        </AppText>
        <View className="mt-4 flex-row">
          <View className="w-12 items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-infoSoft">
              <AppText variant="cardTitle">1</AppText>
            </View>
            <View className="mt-2 h-8 border-l-2 border-dashed border-infoSoftStrong" />
          </View>
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">
              Pay {selected.amountDueSek} kr manually with Swish.
            </AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-1">
              Payment happens outside this app.
            </AppText>
          </View>
        </View>
        <View className="mt-1 flex-row">
          <View className="w-12 items-center">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-infoSoft">
              <AppText variant="cardTitle">2</AppText>
            </View>
          </View>
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">Return here and mark it paid.</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-1">
              Only confirm after the payment is complete.
            </AppText>
          </View>
        </View>

        <Surface tone="lavender" elevated={false} className="mt-5 p-4">
          <AppText variant="cardTitle">Included in running balance</AppText>
          <View className="mt-3 flex-row items-center rounded-control bg-surfaceRaised px-3 py-4">
            <View className="flex-1">
              <AppText
                variant="caption"
                color="ink-muted"
                numberOfLines={1}
                className="text-[11px]"
              >
                Current balance
              </AppText>
              <AppText variant="cardTitle" className="mt-1">
                {selected.runningBalanceSek} kr
              </AppText>
            </View>
            <AppText variant="sectionTitle">−</AppText>
            <View className="flex-[0.8] items-center">
              <AppText
                variant="caption"
                color="ink-muted"
                numberOfLines={1}
                className="text-[11px]"
              >
                This payout
              </AppText>
              <AppText variant="cardTitle" color="urgency" className="mt-1">
                {selected.amountDueSek} kr
              </AppText>
            </View>
            <AppText variant="sectionTitle">=</AppText>
            <View className="flex-[1.3] items-end">
              <AppText
                variant="caption"
                color="ink-muted"
                numberOfLines={1}
                className="text-[11px]"
              >
                After marking paid
              </AppText>
              <AppText variant="cardTitle" className="mt-1">
                {selected.runningBalanceSek - selected.amountDueSek} kr
              </AppText>
            </View>
          </View>
          {selected.pendingOutcomeCount > 0 ? (
            <View className="bg-infoSoftStrong/40 mt-3 flex-row items-center rounded-control px-3 py-2">
              <Icon name="info" color={themeColors.inkMuted} size={21} />
              <AppText variant="caption" className="ml-2 flex-1">
                {selected.pendingOutcomeCount} unresolved chore outcome moves to
                a later payout.
              </AppText>
            </View>
          ) : null}
        </Surface>

        <Surface
          tone="coral"
          elevated={false}
          className="mt-2 flex-row items-center px-3 py-2"
        >
          <ActivityIndicator color={themeColors.urgency} size="large" />
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle" className="text-[16px]">
              Checking payment status
            </AppText>
            <AppText
              variant="bodySmall"
              className="mt-1 text-[12px] leading-[17px]"
            >
              Don’t mark it paid again yet. We’re confirming whether the{" "}
              {selected.amountDueSek} kr payout was recorded.
            </AppText>
          </View>
        </Surface>
      </ScrollView>
      <View className="px-5 pb-3 pt-2">
        <View className="min-h-control flex-row items-center justify-center rounded-control bg-infoSoftStrong">
          <ActivityIndicator color={themeColors.inkMuted} />
          <AppText variant="cardTitle" color="ink-muted" className="ml-3">
            Checking with server…
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function ParentMoneyContent({
  householdId,
}: {
  householdId: Id<"households">;
}) {
  const overview = useQuery(api.payouts.getOverview, { householdId });
  const ensureCurrent = useServerConfirmedMutation(api.payouts.ensureCurrent);
  const setPayoutWeekday = useServerConfirmedMutation(
    api.households.setPayoutWeekday,
  );
  const markPaid = useServerConfirmedMutation(api.payouts.markPaid);
  const [payingId, setPayingId] = useState<Id<"payouts"> | null>(null);
  // One payout write at a time: blocks double activation before re-render.
  const payingRef = useRef(false);
  const [justPaid, setJustPaid] = useState<Id<"payouts">[]>([]);
  const [changingDay, setChangingDay] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connection = useServerConnectionStatus();

  useEffect(() => {
    let active = true;
    void ensureCurrent({ householdId }).catch(() => {
      if (active) setError("Could not sync the current payout week.");
    });
    return () => {
      active = false;
    };
  }, [ensureCurrent, householdId]);

  async function changeWeekday(day: Weekday) {
    setWorking(true);
    setError(null);
    try {
      await setPayoutWeekday({ householdId, payoutWeekday: day });
      setChangingDay(false);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Could not change payout day.",
      );
    } finally {
      setWorking(false);
    }
  }

  /** Resolves true once the server confirms the payout is marked paid. */
  async function confirmPaid(payoutId: Id<"payouts">) {
    if (payingRef.current) return false;
    payingRef.current = true;
    setPayingId(payoutId);
    setError(null);
    try {
      await markPaid({ payoutId });
      setJustPaid((current) => [...current, payoutId]);
      return true;
    } catch (paymentError) {
      setError(
        paymentError instanceof ServerConfirmationRequiredError
          ? paymentError.message
          : paymentError instanceof Error
            ? paymentError.message
            : "Could not confirm whether the payout was marked paid. Check the current status before trying again.",
      );
      return false;
    } finally {
      payingRef.current = false;
      setPayingId(null);
    }
  }

  if (!overview) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator />
        <AppText color="ink-muted" className="mt-3">
          Loading balances…
        </AppText>
      </View>
    );
  }

  const pending = overview.children.flatMap((child) =>
    child.pendingPayouts.map((payout) => ({
      ...payout,
      childId: child.childId,
      childDisplayName: child.displayName,
    })),
  );
  const recent = overview.children
    .flatMap((child) =>
      child.latestPayout && child.latestPayout.status === "paid"
        ? [{ ...child.latestPayout, childDisplayName: child.displayName }]
        : [],
    )
    .sort((left, right) => (right.paidAt ?? 0) - (left.paidAt ?? 0));
  const maxBalance = Math.max(
    1,
    ...overview.children.map((child) => Math.abs(child.runningBalanceSek)),
  );
  const timezone = overview.currentPeriod.timezone;

  return (
    <View className="pb-8">
      <WeekStrip
        start={overview.currentPeriod.startLocalDate}
        end={overview.currentPeriod.endLocalDate}
        payday={overview.configuredPayoutWeekday}
        onChange={() => setChangingDay((value) => !value)}
      />
      {changingDay ? (
        <AppText variant="caption" color="ink-muted" className="mt-3">
          A new payday starts from next week.
        </AppText>
      ) : null}
      {changingDay ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {weekdays.map((day) => {
            const active = day === overview.configuredPayoutWeekday;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                disabled={working}
                onPress={() => void changeWeekday(day)}
                className="min-h-[44px] items-center justify-center rounded-full px-4"
                style={{
                  backgroundColor: active
                    ? themeColors.ink
                    : themeColors.surface,
                }}
              >
                <AppText
                  variant="label"
                  style={{
                    color: active ? themeColors.surface : themeColors.ink,
                  }}
                >
                  {formatWeekday(day).slice(0, 3)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <View className="mt-4 rounded-[18px] bg-urgencySoft px-4 py-3">
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </View>
      ) : null}
      {payingId && connection.status === "recovering" ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-3">
          Reconnecting — checking whether the payment was recorded…
        </AppText>
      ) : null}

      <AppText variant="sectionTitle" className="mt-6">
        To pay
      </AppText>
      {pending.length === 0 ? (
        <View className="mt-3 rounded-[22px] bg-surface p-4">
          <AppText variant="cardTitle">Nothing to pay right now</AppText>
          <AppText variant="caption" color="ink-muted" className="mt-1">
            Payouts appear here when a week closes on{" "}
            {formatWeekday(overview.configuredPayoutWeekday)}.
          </AppText>
        </View>
      ) : (
        <View className="mt-3 gap-3">
          {pending.map((payout) => (
            <View
              key={payout.payoutId}
              className="rounded-[24px] bg-surface p-4"
            >
              <View className="flex-row items-center gap-3">
                <ChildAvatar
                  name={payout.childDisplayName}
                  className="h-12 w-12"
                />
                <View className="flex-1">
                  <AppText variant="cardTitle">
                    {payout.childDisplayName}
                  </AppText>
                  <AppText variant="caption" color="ink-muted">
                    Week ending {formatShortDate(payout.periodEndLocalDate)}
                  </AppText>
                </View>
                <AppText variant="amount">{payout.amountDueSek} kr</AppText>
              </View>
              {payout.pendingOutcomeCount > 0 ? (
                <AppText variant="caption" color="ink-muted" className="mt-2">
                  {payout.pendingOutcomeCount} undecided chore
                  {payout.pendingOutcomeCount === 1 ? "" : "s"} will count in a
                  later week.
                </AppText>
              ) : null}
              <View className="mt-4">
                {justPaid.includes(payout.payoutId) ? (
                  <PaidStamp />
                ) : (
                  <SlideToPay
                    amount={payout.amountDueSek}
                    name={payout.childDisplayName}
                    busy={payingId === payout.payoutId}
                    disabled={payingId !== null && payingId !== payout.payoutId}
                    onConfirm={() => confirmPaid(payout.payoutId)}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      <AppText variant="sectionTitle" className="mt-6">
        Balances
      </AppText>
      <View className="mt-3 gap-2.5">
        {overview.children.map((child) => {
          const negative = child.runningBalanceSek < 0;
          const fraction = Math.abs(child.runningBalanceSek) / maxBalance;
          return (
            <View
              key={child.childId}
              accessible
              accessibilityLabel={`${child.displayName}: ${child.runningBalanceSek} kronor`}
              className="rounded-[22px] bg-surface p-4"
            >
              <View className="flex-row items-center gap-3">
                <ChildAvatar name={child.displayName} className="h-10 w-10" />
                <AppText variant="cardTitle" className="flex-1">
                  {child.displayName}
                </AppText>
                <AppText
                  variant="cardTitle"
                  color={negative ? "urgency" : "ink"}
                >
                  {child.runningBalanceSek} kr
                </AppText>
              </View>
              <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-surfaceMuted">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(4, fraction * 100)}%`,
                    backgroundColor: negative
                      ? themeColors.urgency
                      : themeColors.reward,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {recent.length > 0 ? (
        <>
          <AppText variant="sectionTitle" className="mt-6">
            Recently paid
          </AppText>
          <View className="mt-3 gap-2">
            {recent.map((payout) => (
              <View
                key={payout.payoutId}
                className="flex-row items-center gap-3 rounded-[18px] bg-surface px-4 py-3"
              >
                <Icon name="check" color={themeColors.action} size={18} />
                <AppText className="flex-1">
                  {payout.childDisplayName} · {payout.amountDueSek} kr
                </AppText>
                <AppText variant="caption" color="ink-muted">
                  {payout.paidAt
                    ? formatPaidMoment(payout.paidAt, timezone)
                    : "Paid"}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

/** The payout week as a row of days with payday circled. */
function WeekStrip({
  start,
  end,
  payday,
  onChange,
}: {
  start: string;
  end: string;
  payday: string;
  onChange: () => void;
}) {
  const [y, m, d] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const first = Date.UTC(y, m - 1, d);
  const count = Math.max(
    1,
    Math.round((Date.UTC(ey, em - 1, ed) - first) / 86_400_000) + 1,
  );
  const days = Array.from({ length: Math.min(count, 8) }, (_, i) => {
    const date = new Date(first + i * 86_400_000);
    return {
      key: i,
      weekday: date
        .toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" })
        .toLowerCase(),
      label: date.toLocaleDateString("en-GB", {
        weekday: "narrow",
        timeZone: "UTC",
      }),
      day: date.getUTCDate(),
    };
  });
  return (
    <View className="rounded-[26px] bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <AppText variant="label" color="ink-muted">
            This payout week
          </AppText>
          <AppText variant="cardTitle">{formatDateRange(start, end)}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Payday ${formatWeekday(payday)}. Change`}
          onPress={onChange}
          hitSlop={8}
          className="rounded-full bg-surfaceMuted px-3 py-1.5"
        >
          <AppText variant="label">
            Payday {formatWeekday(payday).slice(0, 3)}
          </AppText>
        </Pressable>
      </View>
      <View className="mt-4 flex-row justify-between">
        {days.map((day) => {
          const isPayday = day.weekday === payday;
          return (
            <View key={day.key} className="items-center">
              <AppText variant="caption" color="ink-muted">
                {day.label}
              </AppText>
              <View
                className="mt-1 h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isPayday
                    ? themeColors.reward
                    : "transparent",
                }}
              >
                <AppText variant="label">{day.day}</AppText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const KNOB = 52;

/**
 * Paying out is deliberate: drag the coin all the way across to record that
 * the money went out with Swish. Short drags spring back. Screen readers get
 * a plain activate action.
 */
function SlideToPay({
  amount,
  name,
  busy,
  disabled,
  onConfirm,
}: {
  amount: number;
  name: string;
  busy: boolean;
  disabled: boolean;
  onConfirm: () => Promise<boolean>;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const travel = Math.max(0, width - KNOB - 8);

  async function commit() {
    const ok = await onConfirm();
    if (ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      x.set(withSpring(0, { duration: 400, dampingRatio: 0.8 }));
    }
  }

  // Screen readers can't slide, so they confirm in a dialog instead.
  function confirmAccessibly() {
    if (busy || disabled) return;
    Alert.alert(
      `Mark ${amount} kr paid to ${name}?`,
      "Only do this after the Swish payment has gone through.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark paid", onPress: () => void commit() },
      ],
    );
  }

  // Paying must be a deliberate full slide: no flick shortcut, and vertical
  // scrolls that start on the knob never activate it.
  const pan = Gesture.Pan()
    .enabled(!busy && !disabled && travel > 0)
    .activeOffsetX([0, 12])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      x.set(Math.min(travel, Math.max(0, event.translationX)));
    })
    .onEnd((event) => {
      if (x.get() > travel * 0.9) {
        x.set(withSpring(travel, { duration: 250, dampingRatio: 1 }));
        scheduleOnRN(commit);
      } else {
        x.set(
          withSpring(0, {
            duration: 400,
            dampingRatio: 0.8,
            velocity: event.velocityX,
          }),
        );
      }
    });

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: travel > 0 ? (x.get() + KNOB) / (travel + KNOB) : 0 },
    ],
  }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: travel > 0 ? 1 - x.get() / travel : 1,
  }));

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Slide to mark ${amount} kronor paid to ${name} with Swish`}
      accessibilityState={{ busy, disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={confirmAccessibly}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="h-[60px] justify-center overflow-hidden rounded-full"
      style={{
        backgroundColor: themeColors.surfaceMuted,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: width || 1,
            backgroundColor: themeColors.actionSoft,
            transformOrigin: "left center",
          },
          fillStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, right: 0 }, hintStyle]}
        className="items-center"
      >
        <AppText variant="label" color="ink-muted">
          {busy ? "Recording…" : "Slide to pay with Swish  ›››"}
        </AppText>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ marginLeft: 4 }, knobStyle]}
          className="h-[52px] w-[52px] items-center justify-center rounded-full border-b-4 border-goldShade bg-gold"
        >
          {busy ? (
            <ActivityIndicator color={themeColors.ink} />
          ) : (
            <AppText variant="label" className="text-night">
              {amount}
            </AppText>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function PaidStamp() {
  const progress = useEntrance({ playful: true });
  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: 1.3 - progress.get() * 0.3 }, { rotate: "-4deg" }],
  }));
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityLabel="Paid"
      style={style}
      className="h-[60px] items-center justify-center rounded-full border-[3px] border-action"
    >
      <AppText variant="cardTitle" color="action">
        ✓ Paid with Swish
      </AppText>
    </Animated.View>
  );
}
