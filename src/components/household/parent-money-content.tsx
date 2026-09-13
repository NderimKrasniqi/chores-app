import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import {
  ServerConfirmationRequiredError,
  useServerConfirmedMutation,
  useServerConnectionStatus,
} from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return `${start}–${end}`;
  const month = new Intl.DateTimeFormat("en-SE", { month: "short" }).format(
    endDate,
  );
  return `${startDate.getDate()}–${endDate.getDate()} ${month}`;
}

function formatMoment(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function InitialAvatar({ name }: { name: string }) {
  return (
    <View className="h-14 w-14 items-center justify-center rounded-full bg-rewardSoft">
      <AppText variant="cardTitle">{name.charAt(0).toUpperCase()}</AppText>
    </View>
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
    return <AppText color="ink-muted">Loading payout information…</AppText>;
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
      <Surface tone="mint" elevated={false} className="overflow-hidden p-5">
        <View className="flex-row items-center">
          <View className="h-24 w-28 items-center justify-center rounded-large bg-rewardSoft">
            <DirectionCIcon
              name="money"
              color={DirectionC.color.green}
              size={45}
            />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="label" color="action">
              Current payout week
            </AppText>
            <AppText variant="screenTitle" className="mt-1">
              {formatDateRange(
                overview.currentPeriod.startLocalDate,
                overview.currentPeriod.endLocalDate,
              )}
            </AppText>
            <View className="mt-2 flex-row items-center">
              <DirectionCIcon
                name="calendar"
                color={DirectionC.color.ink}
                size={22}
              />
              <AppText className="ml-2">
                Closes {formatWeekday(overview.currentPeriod.payoutWeekday)}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="ink-muted" className="mt-1">
              This week settles after it closes.
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowWeekdayPicker(true)}
          className="mt-4 min-h-target flex-row items-center justify-end border-t border-actionSoftStrong pt-3"
        >
          <AppText variant="label" color="action">
            Payout day: {formatWeekday(overview.configuredPayoutWeekday)}
          </AppText>
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={20}
          />
        </Pressable>
      </Surface>

      <AppText variant="sectionTitle" className="mt-5">
        {nextPayout ? "Last week’s payout" : "Latest payout"}
      </AppText>
      {displayPayout ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelected(displayPayout)}
        >
          <Surface className="mt-2 p-4">
            <View className="flex-row items-start">
              <InitialAvatar name={displayPayout.childDisplayName} />
              <View className="ml-3 flex-1">
                <AppText variant="cardTitle">
                  {displayPayout.childDisplayName}
                </AppText>
                <AppText variant="bodySmall" color="ink-muted" className="mt-1">
                  Period ended {displayPayout.periodEndLocalDate}
                </AppText>
                <AppText
                  variant="screenTitle"
                  color={displayPayout.status === "paid" ? "action" : "urgency"}
                  className="mt-1"
                >
                  {displayPayout.amountDueSek} kr
                </AppText>
                <View className="mt-2 self-start rounded-full bg-actionSoft px-3 py-1.5">
                  <AppText variant="label" color="action">
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
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-2"
                    >
                      {displayPayout.amountDueSek} kr of{" "}
                      {displayPayout.childDisplayName}’s{" "}
                      {displayPayout.runningBalanceSek} kr total unpaid balance.
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Pay manually with Swish, then mark paid.
                    </AppText>
                  </>
                ) : (
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-2"
                  >
                    {displayPayout.status === "paid"
                      ? "Payment recorded and complete."
                      : "Nothing was due for this payout period."}
                  </AppText>
                )}
                {displayPayout.pendingOutcomeCount > 0 ? (
                  <View className="mt-2 rounded-full bg-infoSoft px-3 py-1.5">
                    <AppText variant="caption">
                      {displayPayout.pendingOutcomeCount} unresolved{" "}
                      {displayPayout.pendingOutcomeCount === 1
                        ? "chore moves"
                        : "chores move"}{" "}
                      to a later payout.
                    </AppText>
                  </View>
                ) : null}
              </View>
              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.ink}
                size={22}
              />
            </View>
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

      <AppText variant="sectionTitle" className="mt-5">
        Running balances
      </AppText>
      <View className="mt-2 gap-3">
        {overview.children.map((child) => {
          const readyAmount = child.pendingPayouts.reduce(
            (sum, payout) => sum + payout.amountDueSek,
            0,
          );
          const remaining = child.runningBalanceSek - readyAmount;
          return (
            <Surface
              key={child.childId}
              className="min-h-[78px] flex-row items-center p-3"
            >
              <InitialAvatar name={child.displayName} />
              <View className="ml-3 flex-1">
                <AppText variant="cardTitle">{child.displayName}</AppText>
                {readyAmount > 0 ? (
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-1"
                  >
                    {readyAmount} kr ready to pay · {remaining} kr remains
                  </AppText>
                ) : child.latestPayout?.status === "paid" ? (
                  <AppText variant="bodySmall" color="action" className="mt-1">
                    Latest payout paid · {child.latestPayout.amountDueSek} kr
                  </AppText>
                ) : child.runningBalanceSek < 0 ? (
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-1"
                  >
                    Negative balance carries forward
                  </AppText>
                ) : (
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-1"
                  >
                    Nothing ready to pay yet
                  </AppText>
                )}
              </View>
              <AppText variant="amount">{child.runningBalanceSek} kr</AppText>
            </Surface>
          );
        })}
      </View>

      {nextPayout ? (
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-4 flex-row items-center p-3"
        >
          <DirectionCIcon
            name="info"
            color={DirectionC.color.inkMuted}
            size={22}
          />
          <AppText variant="bodySmall" className="ml-3 flex-1">
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
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <View className="px-5">
              <TopBar title="Payout details" onBack={() => setSelected(null)} />
            </View>
            <ScrollView contentContainerClassName="px-5 pb-8">
              <Surface className="mt-4 flex-row items-center p-6">
                <InitialAvatar name={selected.childDisplayName} />
                <View className="ml-5 flex-1">
                  <AppText variant="sectionTitle">
                    {selected.childDisplayName}
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-1"
                  >
                    Period ended {selected.periodEndLocalDate}
                  </AppText>
                  <View
                    className={`mt-3 self-start rounded-full px-4 py-2 ${selected.status === "paid" ? "bg-actionSoft" : selected.status === "no_payment" ? "bg-infoSoft" : "bg-urgencySoft"}`}
                  >
                    <AppText
                      variant="label"
                      color={
                        selected.status === "paid"
                          ? "action"
                          : selected.status === "pending"
                            ? "urgency"
                            : "ink-muted"
                      }
                    >
                      {selected.status === "paid"
                        ? "✓  Paid"
                        : selected.status === "no_payment"
                          ? "No payment"
                          : "Ready to pay"}
                    </AppText>
                  </View>
                  <AppText
                    variant="display"
                    color={selected.status === "paid" ? "action" : "urgency"}
                    className="mt-3"
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
                    className="mt-6 flex-row items-center p-5"
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-action">
                      <DirectionCIcon
                        name="check"
                        color={DirectionC.color.white}
                        size={29}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="sectionTitle">Payment recorded</AppText>
                      <AppText color="ink-muted" className="mt-1">
                        {selected.paidAt
                          ? `Paid ${formatMoment(selected.paidAt)}`
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
                    className="mt-4 p-5"
                  >
                    <AppText variant="sectionTitle">Balance updated</AppText>
                    <View className="mt-4 flex-row items-end rounded-control bg-surfaceRaised p-4">
                      <View className="flex-1">
                        <AppText variant="caption" color="ink-muted">
                          At period close
                        </AppText>
                        <AppText variant="cardTitle" className="mt-1">
                          {selected.balanceAtCloseSek} kr
                        </AppText>
                      </View>
                      <AppText variant="sectionTitle">−</AppText>
                      <View className="flex-1 items-center">
                        <AppText variant="caption" color="ink-muted">
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
                      <AppText variant="sectionTitle">=</AppText>
                      <View className="flex-1 items-end">
                        <AppText variant="caption" color="ink-muted">
                          Current balance
                        </AppText>
                        <AppText variant="cardTitle" className="mt-1">
                          {selected.runningBalanceSek} kr
                        </AppText>
                      </View>
                    </View>
                  </Surface>
                </>
              ) : selected.status === "pending" ? (
                <>
                  <AppText variant="sectionTitle" className="mt-6">
                    Before marking paid
                  </AppText>
                  <Surface tone="mint" elevated={false} className="mt-3 p-5">
                    <AppText variant="cardTitle">
                      Pay {selected.amountDueSek} kr manually with Swish
                    </AppText>
                    <AppText className="mt-2">
                      This app records settlement; it does not send the payment.
                    </AppText>
                  </Surface>
                  <Surface className="mt-3 p-4">
                    <View className="flex-row justify-between">
                      <AppText color="ink-muted">Total unpaid balance</AppText>
                      <AppText variant="label">
                        {selected.runningBalanceSek} kr
                      </AppText>
                    </View>
                    <View className="mt-3 flex-row justify-between">
                      <AppText color="ink-muted">This payout</AppText>
                      <AppText variant="label">
                        − {selected.amountDueSek} kr
                      </AppText>
                    </View>
                    <View className="my-3 h-px bg-line" />
                    <View className="flex-row justify-between">
                      <AppText>Balance after payment</AppText>
                      <AppText variant="cardTitle">
                        {selected.runningBalanceSek - selected.amountDueSek} kr
                      </AppText>
                    </View>
                  </Surface>
                </>
              ) : (
                <Surface tone="lavender" elevated={false} className="mt-6 p-5">
                  <AppText variant="sectionTitle">Nothing was due</AppText>
                  <AppText className="mt-2">
                    This payout period closed without a positive amount to pay.
                  </AppText>
                </Surface>
              )}
              {selected.pendingOutcomeCount > 0 ? (
                <Surface tone="lavender" elevated={false} className="mt-3 p-4">
                  <AppText variant="bodySmall">
                    {selected.pendingOutcomeCount} unresolved chore outcome will
                    be handled in a later payout.
                  </AppText>
                </Surface>
              ) : null}
            </ScrollView>
            {selected.status === "pending" ? (
              <View className="border-t border-line bg-surfaceRaised px-5 pt-3">
                <ActionButton
                  label={`Mark ${selected.amountDueSek} kr paid`}
                  onPress={() => setShowConfirmation(true)}
                />
              </View>
            ) : null}
          </SafeAreaView>
        ) : null}
      </Modal>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View className="flex-1 justify-end bg-scrim">
          <SafeAreaView
            edges={["bottom"]}
            className="rounded-t-sheet bg-canvas px-5 pb-2 pt-5"
          >
            <AppText variant="sectionTitle">Confirm payment</AppText>
            <AppText className="mt-2">
              Only confirm after you have paid {selected?.childDisplayName}{" "}
              {selected?.amountDueSek} kr outside the app.
            </AppText>
            <ActionButton
              className="mt-5"
              label="Yes, mark paid"
              loading={working}
              onPress={() => void confirmPaid()}
            />
            <ActionButton
              tone="quiet"
              label="Not yet"
              onPress={() => setShowConfirmation(false)}
            />
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={recoveringPayment}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        {selected ? (
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <View className="px-5">
              <TopBar title="Payout details" />
            </View>
            <ScrollView contentContainerClassName="px-5 pb-8">
              <Surface className="mt-4 flex-row items-center p-6">
                <InitialAvatar name={selected.childDisplayName} />
                <View className="ml-5 flex-1">
                  <AppText variant="sectionTitle">
                    {selected.childDisplayName}
                  </AppText>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-1"
                  >
                    Period ended {selected.periodEndLocalDate}
                  </AppText>
                  <View className="mt-3 self-start rounded-full bg-infoSoft px-4 py-2">
                    <AppText variant="label">Status unknown</AppText>
                  </View>
                  <AppText variant="display" color="urgency" className="mt-3">
                    {selected.amountDueSek} kr
                  </AppText>
                </View>
              </Surface>

              <AppText variant="sectionTitle" className="mt-6">
                Pay manually
              </AppText>
              <Surface tone="lavender" elevated={false} className="mt-4 p-5">
                <AppText variant="sectionTitle">
                  Included in running balance
                </AppText>
                <View className="mt-4 flex-row items-end rounded-control bg-surfaceRaised p-4">
                  <View className="flex-1">
                    <AppText variant="caption" color="ink-muted">
                      Current balance
                    </AppText>
                    <AppText variant="cardTitle" className="mt-1">
                      {selected.runningBalanceSek} kr
                    </AppText>
                  </View>
                  <AppText variant="sectionTitle">−</AppText>
                  <View className="flex-1 items-center">
                    <AppText variant="caption" color="ink-muted">
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
                  <AppText variant="sectionTitle">=</AppText>
                  <View className="flex-1 items-end">
                    <AppText variant="caption" color="ink-muted">
                      After paid
                    </AppText>
                    <AppText variant="cardTitle" className="mt-1">
                      {selected.runningBalanceSek - selected.amountDueSek} kr
                    </AppText>
                  </View>
                </View>
              </Surface>

              <Surface
                tone="coral"
                elevated={false}
                className="mt-4 flex-row items-center p-4"
              >
                <DirectionCIcon
                  name="refresh"
                  color={DirectionC.color.coral}
                  size={32}
                />
                <View className="ml-4 flex-1">
                  <AppText variant="cardTitle">Checking payment status</AppText>
                  <AppText className="mt-1">
                    Don’t mark it paid again yet. We’re confirming whether the
                    payout was recorded.
                  </AppText>
                </View>
              </Surface>
              <ActionButton
                className="mt-3"
                label="Checking with server…"
                disabled
                loading
              />
            </ScrollView>
          </SafeAreaView>
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
