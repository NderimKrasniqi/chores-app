import { Icon } from "@/components/ui/icon";
import {
  childAvatarTone,
  Avatar,
} from "@/components/ui/avatar";
import { AppImage as Image } from "@/components/ui/app-image";
import { questTokens as themeColors } from "@/design-system/theme";
import { AppText, StatusChip, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { useState } from "react";
import { View } from "react-native";

import { api } from "../../../convex/_generated/api";
import {
  formatLocalDate as formatShortLocalDate,
  formatLocalDateRange,
} from "@/lib/dates";

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const moneyWalletArtwork = require("../../../assets/images/direction-c/money-wallet.png");
const moneyCalendarArtwork = require("../../../assets/images/direction-c/money-calendar.png");
const moneyLightbulbArtwork = require("../../../assets/images/direction-c/money-lightbulb.png");

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function formatLocalDate(localDate: string) {
  return formatShortLocalDate(localDate);
}

function formatPeriod(startLocalDate: string, endLocalDate: string) {
  return formatLocalDateRange(startLocalDate, endLocalDate);
}

export function ChildMoneyContent() {
  const [queryNow] = useState(() => Date.now());
  const overview = useQuery(api.payouts.getMine, { now: queryNow });

  if (overview === undefined) {
    return (
      <Surface className="mt-4 p-5">
        <AppText variant="cardTitle">Loading your money…</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Your balance and payout week will appear here.
        </AppText>
      </Surface>
    );
  }

  const { child, currentPeriod } = overview;
  const balance = child.runningBalanceSek;
  const latest = child.latestPayout;
  const negative = balance < 0;
  const compactGuide = latest?.status === "pending" || negative;

  return (
    <View className="pb-6">
      <Surface
        tone="mint"
        elevated={false}
        className="min-h-[136px] flex-row items-center p-3"
      >
        <View className="h-28 w-32 items-center justify-center">
          <Image
            source={moneyWalletArtwork}
            className="h-32 w-32"
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View className="ml-5 flex-1">
          <AppText variant="bodySmall">Running balance</AppText>
          <AppText
            variant="display"
            color={negative ? "urgency" : "ink"}
            className="mt-0.5"
            testID="task14-running-balance-value"
          >
            {balance} kr
          </AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-1"
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {negative
              ? "Future approved chores reduce this amount first."
              : "Approved chores add to this. Missed locked Extras can subtract."}
          </AppText>
        </View>
      </Surface>

      <Surface
        tone="lavender"
        elevated={false}
        className="min-h-[128px] flex-row items-center p-3"
      >
        <View className="h-24 w-32 items-center justify-center">
          <Image
            source={moneyCalendarArtwork}
            className="h-32 w-32"
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View className="ml-5 flex-1">
          <AppText variant="cardTitle">This payout week</AppText>
          <AppText variant="sectionTitle" className="mt-0.5">
            {formatPeriod(
              currentPeriod.startLocalDate,
              currentPeriod.endLocalDate,
            )}
          </AppText>
          <View className="mt-2 flex-row items-center">
            <Icon
              name="calendar"
              color={themeColors.ink}
              size={18}
            />
            <AppText variant="bodySmall" className="ml-1.5">
              Closes {formatWeekday(currentPeriod.payoutWeekday)}
            </AppText>
          </View>
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            A new payout period starts after it closes.
          </AppText>
        </View>
      </Surface>

      <AppText variant="sectionTitle" className="mt-3">
        Last week’s payout
      </AppText>
      <Surface className="mt-2 px-3 py-1">
        {latest ? (
          <>
            <View className="flex-row items-center">
              <Avatar
                source={childAvatar(child.displayName)}
                tone={childAvatarTone(child.displayName)}
                className="h-20 w-20"
                fallbackLabel={child.displayName}
              />
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
                    icon={
                      latest.status === "no_payment" ? (
                        <View
                          className={`h-6 w-6 items-center justify-center rounded-full ${latest.balanceAtCloseSek < 0 ? "bg-urgency" : "bg-info"}`}
                        >
                          <Icon
                            name="minus"
                            color={themeColors.onAction}
                            size={14}
                          />
                        </View>
                      ) : (
                        <Icon
                          name={latest.status === "pending" ? "clock" : "check"}
                          color={themeColors.actionPressed}
                          size={15}
                        />
                      )
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
                  className="mt-2 text-center"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  This {latest.amountDueSek} kr is already included in your{" "}
                  {balance} kr balance.
                </AppText>
                <Surface
                  tone="mint"
                  elevated={false}
                  className="mt-2 flex-row items-center justify-center px-3 py-1"
                >
                  <AppText variant="cardTitle" numberOfLines={1}>
                    {balance} kr
                  </AppText>
                  <AppText variant="cardTitle" className="mx-3">
                    −
                  </AppText>
                  <AppText variant="cardTitle" numberOfLines={1}>
                    {latest.amountDueSek} kr
                  </AppText>
                  <AppText variant="cardTitle" className="mx-3">
                    =
                  </AppText>
                  <View className="items-center">
                    <AppText
                      variant="cardTitle"
                      color="action"
                      numberOfLines={1}
                    >
                      {balance - latest.amountDueSek} kr
                    </AppText>
                    <AppText
                      variant="caption"
                      color="action"
                      className="mt-0.5 text-center"
                    >
                      after Parent marks paid
                    </AppText>
                  </View>
                </Surface>
                {latest.pendingOutcomeCount > 0 ? (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-1 flex-row items-center p-1"
                  >
                    <Icon
                      name="info"
                      color={themeColors.ink}
                      size={21}
                    />
                    <AppText
                      variant="bodySmall"
                      className="ml-2 flex-1"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
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
              <View className="mt-2 pb-3">
                <AppText variant="bodySmall" color="ink-muted">
                  {latest.balanceAtCloseSek < 0
                    ? "Your balance was below zero when the week closed. No payout was created."
                    : "Your balance was 0 kr when the week closed.\nNo payout was created."}
                </AppText>
                {latest.balanceAtCloseSek < 0 ? (
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-1 flex-row items-center p-3"
                  >
                    <Icon
                      name="info"
                      color={themeColors.ink}
                      size={21}
                    />
                    <AppText variant="bodySmall" className="ml-2 flex-1">
                      The next {Math.abs(latest.balanceAtCloseSek)} kr you earn
                      brings your balance back to 0 kr.
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

      <Surface
        className={`${compactGuide ? "mt-2 p-1" : "mt-6 p-4"} flex-row items-center`}
      >
        <View
          className={`${compactGuide ? "h-16 w-20" : "h-20 w-24"} items-center justify-center rounded-control bg-rewardSoft`}
        >
          <Image
            source={moneyLightbulbArtwork}
            className={compactGuide ? "h-20 w-20" : "h-24 w-24"}
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View className={`${compactGuide ? "ml-3" : "ml-4"} flex-1`}>
          <AppText variant="cardTitle">How your balance works</AppText>
          <View
            className={`${negative ? "mt-0" : compactGuide ? "mt-1" : "mt-2"} flex-row items-center`}
          >
            <View
              className={`${negative ? "h-5 w-5" : compactGuide ? "h-6 w-6" : "h-7 w-7"} items-center justify-center rounded-full bg-action`}
            >
              <Icon
                name="plus"
                color={themeColors.onAction}
                size={negative ? 13 : compactGuide ? 15 : 17}
              />
            </View>
            <AppText
              variant="bodySmall"
              color="action"
              className="ml-2 flex-1"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Approved chores add their reward
            </AppText>
          </View>
          <View
            className={`${negative ? "mt-0" : "mt-1"} flex-row items-center`}
          >
            <View
              className={`${negative ? "h-5 w-5" : compactGuide ? "h-6 w-6" : "h-7 w-7"} items-center justify-center rounded-full bg-urgency`}
            >
              <Icon
                name="minus"
                color={themeColors.onAction}
                size={negative ? 13 : compactGuide ? 15 : 17}
              />
            </View>
            <AppText
              variant="bodySmall"
              color="urgency"
              className="ml-2 flex-1"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              Missed locked Extras subtract their full value
            </AppText>
          </View>
        </View>
      </Surface>
    </View>
  );
}
