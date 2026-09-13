import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { AppText, StatusChip, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { useState } from "react";
import { View } from "react-native";

import { api } from "../../../convex/_generated/api";

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function dateParts(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return { year, month, day };
}

function formatLocalDate(localDate: string) {
  const { year, month, day } = dateParts(localDate);
  return new Intl.DateTimeFormat("en-SE", {
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatPeriod(startLocalDate: string, endLocalDate: string) {
  const start = formatLocalDate(startLocalDate);
  const end = formatLocalDate(endLocalDate);
  const startParts = start.split(" ");
  const endParts = end.split(" ");

  if (startParts.at(-1) === endParts.at(-1)) {
    return `${startParts[0]}–${end}`;
  }

  return `${start} – ${end}`;
}

export function ChildMoneyContent() {
  const [queryNow] = useState(() => Date.now());
  const overview = useQuery(api.payouts.getMine, { now: queryNow });

  if (overview === undefined) {
    return (
      <Surface className="mt-4 p-5">
        <AppText variant="cardTitle">Loading your money…</AppText>
      </Surface>
    );
  }

  const { child, currentPeriod } = overview;
  const balance = child.runningBalanceSek;
  const latest = child.latestPayout;
  const negative = balance < 0;

  return (
    <View className="pb-6">
      <Surface
        tone="mint"
        elevated={false}
        className="mt-3 min-h-[170px] flex-row items-center p-4"
      >
        <View className="h-28 w-28 items-center justify-center rounded-large bg-actionSoftStrong">
          <DirectionCIcon
            name="money"
            color={DirectionC.color.greenDeep}
            size={58}
          />
        </View>
        <View className="ml-4 flex-1">
          <AppText>Running balance</AppText>
          <AppText
            variant="display"
            color={negative ? "urgency" : "ink"}
            className="mt-1"
            testID="task14-running-balance-value"
          >
            {balance} kr
          </AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-2">
            {negative
              ? "Future approved chores reduce this amount first."
              : "Approved chores add to this. Missed locked Extras can subtract."}
          </AppText>
        </View>
      </Surface>

      <Surface
        tone="lavender"
        elevated={false}
        className="mt-3 min-h-[148px] flex-row items-center p-4"
      >
        <View className="h-24 w-24 items-center justify-center rounded-large bg-infoSoftStrong">
          <DirectionCIcon
            name="calendar"
            color={DirectionC.color.ink}
            size={50}
          />
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="cardTitle">This payout week</AppText>
          <AppText variant="sectionTitle" className="mt-1">
            {formatPeriod(
              currentPeriod.startLocalDate,
              currentPeriod.endLocalDate,
            )}
          </AppText>
          <View className="mt-2 flex-row items-center">
            <DirectionCIcon
              name="calendar"
              color={DirectionC.color.ink}
              size={18}
            />
            <AppText variant="bodySmall" className="ml-2">
              Closes {formatWeekday(currentPeriod.payoutWeekday)}
            </AppText>
          </View>
          <AppText variant="caption" color="ink-muted" className="mt-2">
            A new payout period starts after it closes.
          </AppText>
        </View>
      </Surface>

      <AppText variant="sectionTitle" className="mt-5">
        Last week’s payout
      </AppText>
      <Surface className="mt-2 p-4">
        {latest ? (
          <>
            <View className="flex-row items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-rewardSoft">
                <AppText variant="sectionTitle">
                  {child.displayName.charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View className="ml-4 flex-1">
                <AppText variant="cardTitle">{child.displayName}</AppText>
                <AppText variant="bodySmall" color="ink-muted" className="mt-1">
                  Period ended {formatLocalDate(latest.periodEndLocalDate)}
                </AppText>
                <AppText
                  variant="amount"
                  color={latest.balanceAtCloseSek < 0 ? "urgency" : "ink"}
                  className="mt-1"
                >
                  {latest.balanceAtCloseSek} kr
                </AppText>
                <View className="mt-1">
                  <StatusChip
                    label={
                      latest.status === "pending"
                        ? "Waiting for Parent"
                        : latest.status === "paid"
                          ? "Paid"
                          : latest.balanceAtCloseSek < 0
                            ? "Carries forward"
                            : "Nothing to pay"
                    }
                    tone={
                      latest.status === "paid" || latest.status === "pending"
                        ? "success"
                        : latest.balanceAtCloseSek < 0
                          ? "urgent"
                          : "info"
                    }
                  />
                </View>
              </View>
            </View>

            {latest.status === "pending" ? (
              <>
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  className="mt-4 text-center"
                >
                  This {latest.amountDueSek} kr is already included in your{" "}
                  {balance} kr balance.
                </AppText>
                <Surface
                  tone="mint"
                  elevated={false}
                  className="mt-3 flex-row items-center justify-center p-3"
                >
                  <AppText variant="cardTitle">{balance} kr</AppText>
                  <AppText variant="cardTitle" className="mx-3">
                    −
                  </AppText>
                  <AppText variant="cardTitle">
                    {latest.amountDueSek} kr
                  </AppText>
                  <AppText variant="cardTitle" className="mx-3">
                    =
                  </AppText>
                  <AppText variant="cardTitle" color="action">
                    {balance - latest.amountDueSek} kr
                  </AppText>
                </Surface>
                {latest.pendingOutcomeCount > 0 ? (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-3 flex-row items-center p-3"
                  >
                    <DirectionCIcon
                      name="info"
                      color={DirectionC.color.ink}
                      size={21}
                    />
                    <AppText variant="bodySmall" className="ml-2 flex-1">
                      {latest.pendingOutcomeCount} unresolved chore{" "}
                      {latest.pendingOutcomeCount === 1
                        ? "result moves"
                        : "results move"}{" "}
                      to a later payout.
                    </AppText>
                  </Surface>
                ) : null}
              </>
            ) : latest.status === "no_payment" ? (
              <View className="mt-4">
                <AppText variant="bodySmall" color="ink-muted">
                  {latest.balanceAtCloseSek < 0
                    ? "Your balance was below zero when the week closed. No payout was created."
                    : "Your balance was 0 kr when the week closed. No payout was created."}
                </AppText>
                {latest.balanceAtCloseSek < 0 ? (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-3 flex-row items-center p-3"
                  >
                    <DirectionCIcon
                      name="info"
                      color={DirectionC.color.ink}
                      size={21}
                    />
                    <AppText variant="bodySmall" className="ml-2 flex-1">
                      The next {Math.abs(latest.balanceAtCloseSek)} kr you earn
                      brings that carried amount back to 0 kr.
                    </AppText>
                  </Surface>
                ) : null}
              </View>
            ) : (
              <AppText variant="bodySmall" color="action" className="mt-4">
                Your Parent recorded this payout as paid.
              </AppText>
            )}
          </>
        ) : (
          <View className="items-center py-4">
            <AppText variant="cardTitle">No previous payout yet</AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-1 text-center"
            >
              Your first closed payout week will appear here.
            </AppText>
          </View>
        )}
      </Surface>

      <Surface className="mt-4 flex-row items-center p-4">
        <View className="h-20 w-24 items-center justify-center rounded-control bg-rewardSoft">
          <DirectionCIcon name="info" color={DirectionC.color.ink} size={42} />
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="cardTitle">How your balance works</AppText>
          <AppText variant="bodySmall" color="action" className="mt-2">
            ＋ Approved chores add their reward
          </AppText>
          <AppText variant="bodySmall" color="urgency" className="mt-1">
            − Missed locked Extras subtract their full value
          </AppText>
        </View>
      </Surface>
    </View>
  );
}
