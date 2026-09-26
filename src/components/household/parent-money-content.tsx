import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import {
  childAvatarTone,
  DirectionCAvatar,
} from "@/components/ui/direction-c-avatar";
import { AppImage as Image } from "@/components/ui/app-image";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import {
  ServerConfirmationRequiredError,
  useServerConfirmedMutation,
  useServerConnectionStatus,
} from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  formatLocalDate,
  formatLocalDateRange,
  formatTimestampDateTime,
} from "@/lib/direction-c/dates";

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

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const moneyArtwork = require("../../../assets/images/direction-c/money-wallet-calendar.png");

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
  const normalized = name.trim().toLowerCase();
  const source =
    normalized === "alex"
      ? alexAvatar
      : normalized === "maya"
        ? mayaAvatar
        : null;

  if (source)
    return (
      <DirectionCAvatar
        source={source}
        tone={childAvatarTone(name)}
        className={className}
      />
    );

  return (
    <View
      className={`${className} items-center justify-center rounded-full bg-rewardSoft`}
    >
      <AppText variant="cardTitle">{name.charAt(0).toUpperCase()}</AppText>
    </View>
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
              <DirectionCIcon
                name="refresh"
                color={DirectionC.color.inkMuted}
                size={16}
              />
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
            <View className="mt-3 flex-row items-center rounded-control bg-infoSoftStrong/40 px-3 py-2">
              <DirectionCIcon
                name="info"
                color={DirectionC.color.inkMuted}
                size={21}
              />
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
          <ActivityIndicator color={DirectionC.color.coral} size="large" />
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
          <ActivityIndicator color={DirectionC.color.inkMuted} />
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
  const insets = useSafeAreaInsets();
  const overview = useQuery(api.payouts.getOverview, { householdId });
  const ensureCurrent = useServerConfirmedMutation(api.payouts.ensureCurrent);
  const setPayoutWeekday = useServerConfirmedMutation(
    api.households.setPayoutWeekday,
  );
  const markPaid = useServerConfirmedMutation(api.payouts.markPaid);
  const [selected, setSelected] = useState<SelectedPayout | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showWeekdayPicker, setShowWeekdayPicker] = useState(false);
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
      setShowWeekdayPicker(false);
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

  async function confirmPaid() {
    if (!selected) return;
    setWorking(true);
    setError(null);
    try {
      const result = await markPaid({ payoutId: selected.payoutId });
      setShowConfirmation(false);
      setSelected({
        ...selected,
        status: "paid",
        paidAt: result.paidAt,
        runningBalanceSek: selected.runningBalanceSek - selected.amountDueSek,
      });
    } catch (paymentError) {
      setError(
        paymentError instanceof ServerConfirmationRequiredError
          ? paymentError.message
          : paymentError instanceof Error
            ? paymentError.message
            : "Could not confirm whether the payout was marked paid. Check the current status before trying again.",
      );
      setShowConfirmation(false);
    } finally {
      setWorking(false);
    }
  }

  if (!overview) {
    return (
      <Surface className="p-5">
        <AppText variant="cardTitle">Loading payout information…</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Your household balances will appear here.
        </AppText>
      </Surface>
    );
  }

  const pending = overview.children.flatMap((child) =>
    child.pendingPayouts.map((payout) => ({
      ...payout,
      childId: child.childId,
      childDisplayName: child.displayName,
      runningBalanceSek: child.runningBalanceSek,
    })),
  );
  const nextPayout = pending[0];
  const latestPayouts = overview.children
    .flatMap((child) =>
      child.latestPayout
        ? [
            {
              ...child.latestPayout,
              childId: child.childId,
              childDisplayName: child.displayName,
              runningBalanceSek: child.runningBalanceSek,
            },
          ]
        : [],
    )
    .sort((left, right) => (right.paidAt ?? 0) - (left.paidAt ?? 0));
  const displayPayout = nextPayout ?? latestPayouts[0];
  const recoveringPayment = Boolean(
    selected && working && connection.status === "recovering",
  );

  return (
    <View>
      <Surface
        tone="mint"
        elevated={false}
        className="overflow-hidden px-3 pb-2 pt-2"
      >
        <View className="flex-row items-center">
          <View
            className="h-[88px] w-[160px] items-center justify-center"
            style={{ flexShrink: 0 }}
          >
            <Image
              source={moneyArtwork}
              style={{ width: 194, height: 134 }}
              contentFit="contain"
              accessible={false}
            />
          </View>
          <View className="ml-2 flex-1">
            <AppText variant="label" color="action" numberOfLines={1}>
              Current payout week
            </AppText>
            <AppText
              className="mt-0.5 text-[34px] font-black leading-[38px]"
              style={{ fontWeight: "900" }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {formatDateRange(
                overview.currentPeriod.startLocalDate,
                overview.currentPeriod.endLocalDate,
              )}
            </AppText>
            <View className="mt-1 flex-row items-center">
              <DirectionCIcon
                name="calendar"
                color={DirectionC.color.ink}
                size={22}
              />
              <AppText variant="bodySmall" className="ml-2">
                Closes {formatWeekday(overview.currentPeriod.payoutWeekday)}
              </AppText>
            </View>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              This week settles after it closes.
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowWeekdayPicker(true)}
          className="mt-1 min-h-target flex-row items-center justify-end border-t border-actionSoftStrong pt-1"
        >
          <AppText variant="bodySmall" color="action" className="font-black">
            Payout day: {formatWeekday(overview.configuredPayoutWeekday)}
          </AppText>
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={20}
          />
        </Pressable>
      </Surface>

      <AppText
        variant="sectionTitle"
        className="mt-2"
        style={{ fontSize: 22, lineHeight: 26 }}
      >
        {nextPayout ? "Last week’s payout" : "Latest payout"}
      </AppText>
      {displayPayout ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelected(displayPayout)}
        >
          <Surface className="mt-2 px-3 pb-2 pt-3">
            <View className="flex-row items-start">
              <ChildAvatar
                name={displayPayout.childDisplayName}
                className="h-16 w-16"
              />
              <View className="ml-3 flex-1">
                <View className="flex-row items-start">
                  <View className="flex-1">
                    <AppText className="text-[18px] font-extrabold leading-[21px]">
                      {displayPayout.childDisplayName}
                    </AppText>
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      className="mt-0.5"
                    >
                      Period ended{" "}
                      {formatShortDate(displayPayout.periodEndLocalDate)}
                    </AppText>
                  </View>
                  <DirectionCIcon
                    name="chevron"
                    color={DirectionC.color.ink}
                    size={22}
                  />
                </View>
                <AppText
                  color={
                    displayPayout.status === "paid"
                      ? "action"
                      : displayPayout.status === "no_payment"
                        ? "ink-muted"
                        : "urgency"
                  }
                  className="mt-1 text-[28px] font-black leading-[32px]"
                  style={{ fontWeight: "900" }}
                >
                  {displayPayout.amountDueSek} kr
                </AppText>
                <View
                  className={`mt-1 flex-row items-center self-start rounded-full px-2.5 py-1 ${displayPayout.status === "no_payment" ? "bg-infoSoft" : "bg-actionSoft"}`}
                >
                  {displayPayout.status !== "no_payment" ? (
                    <DirectionCIcon
                      name="check"
                      color={DirectionC.color.green}
                      size={13}
                    />
                  ) : null}
                  <AppText
                    variant="label"
                    color={
                      displayPayout.status === "no_payment"
                        ? "ink-muted"
                        : "action"
                    }
                  >
                    {displayPayout.status !== "no_payment" ? " " : ""}
                    {displayPayout.status === "paid"
                      ? "Paid"
                      : displayPayout.status === "no_payment"
                        ? "No payment"
                        : "Ready to pay"}
                  </AppText>
                </View>
                {displayPayout.status === "pending" ? (
                  <>
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      className="mt-1"
                    >
                      {displayPayout.amountDueSek} kr of{" "}
                      {displayPayout.childDisplayName}’s{" "}
                      {displayPayout.runningBalanceSek} kr total unpaid balance.
                    </AppText>
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      className="mt-0.5"
                    >
                      Pay manually with Swish, then mark paid.
                    </AppText>
                  </>
                ) : (
                  <AppText variant="caption" color="ink-muted" className="mt-1">
                    {displayPayout.status === "paid"
                      ? "Payment recorded and complete."
                      : "Nothing was due for this payout period."}
                  </AppText>
                )}
              </View>
            </View>
            {displayPayout.pendingOutcomeCount > 0 ? (
              <View className="mt-2 min-h-target flex-row items-center rounded-full bg-infoSoft px-2.5 py-1">
                <DirectionCIcon
                  name="info"
                  color={DirectionC.color.inkMuted}
                  size={14}
                />
                <AppText
                  className="ml-1 flex-1"
                  style={{ fontSize: 11, lineHeight: 14, fontWeight: "600" }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {displayPayout.pendingOutcomeCount} unresolved{" "}
                  {displayPayout.pendingOutcomeCount === 1
                    ? "chore moves"
                    : "chores move"}{" "}
                  to a later payout.
                </AppText>
              </View>
            ) : null}
          </Surface>
        </Pressable>
      ) : (
        <Surface tone="lavender" elevated={false} className="mt-2 p-5">
          <AppText variant="cardTitle">No payout ready</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            A positive closed balance will appear here.
          </AppText>
        </Surface>
      )}

      <AppText
        variant="sectionTitle"
        className="mt-3"
        style={{ fontSize: 22, lineHeight: 26 }}
      >
        Running balances
      </AppText>
      <View className="mt-2 gap-2">
        {overview.children.map((child) => {
          const readyAmount = child.pendingPayouts.reduce(
            (sum, payout) => sum + payout.amountDueSek,
            0,
          );
          const remaining = child.runningBalanceSek - readyAmount;
          return (
            <Surface
              key={child.childId}
              className="min-h-[64px] flex-row items-center px-3 py-1"
            >
              <ChildAvatar name={child.displayName} className="h-12 w-12" />
              <View className="ml-3 flex-1">
                <AppText className="text-[18px] font-extrabold leading-[21px]">
                  {child.displayName}
                </AppText>
                {readyAmount > 0 ? (
                  <AppText
                    variant="caption"
                    color="ink-muted"
                    className="mt-0.5"
                  >
                    {readyAmount} kr ready to pay · {remaining} kr remains
                  </AppText>
                ) : child.latestPayout?.status === "paid" ? (
                  <View className="mt-0.5 flex-row items-center">
                    <DirectionCIcon
                      name="check"
                      color={DirectionC.color.green}
                      size={14}
                    />
                    <AppText variant="caption" color="action" className="ml-1">
                      Latest payout paid · {child.latestPayout.amountDueSek} kr
                    </AppText>
                  </View>
                ) : child.runningBalanceSek < 0 ? (
                  <AppText
                    variant="caption"
                    color="ink-muted"
                    className="mt-0.5"
                  >
                    Negative balance carries forward
                  </AppText>
                ) : (
                  <AppText
                    variant="caption"
                    color="ink-muted"
                    className="mt-0.5"
                  >
                    Nothing ready to pay yet
                  </AppText>
                )}
              </View>
              <AppText
                className="text-[22px] font-black leading-[26px]"
                style={{ fontWeight: "900" }}
              >
                {child.runningBalanceSek} kr
              </AppText>
            </Surface>
          );
        })}
      </View>

      {nextPayout ? (
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-2 flex-row items-center px-3 py-2"
        >
          <DirectionCIcon
            name="info"
            color={DirectionC.color.inkMuted}
            size={22}
          />
          <AppText variant="caption" className="ml-2 flex-1">
            After you mark {nextPayout.amountDueSek} kr paid,{" "}
            {nextPayout.childDisplayName}’s balance becomes{" "}
            {nextPayout.runningBalanceSek - nextPayout.amountDueSek} kr.
          </AppText>
        </Surface>
      ) : null}

      {error ? (
        <Surface tone="coral" elevated={false} className="mt-4 p-3">
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </Surface>
      ) : null}

      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          recoveringPayment ? (
            <RecoveryPayoutDetail
              selected={selected}
              insetTop={Math.max(0, insets.top - 12)}
              onBack={() => setSelected(null)}
            />
          ) : (
            <SafeAreaView
              edges={["bottom"]}
              className="flex-1 bg-canvas"
              style={{ paddingTop: Math.max(0, insets.top - 12) }}
            >
              <View className="px-5">
                <TopBar
                  title="Payout detail"
                  onBack={() => setSelected(null)}
                  titleStyle={{ fontSize: 22, lineHeight: 27 }}
                />
              </View>
              <ScrollView
                className="flex-1"
                contentContainerClassName="px-5 pb-8"
              >
                <Surface className="mt-2 flex-row items-center p-4">
                  <ChildAvatar
                    name={selected.childDisplayName}
                    className="h-28 w-28"
                  />
                  <View className="ml-4 flex-1">
                    <AppText variant="sectionTitle">
                      {selected.childDisplayName}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Period ended{" "}
                      {formatShortDate(selected.periodEndLocalDate)}
                    </AppText>
                    <View
                      className={`mt-2 flex-row items-center self-start rounded-full px-3 py-1.5 ${selected.status === "paid" ? "bg-actionSoft" : selected.status === "no_payment" ? "bg-infoSoft" : "bg-actionSoft"}`}
                    >
                      {selected.status !== "no_payment" ? (
                        <DirectionCIcon
                          name="check"
                          color={DirectionC.color.green}
                          size={16}
                        />
                      ) : null}
                      <AppText
                        variant="label"
                        color={
                          selected.status === "paid"
                            ? "action"
                            : selected.status === "pending"
                              ? "action"
                              : "ink-muted"
                        }
                      >
                        {selected.status !== "no_payment" ? " " : ""}
                        {selected.status === "paid"
                          ? "Paid"
                          : selected.status === "no_payment"
                            ? "No payment"
                            : "Ready to pay"}
                      </AppText>
                    </View>
                    <AppText
                      variant="display"
                      color={
                        selected.status === "paid"
                          ? "action"
                          : selected.status === "no_payment"
                            ? "ink-muted"
                            : "urgency"
                      }
                      className="mt-2"
                    >
                      {selected.amountDueSek} kr
                    </AppText>
                  </View>
                </Surface>

                {selected.status === "paid" ? (
                  <>
                    <Surface
                      tone="mint"
                      elevated={false}
                      className="mt-5 flex-row items-center p-4"
                    >
                      <View className="h-16 w-16 items-center justify-center">
                        <DirectionCIcon
                          name="money"
                          color={DirectionC.color.green}
                          size={42}
                        />
                        <View className="absolute bottom-1 right-0 h-7 w-7 items-center justify-center rounded-full bg-action">
                          <DirectionCIcon
                            name="check"
                            color={DirectionC.color.white}
                            size={17}
                          />
                        </View>
                      </View>
                      <View className="ml-4 flex-1">
                        <AppText variant="cardTitle">Payment recorded</AppText>
                        <AppText color="ink-muted" className="mt-1">
                          {selected.paidAt
                            ? formatPaidMoment(
                                selected.paidAt,
                                overview.currentPeriod.timezone,
                              )
                            : "Paid"}
                        </AppText>
                        <AppText
                          variant="bodySmall"
                          color="ink-muted"
                          className="mt-2"
                        >
                          This payout is complete and can’t be reopened.
                        </AppText>
                      </View>
                    </Surface>
                    <Surface
                      tone="lavender"
                      elevated={false}
                      className="mt-4 p-4"
                    >
                      <AppText variant="cardTitle">Balance updated</AppText>
                      <View className="mt-3 flex-row items-center rounded-control bg-surfaceRaised px-3 py-4">
                        <View className="flex-[1.05]">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            Before payment
                          </AppText>
                          <AppText variant="cardTitle" className="mt-1">
                            {selected.runningBalanceSek + selected.amountDueSek}{" "}
                            kr
                          </AppText>
                        </View>
                        <AppText variant="sectionTitle" className="mx-1">
                          −
                        </AppText>
                        <View className="flex-[0.8] items-center">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            Paid
                          </AppText>
                          <AppText
                            variant="cardTitle"
                            color="action"
                            className="mt-1"
                          >
                            {selected.amountDueSek} kr
                          </AppText>
                        </View>
                        <AppText variant="sectionTitle" className="mx-1">
                          =
                        </AppText>
                        <View className="flex-[1.1] items-end">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            Current balance
                          </AppText>
                          <AppText variant="cardTitle" className="mt-1">
                            {selected.runningBalanceSek} kr
                          </AppText>
                        </View>
                      </View>
                      {selected.pendingOutcomeCount > 0 ? (
                        <View className="mt-3 flex-row items-center rounded-control bg-infoSoftStrong/40 px-3 py-2">
                          <DirectionCIcon
                            name="info"
                            color={DirectionC.color.inkMuted}
                            size={21}
                          />
                          <AppText variant="caption" className="ml-2 flex-1">
                            {selected.pendingOutcomeCount} unresolved chore
                            outcome moves to a later payout.
                          </AppText>
                        </View>
                      ) : null}
                    </Surface>
                  </>
                ) : selected.status === "pending" ? (
                  <>
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
                        <AppText
                          variant="bodySmall"
                          color="ink-muted"
                          className="mt-1"
                        >
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
                        <AppText variant="cardTitle">
                          Return here and mark it paid.
                        </AppText>
                        <AppText
                          variant="bodySmall"
                          color="ink-muted"
                          className="mt-1"
                        >
                          Only confirm after the payment is complete.
                        </AppText>
                      </View>
                    </View>
                    <Surface
                      tone="lavender"
                      elevated={false}
                      className="mt-5 p-4"
                    >
                      <AppText variant="cardTitle">
                        Included in running balance
                      </AppText>
                      <View className="mt-3 flex-row items-center rounded-control bg-surfaceRaised px-3 py-4">
                        <View className="flex-[1.05]">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            Current balance
                          </AppText>
                          <AppText variant="cardTitle" className="mt-1">
                            {selected.runningBalanceSek} kr
                          </AppText>
                        </View>
                        <AppText variant="sectionTitle" className="mx-1">
                          −
                        </AppText>
                        <View className="flex-[0.8] items-center">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            This payout
                          </AppText>
                          <AppText
                            variant="cardTitle"
                            color="urgency"
                            className="mt-1"
                          >
                            {selected.amountDueSek} kr
                          </AppText>
                        </View>
                        <AppText variant="sectionTitle" className="mx-1">
                          =
                        </AppText>
                        <View className="flex-[1.1] items-end">
                          <AppText
                            variant="caption"
                            color="ink-muted"
                            numberOfLines={1}
                            className="text-[12px]"
                          >
                            After marking paid
                          </AppText>
                          <AppText variant="cardTitle" className="mt-1">
                            {selected.runningBalanceSek - selected.amountDueSek}{" "}
                            kr
                          </AppText>
                        </View>
                      </View>
                      {selected.pendingOutcomeCount > 0 ? (
                        <View className="mt-3 flex-row items-center rounded-control bg-infoSoftStrong/40 px-3 py-2">
                          <DirectionCIcon
                            name="info"
                            color={DirectionC.color.inkMuted}
                            size={21}
                          />
                          <AppText variant="caption" className="ml-2 flex-1">
                            {selected.pendingOutcomeCount} unresolved chore
                            outcome moves to a later payout.
                          </AppText>
                        </View>
                      ) : null}
                    </Surface>
                  </>
                ) : (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-6 p-5"
                  >
                    <AppText variant="sectionTitle">Nothing was due</AppText>
                    <AppText className="mt-2">
                      This payout period closed without a positive amount to
                      pay.
                    </AppText>
                  </Surface>
                )}
                {selected.pendingOutcomeCount > 0 &&
                selected.status === "no_payment" ? (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-3 p-4"
                  >
                    <AppText variant="bodySmall">
                      {selected.pendingOutcomeCount} unresolved chore outcome
                      will be handled in a later payout.
                    </AppText>
                  </Surface>
                ) : null}
              </ScrollView>
              {selected.status === "pending" ? (
                <View
                  className="border-t border-line bg-surfaceRaised px-5 pt-3"
                  style={{ paddingBottom: insets.bottom + 16 }}
                >
                  <ActionButton
                    label={`Mark ${selected.amountDueSek} kr paid`}
                    onPress={() => setShowConfirmation(true)}
                  />
                </View>
              ) : null}
              {showConfirmation ? (
                <View className="absolute inset-0 justify-end bg-scrim">
                  <SafeAreaView
                    edges={["bottom"]}
                    className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
                    style={{ paddingBottom: insets.bottom + 16 }}
                  >
                    <View className="h-1.5 w-20 self-center rounded-full bg-line" />
                    <View className="mt-4 h-20 w-20 items-center justify-center self-center rounded-full bg-actionSoft">
                      <DirectionCIcon
                        name="money"
                        color={DirectionC.color.green}
                        size={40}
                      />
                      <View className="absolute bottom-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-action">
                        <DirectionCIcon
                          name="check"
                          color={DirectionC.color.white}
                          size={17}
                        />
                      </View>
                    </View>
                    <AppText
                      variant="sectionTitle"
                      className="mt-4 text-center"
                    >
                      Mark {selected.amountDueSek} kr paid?
                    </AppText>
                    <AppText color="ink-muted" className="mt-3 text-center">
                      Confirm only after the payment is complete outside this
                      app.
                    </AppText>
                    <AppText
                      variant="cardTitle"
                      color="action"
                      className="mt-4 text-center"
                    >
                      {selected.childDisplayName}’s running balance will become{" "}
                      {selected.runningBalanceSek - selected.amountDueSek} kr.
                    </AppText>
                    <View className="mt-4 flex-row items-center justify-center">
                      <DirectionCIcon
                        name="info"
                        color={DirectionC.color.inkMuted}
                        size={22}
                      />
                      <AppText
                        variant="bodySmall"
                        color="ink-muted"
                        className="ml-2"
                      >
                        Paid payouts can’t be reopened.
                      </AppText>
                    </View>
                    <ActionButton
                      className="mt-5"
                      label="Mark paid"
                      loading={working}
                      onPress={() => void confirmPaid()}
                    />
                    <ActionButton
                      className="mt-3"
                      tone="secondary"
                      label="Not yet"
                      onPress={() => setShowConfirmation(false)}
                    />
                  </SafeAreaView>
                </View>
              ) : null}
            </SafeAreaView>
          )
        ) : null}
      </Modal>

      <Modal
        visible={showWeekdayPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeekdayPicker(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet bg-canvas px-5 pb-3 pt-5"
          >
            <AppText variant="sectionTitle">Choose payout day</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-2">
              The new day applies from the next payout period.
            </AppText>
            <View className="mt-4 flex-row flex-wrap">
              {weekdays.map((day) => {
                const active = overview.configuredPayoutWeekday === day;
                return (
                  <Pressable
                    key={day}
                    disabled={working}
                    onPress={() => void changeWeekday(day)}
                    className={`mb-2 mr-2 min-h-target min-w-[30%] items-center justify-center rounded-control ${active ? "bg-action" : "bg-infoSoft"}`}
                  >
                    <AppText variant="label" color={active ? "white" : "ink"}>
                      {formatWeekday(day)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <ActionButton
              tone="quiet"
              label="Cancel"
              onPress={() => setShowWeekdayPicker(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
