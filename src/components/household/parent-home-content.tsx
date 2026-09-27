import { useQuery } from "convex/react";
import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated from "react-native-reanimated";

import { ChoreIcon } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ActiveClaimableClaimsCard } from "../chores/active-claimable-claims-card";
import type { HouseholdSummary } from "./household-types";

function localHour(timezone: string, now: number) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date(now))
      .split(":")
      .map(Number);
    return parts[0] + parts[1] / 60;
  } catch {
    const date = new Date(now);
    return date.getHours() + date.getMinutes() / 60;
  }
}

function greeting(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The day as an arc: the sun (or moon, after dark) sits where the time of
 * day is, 06:00 on the left to 22:00 on the right.
 */

function Tile({
  onPress,
  accessibilityLabel,
  children,
  tone = "surface",
}: {
  onPress?: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  tone?: "surface" | "ink";
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Animated.View
          className="rounded-[26px] p-4"
          style={[
            {
              backgroundColor: tone === "ink" ? tokens.ink : tokens.surface,
              transform: [{ scale: pressed ? PRESS.scale : 1 }],
            },
            pressTransition,
          ]}
        >
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

/** A mini fan of cards, one per waiting submission (up to three). */
function MiniDeck({ count }: { count: number }) {
  const { tokens } = useTheme();
  const shown = Math.min(3, Math.max(1, count));
  return (
    <View style={{ width: 86, height: 70 }} accessible={false}>
      {Array.from({ length: shown }, (_, i) => {
        const depth = shown - 1 - i;
        return (
          <View
            key={i}
            className="absolute rounded-[12px]"
            style={{
              width: 54,
              height: 68,
              left: 16 + depth * 8,
              top: depth * 1,
              backgroundColor:
                depth === 0 ? tokens.surface : tokens.surfaceMuted,
              opacity: count === 0 ? 0.35 : 1,
              transform: [{ rotate: `${(depth - 1) * 8}deg` }],
              borderWidth: 1,
              borderColor: tokens.line,
            }}
          >
            {depth === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Icon
                  name={count === 0 ? "check" : "reviews"}
                  color={tokens.action}
                  size={24}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * The parent's mission control: what the day looks like, what's waiting to
 * be checked, how each child is doing, and the latest win.
 */
export function ParentHomeContent({
  household,
  parentName,
  onOpenReviews,
  onAddChore,
  onOpenSwitcher,
  onOpenActivity,
  onOpenMoney,
  onOpenKid,
}: {
  household: HouseholdSummary;
  parentName: string;
  onOpenReviews: () => void;
  onAddChore: () => void;
  onOpenSwitcher: () => void;
  onOpenActivity: () => void;
  onOpenMoney: () => void;
  onOpenKid?: (childId: Id<"children">) => void;
}) {
  const { tokens } = useTheme();
  const householdId: Id<"households"> = household.householdId;
  const personal = useQuery(api.personalChoreReviews.listPending, {
    householdId,
  });
  const claimable = useQuery(api.claimableChoreReviews.listPending, {
    householdId,
  });
  const redos = useQuery(api.redoChoreReviews.listPending, { householdId });
  const payouts = useQuery(api.payouts.getOverview, { householdId });
  const activity = useQuery(api.householdActivity.listForParent, {
    householdId,
  });
  const activeClaims = useQuery(api.claimableChores.listActiveForParent, {
    householdId,
  });
  const [now] = useState(() => Date.now());
  const hour = localHour(household.timezone, now);

  const pending = [...(personal ?? []), ...(claimable ?? []), ...(redos ?? [])];
  const pendingLoaded =
    personal !== undefined && claimable !== undefined && redos !== undefined;
  const waitingNames = [
    ...new Set(pending.map((item) => item.childDisplayName)),
  ];
  const latestWin = activity?.items[0];
  const firstName = parentName.split(" ")[0];

  return (
    <View className="pb-8">
      <View className="flex-row items-center justify-between pt-3">
        <View className="flex-1 pr-2">
          <AppText variant="label" color="ink-muted">
            {greeting(hour)}, {firstName}
          </AppText>
          <AppText
            variant="screenTitle"
            numberOfLines={2}
            accessibilityRole="header"
            className="mt-0.5"
          >
            {household.name}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your account"
          onPress={onOpenSwitcher}
          hitSlop={8}
        >
          <Avatar
            tone="parent"
            className="rounded-full"
            fallbackLabel={parentName}
            size={44}
          />
        </Pressable>
      </View>

      <View className="mt-5">
        <Tile
          tone={pending.length > 0 ? "ink" : "surface"}
          onPress={onOpenReviews}
          accessibilityLabel={
            pending.length > 0
              ? `${pending.length} chores to check from ${waitingNames.join(", ")}`
              : "Nothing to check. Open reviews"
          }
        >
          <View className="flex-row items-center gap-3">
            <MiniDeck count={pending.length} />
            <View className="flex-1">
              <AppText
                variant="display"
                style={{
                  color: pending.length > 0 ? tokens.surface : tokens.ink,
                }}
              >
                {pendingLoaded ? pending.length : "…"}
              </AppText>
              <AppText
                className="font-body-bold"
                style={{
                  color: pending.length > 0 ? tokens.surface : tokens.inkMuted,
                }}
              >
                {pending.length === 0
                  ? "All caught up"
                  : `to check · ${waitingNames.join(", ")}`}
              </AppText>
            </View>
            <Icon
              name="chevron"
              color={pending.length > 0 ? tokens.surface : tokens.inkMuted}
              size={20}
            />
          </View>
        </Tile>
      </View>

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">The crew</AppText>
        <Pressable accessibilityRole="button" onPress={onOpenMoney} hitSlop={8}>
          <AppText variant="label" color="action">
            Money
          </AppText>
        </Pressable>
      </View>
      <View className="mt-3 gap-2.5">
        {household.children.map((child) => {
          const money = payouts?.children.find(
            (item) => item.childId === child.childId,
          );
          const owed = (money?.pendingPayouts ?? []).reduce(
            (sum, payout) => sum + payout.amountDueSek,
            0,
          );
          const claims = (activeClaims ?? []).filter(
            (claim) => claim.childId === child.childId,
          );
          const waiting = pending.filter(
            (item) => item.childDisplayName === child.displayName,
          ).length;
          return (
            <Tile
              key={child.childId}
              onPress={() =>
                onOpenKid ? onOpenKid(child.childId) : onOpenMoney()
              }
              accessibilityLabel={`${child.displayName}: balance ${money?.runningBalanceSek ?? 0} kronor${owed > 0 ? `, ${owed} kronor to pay` : ""}`}
            >
              <View className="flex-row items-center gap-3">
                <Avatar
                  tone={childAvatarTone(child.displayName)}
                  className="rounded-full"
                  fallbackLabel={child.displayName}
                  size={52}
                />
                <View className="flex-1">
                  <AppText variant="cardTitle">{child.displayName}</AppText>
                  <AppText
                    variant="caption"
                    color="ink-muted"
                    className="mt-0.5"
                  >
                    {[
                      waiting > 0 ? `${waiting} to check` : null,
                      claims.length > 0 ? `Extra: ${claims[0].title}` : null,
                      owed > 0 ? `${owed} kr to pay` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "All quiet"}
                  </AppText>
                </View>
                <View className="items-end">
                  <AppText variant="amount">
                    {money ? money.runningBalanceSek : "…"}
                  </AppText>
                  <AppText variant="caption" color="ink-muted">
                    kr
                  </AppText>
                </View>
              </View>
            </Tile>
          );
        })}
      </View>

      {/* Claimed Extras, with the Parent's no-penalty cancel. */}
      <ActiveClaimableClaimsCard householdId={householdId} homeVariant />

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Latest win</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenActivity}
          hitSlop={8}
        >
          <AppText variant="label" color="action">
            All activity
          </AppText>
        </Pressable>
      </View>
      <View className="mt-3">
        <Tile
          onPress={onOpenActivity}
          accessibilityLabel={
            latestWin
              ? `${latestWin.childDisplayName} completed ${latestWin.choreTitle}, ${latestWin.valueSek} kronor`
              : "No approved chores yet"
          }
        >
          {latestWin ? (
            <View className="flex-row items-center gap-3">
              <ChoreIcon title={latestWin.choreTitle} size={52} />
              <View className="flex-1">
                <AppText variant="cardTitle" numberOfLines={1}>
                  {latestWin.choreTitle}
                </AppText>
                <AppText variant="caption" color="ink-muted">
                  {latestWin.childDisplayName} · approved
                </AppText>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-full border-b-[3px] border-goldShade bg-gold">
                <AppText variant="label" className="text-night">
                  +{latestWin.valueSek}
                </AppText>
              </View>
            </View>
          ) : (
            <AppText color="ink-muted">
              {activity === undefined
                ? "…"
                : "Approved chores show up here as wins."}
            </AppText>
          )}
        </Tile>
      </View>

      <View className="mt-6 flex-row gap-3">
        <View className="flex-1">
          <Tile onPress={onAddChore} accessibilityLabel="Add a chore">
            <Icon name="plus" color={tokens.action} size={24} />
            <AppText variant="cardTitle" className="mt-2">
              Add a chore
            </AppText>
          </Tile>
        </View>
        <View className="flex-1">
          <Tile onPress={onOpenMoney} accessibilityLabel="Pay out">
            <Icon name="money" color={tokens.action} size={24} />
            <AppText variant="cardTitle" className="mt-2">
              Pay out
            </AppText>
          </Tile>
        </View>
      </View>
    </View>
  );
}
