import { useQuery } from "convex/react";
import { type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  FadeInDown,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import {
  ChoreIcon,
  GroundRadar,
  type RadarCraft,
  type RadarStatus,
} from "@/components/art";
import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import {
  avatarToneColor,
  childAvatarTone,
  Avatar,
} from "@/components/ui/avatar";
import { useHourNow, useMinuteNow } from "@/lib/use-hour-now";
import { getClaimCommitmentLockAt } from "../../../convex/lib/claims/commitmentRules";
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

/** A signal on the console: something that needs (or is worth) a look. */
function Signal({
  tone,
  icon,
  title,
  detail,
  onPress,
}: {
  tone: "pay" | "watch";
  icon: "money" | "lock";
  title: string;
  detail: string;
  onPress?: () => void;
}) {
  const { tokens } = useTheme();
  const color = tone === "pay" ? tokens.gold : tokens.pink;
  return (
    <Animated.View entering={FadeInDown.duration(200).easing(Easings.out)}>
      <Tile onPress={onPress} accessibilityLabel={`${title}. ${detail}`}>
        <View className="flex-row items-center gap-3">
          <View
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}
          >
            <Icon name={icon} color={tokens.ink} size={20} />
          </View>
          <View className="flex-1">
            <AppText variant="cardTitle">{title}</AppText>
            <AppText variant="caption" color="ink-muted" numberOfLines={2}>
              {detail}
            </AppText>
          </View>
          {onPress ? (
            <Icon name="chevron" color={tokens.inkMuted} size={18} />
          ) : null}
        </View>
      </Tile>
    </Animated.View>
  );
}

/**
 * Ground Control: the parent's console. One job — what needs you now.
 * Signals up top (chores to check, pay due on payday, locked Extras near
 * their deadline) appear only when there's something; then the radar, where
 * each kid's craft sits closer to home the further through today's quests
 * they are; then missions in flight and the latest win. Balances live in
 * Money.
 */
export function ParentHomeContent({
  household,
  parentName,
  onOpenReviews,
  onOpenSwitcher,
  onOpenActivity,
  onOpenMoney,
  onOpenKid,
}: {
  household: HouseholdSummary;
  parentName: string;
  onOpenReviews: () => void;
  onAddChore?: () => void;
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
  const hourNow = useHourNow();
  const progress = useQuery(api.groundControl.todayProgress, {
    householdId,
    now: hourNow,
  });
  const now = useMinuteNow();
  const hour = localHour(household.timezone, now);
  const pending = [...(personal ?? []), ...(claimable ?? []), ...(redos ?? [])];
  const pendingLoaded =
    personal !== undefined && claimable !== undefined && redos !== undefined;
  const waitingNames = household.children
    .filter((child) => pending.some((item) => item.childId === child.childId))
    .map((child) => child.displayName);
  const latestWin = activity?.items[0];
  const firstName = parentName.split(" ")[0];

  // Pay: what's due to be sent (finalised weeks not yet marked paid).
  const due = (payouts?.children ?? []).flatMap((child) =>
    child.pendingPayouts.map((payout) => ({
      name: child.displayName,
      amount: payout.amountDueSek,
    })),
  );
  const dueTotal = due.reduce((sum, item) => sum + item.amount, 0);
  // Watch: Extras past their commitment lock and not yet sent — a claim
  // before its deadline, or a redo before its redo deadline. Missing either
  // costs the full value.
  const atRisk = (activeClaims ?? []).flatMap((claim) => {
    const due =
      claim.claimState === "claimed"
        ? claim.deadlineAt
        : claim.claimState === "redo_required"
          ? claim.redoDeadlineAt
          : undefined;
    return due !== undefined &&
      getClaimCommitmentLockAt(due) <= now &&
      due > now
      ? [{ ...claim, due }]
      : [];
  });
  const allClear =
    pendingLoaded &&
    payouts !== undefined &&
    activeClaims !== undefined &&
    pending.length === 0 &&
    dueTotal === 0 &&
    atRisk.length === 0;

  const crafts: RadarCraft[] = household.children.map((child) => {
    const today = progress?.children.find(
      (item) => item.childId === child.childId,
    );
    const waiting = pending.some((item) => item.childId === child.childId);
    const status: RadarStatus =
      today && (today.redo > 0 || today.missed > 0)
        ? "attention"
        : waiting || (today?.submitted ?? 0) > 0
          ? "waiting"
          : today && today.total > 0
            ? "on_track"
            : "idle";
    return {
      id: child.childId,
      name: child.displayName,
      color: avatarToneColor(childAvatarTone(child.displayName), tokens),
      progress: today && today.total > 0 ? today.approved / today.total : 0,
      status,
    };
  });

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

      {/* Signals: only what needs you. */}
      {/* Signals already there when Home opens just sit; new ones slide in. */}
      <LayoutAnimationConfig skipEntering>
        <View className="mt-5 gap-2.5">
          {pending.length > 0 || !pendingLoaded ? (
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
                      color:
                        pending.length > 0 ? tokens.surface : tokens.inkMuted,
                    }}
                  >
                    {pending.length === 0
                      ? "Nothing to check"
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
          ) : null}
          {dueTotal > 0 ? (
            <Signal
              tone="pay"
              icon="money"
              title={`${dueTotal} kr to send`}
              detail={due
                .map((item) => `${item.name} ${item.amount} kr`)
                .join(" · ")}
              onPress={onOpenMoney}
            />
          ) : null}
          {atRisk.map((claim) => (
            <Signal
              key={claim.claimId}
              tone="watch"
              icon="lock"
              title={`${claim.claimedByDisplayName}: ${claim.title}`}
              detail={`${claim.claimState === "redo_required" ? "Redo" : "Locked in"} · due ${formatClock(claim.due, household.timezone)} or −${claim.valueSek} kr`}
            />
          ))}
          {allClear ? (
            <Tile accessibilityLabel="All clear. Nothing needs you right now.">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary">
                  <Icon name="check" color={tokens.ink} size={20} />
                </View>
                <View className="flex-1">
                  <AppText variant="cardTitle">All clear</AppText>
                  <AppText variant="caption" color="ink-muted">
                    Nothing needs you right now.
                  </AppText>
                </View>
              </View>
            </Tile>
          ) : null}
        </View>
      </LayoutAnimationConfig>

      {/* The radar: how far each kid is through today. */}
      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Today</AppText>
        <AppText variant="caption" color="ink-muted">
          Closer to home = more done
        </AppText>
      </View>
      <View className="mt-3 flex-row items-center gap-4 rounded-[26px] bg-surface p-4">
        <GroundRadar crafts={crafts} size={150} sweep={allClear} />
        <View className="flex-1 gap-2.5">
          {household.children.map((child, i) => {
            const today = progress?.children.find(
              (item) => item.childId === child.childId,
            );
            const craft = crafts[i];
            return (
              <Pressable
                key={child.childId}
                accessibilityRole="button"
                accessibilityLabel={`Open ${child.displayName}`}
                onPress={() => onOpenKid?.(child.childId)}
                hitSlop={4}
              >
                <View className="flex-row items-center gap-2">
                  {/* The same craft as on the radar: kid's colour, status light. */}
                  <View
                    className="h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: craft.color,
                      borderWidth: 1.5,
                      borderColor: tokens.ink,
                    }}
                  >
                    <View
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full"
                      style={{
                        borderWidth: 1,
                        borderColor: tokens.surface,
                        backgroundColor:
                          craft.status === "attention"
                            ? tokens.pink
                            : craft.status === "waiting"
                              ? tokens.gold
                              : craft.status === "on_track"
                                ? tokens.primary
                                : tokens.inkFaint,
                      }}
                    />
                  </View>
                  <AppText className="font-body-heavy text-[15px]">
                    {child.displayName}
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  color="ink-muted"
                  className="ml-[18px]"
                >
                  {!today
                    ? "…"
                    : today.total === 0
                      ? "No quests today"
                      : [
                          `${today.approved} of ${today.total} done`,
                          today.submitted > 0
                            ? `${today.submitted} sent`
                            : null,
                          today.redo > 0 ? `${today.redo} redo` : null,
                          today.missed > 0 ? `${today.missed} missed` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Missions in flight, with the Parent's no-penalty cancel. */}
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
              <View className="min-h-[36px] items-center justify-center rounded-full border-b-[3px] border-goldShade bg-gold px-3">
                <AppText variant="label" className="text-night">
                  +{latestWin.valueSek} kr
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
    </View>
  );
}

function formatClock(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toTimeString().slice(0, 5);
  }
}
