import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import Animated, {
  cubicBezier,
  useReducedMotion,
} from "react-native-reanimated";
import { PRESS } from "@/components/art/motion";

import {
  ChoreIcon,
  CrewBadge,
  HighFiveHand,
  Patch,
  PATCH_LABEL,
  StarBuddy,
  type PatchKind,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { questTokens, useTheme } from "@/design-system/theme";

import type { Id } from "../../../convex/_generated/dataModel";
import {
  formatApprovedAt,
  localDateKey,
  type ApprovalActivityItem,
} from "./approval-activity";

type Owner = { id: string; name: string; color: string; wins: number };

/** One approved chore in the last week, without its value. */
export type WeekStar = {
  activityId: string;
  childId: string;
  childDisplayName: string;
  approvedAt: number;
  choreKind?: "personal" | "claimable";
  isUnlockChore?: boolean;
};

const DAY_MS = 86_400_000;

/** The household-local date `n` days before `key` (YYYY-MM-DD). */
function dayBefore(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12) - n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * This week's patches for one crew member, from their approvals (no money):
 * a busy day (3+ wins in one day), every day (wins on 5+ days), an unlock
 * streak (Unlock Chore approved on 2+ days in a row, up to today or
 * yesterday) and mission hero (an Extra approved).
 */
export function patchesFor(
  stars: WeekStar[],
  timezone: string,
  todayKey: string,
) {
  const perDay = new Map<string, number>();
  const unlockDays = new Set<string>();
  let hero = false;
  for (const star of stars) {
    const day = localDateKey(star.approvedAt, timezone);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    if (star.isUnlockChore) unlockDays.add(day);
    if (star.choreKind === "claimable") hero = true;
  }
  let streak = 0;
  const start = unlockDays.has(todayKey) ? 0 : 1;
  while (unlockDays.has(dayBefore(todayKey, start + streak))) streak += 1;

  const earned: { kind: PatchKind; count?: number }[] = [];
  if ([...perDay.values()].some((wins) => wins >= 3))
    earned.push({ kind: "busy" });
  if (perDay.size >= 5) earned.push({ kind: "everyday" });
  if (streak >= 2) earned.push({ kind: "streak", count: streak });
  if (hero) earned.push({ kind: "hero" });
  return earned;
}

/**
 * Newest approval this device has already shown on the shelf, so only
 * stars added since then fall in. `null` = first visit: baseline only.
 */
function useShelfSeen(seenKey: string | undefined, newest: number) {
  const [seen, setSeen] = useState<number | null | undefined>(
    seenKey ? undefined : null,
  );
  useEffect(() => {
    if (!seenKey) return;
    let cancelled = false;
    SecureStore.getItemAsync(`shelf-seen.${seenKey}`)
      .then((raw) => (raw && Number.isFinite(Number(raw)) ? Number(raw) : null))
      .catch(() => null)
      .then((value) => {
        if (!cancelled) setSeen(value);
      });
    return () => {
      cancelled = true;
    };
  }, [seenKey]);
  useEffect(() => {
    if (!seenKey || seen === undefined) return;
    // Always write, even "0", so the very first star counts as new later.
    SecureStore.setItemAsync(
      `shelf-seen.${seenKey}`,
      String(Math.max(newest, seen ?? 0)),
    ).catch(() => {});
  }, [newest, seen, seenKey]);
  return seen;
}

/**
 * The Family tab is about the crew: everyone as an astronaut with this
 * week's star count and the patches they earned (no ranking, no totals),
 * then what the brothers and sisters did, each win with a high-five.
 * Chore values are shared (J-11); balances never appear here.
 */
export function ChildActivityFeed({
  items,
  timezone,
  viewerChildId,
  onOpenChores,
  emptyTitle = "No family wins yet",
  emptyBody = "When your brothers and sisters finish quests, they light up here.",
  emptyActionLabel = "See your quests",
  weekStars,
  seenKey,
  cheered,
  onCheer,
  viewerName,
}: {
  items: ApprovalActivityItem[];
  timezone: string;
  /** The last week's approvals for the shelf; defaults to `items`. */
  weekStars?: WeekStar[];
  /** Per-viewer key for "new since last visit" stars; omit for no drops. */
  seenKey?: string;
  /** The signed-in child, shown as "You"; omit for the Parent view. */
  viewerChildId?: Id<"children">;
  onOpenChores?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  /** Wins this Child already high-fived. */
  cheered?: ReadonlySet<string>;
  /** Kids only: high-five a sibling's win. */
  onCheer?: (activityId: ApprovalActivityItem["activityId"]) => void;
  /** The signed-in child's name, for their helmet's initial. */
  viewerName?: string;
}) {
  const { tokens } = useTheme();
  const week: WeekStar[] = useMemo(
    () =>
      weekStars ??
      items.map((item) => ({
        activityId: item.activityId,
        childId: item.childId,
        childDisplayName: item.childDisplayName,
        approvedAt: item.approvedAt,
        choreKind: item.choreKind,
      })),
    [items, weekStars],
  );

  const owners = useMemo<Owner[]>(() => {
    const colors = [
      tokens.accent,
      tokens.pink,
      tokens.primary,
      tokens.gold,
      tokens.info,
      tokens.star,
    ];
    const byId = new Map<string, { name: string; wins: number }>();
    for (const item of [...week, ...items]) {
      if (!byId.has(item.childId)) {
        byId.set(item.childId, { name: item.childDisplayName, wins: 0 });
      }
    }
    for (const star of week) {
      const owner = byId.get(star.childId);
      if (owner) owner.wins += 1;
    }
    return [...byId.entries()]
      .sort(([aId, a], [bId, b]) =>
        aId === viewerChildId
          ? -1
          : bId === viewerChildId
            ? 1
            : a.name.localeCompare(b.name),
      )
      .map(([id, owner], i) => ({
        id,
        name: id === viewerChildId ? "You" : owner.name,
        color: colors[i % colors.length],
        wins: owner.wins,
      }));
  }, [items, tokens, viewerChildId, week]);

  const colorFor = (childId: string) =>
    owners.find((owner) => owner.id === childId)?.color ?? tokens.star;

  // "Today" moves on at midnight and when the app comes back to the front.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  const todayKey = localDateKey(now, timezone);
  // A kid's Family log is about their brothers and sisters — their own wins
  // are already in Money, and show here only as their stars in the sky.
  const logItems = viewerChildId
    ? items.filter((item) => item.childId !== viewerChildId)
    : items;
  const today = logItems.filter(
    (item) => localDateKey(item.approvedAt, timezone) === todayKey,
  );
  const earlier = logItems.filter(
    (item) => localDateKey(item.approvedAt, timezone) !== todayKey,
  );

  const newest = week.reduce((max, star) => Math.max(max, star.approvedAt), 0);
  const seen = useShelfSeen(seenKey, newest);
  // Patches earned since the last visit stitch themselves on once.
  const crew = owners.map((owner) => {
    const mine = week.filter((star) => star.childId === owner.id);
    const now = patchesFor(mine, timezone, todayKey);
    const before =
      typeof seen === "number"
        ? patchesFor(
            mine.filter((star) => star.approvedAt <= seen),
            timezone,
            todayKey,
          ).map((patch) => patch.kind)
        : null;
    return {
      ...owner,
      patches: now.map((patch) => ({
        ...patch,
        isNew: before !== null && !before.includes(patch.kind),
      })),
    };
  });
  const seenKnown = !seenKey || seen !== undefined;

  return (
    <View className="pb-6">
      {seenKnown && crew.length > 0 ? (
        <View className="gap-2.5">
          {crew.map((member) => (
            <View
              key={member.id}
              accessible
              accessibilityLabel={`${member.name}: ${member.wins} ${member.wins === 1 ? "star" : "stars"} this week${
                member.patches.length > 0
                  ? `. Patches: ${member.patches.map((patch) => PATCH_LABEL[patch.kind]).join(", ")}`
                  : ""
              }`}
              className="flex-row items-center gap-3.5 rounded-large bg-surface py-3 pl-3 pr-4"
            >
              <CrewBadge
                name={
                  member.name === "You" ? (viewerName ?? "You") : member.name
                }
                color={member.color}
                stars={member.wins}
                size={52}
              />
              <View className="flex-1">
                <AppText className="font-body-heavy text-[16px]">
                  {member.name}
                </AppText>
                {member.patches.length > 0 ? (
                  <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                    {member.patches.map((patch) => (
                      <Patch
                        key={patch.kind}
                        kind={patch.kind}
                        count={patch.count}
                        isNew={patch.isNew}
                        size={28}
                      />
                    ))}
                  </View>
                ) : (
                  <AppText variant="caption" color="ink-muted">
                    {member.wins === 0
                      ? "No stars yet this week"
                      : "No patches yet this week"}
                  </AppText>
                )}
              </View>
            </View>
          ))}
          <PatchLegend />
        </View>
      ) : null}

      {viewerChildId ? (
        <View className="mt-3 flex-row items-center gap-2">
          <Icon name="lock" color={tokens.inkMuted} size={13} />
          <AppText variant="caption" color="ink-muted" className="flex-1">
            Chore rewards are shared. Everyone’s balance stays private.
          </AppText>
        </View>
      ) : null}

      {logItems.length === 0 ? (
        <View
          className="mt-6 items-center"
          testID="household-approval-activity"
        >
          <StarBuddy size={72} mood="sleepy" />
          <AppText variant="sectionTitle" className="mt-3 text-center">
            {emptyTitle}
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-1.5 px-4 text-center font-body-bold"
          >
            {emptyBody}
          </AppText>
          {onOpenChores ? (
            <ActionButton
              className="mt-5 w-full"
              label={emptyActionLabel}
              onPress={onOpenChores}
            />
          ) : null}
        </View>
      ) : (
        <View className="mt-6 gap-6" testID="household-approval-activity">
          <LogSection
            title="Today"
            items={today}
            timezone={timezone}
            viewerChildId={viewerChildId}
            colorFor={colorFor}
            cheered={cheered}
            onCheer={onCheer}
          />
          <LogSection
            title="Earlier"
            items={earlier}
            timezone={timezone}
            viewerChildId={viewerChildId}
            colorFor={colorFor}
            cheered={cheered}
            onCheer={onCheer}
          />
        </View>
      )}
    </View>
  );
}

function LogSection({
  title,
  items,
  timezone,
  viewerChildId,
  colorFor,
  cheered,
  onCheer,
}: {
  title: string;
  items: ApprovalActivityItem[];
  timezone: string;
  viewerChildId?: Id<"children">;
  colorFor: (childId: string) => string;
  cheered?: ReadonlySet<string>;
  onCheer?: (activityId: ApprovalActivityItem["activityId"]) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View>
      <AppText variant="sectionTitle" accessibilityRole="header">
        {title}
      </AppText>
      <View className="mt-3 rounded-large bg-surface px-4 py-1.5">
        {items.map((item) => (
          <LogRow
            key={item.activityId}
            item={item}
            timezone={timezone}
            mine={item.childId === viewerChildId}
            color={colorFor(item.childId)}
            cheered={cheered?.has(item.activityId) ?? false}
            onCheer={
              onCheer && item.childId !== viewerChildId
                ? () => onCheer(item.activityId)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

function LogRow({
  item,
  timezone,
  mine,
  color,
  cheered,
  onCheer,
}: {
  item: ApprovalActivityItem;
  timezone: string;
  mine: boolean;
  color: string;
  cheered: boolean;
  onCheer?: () => void;
}) {
  const who = mine ? "You" : item.childDisplayName;
  const kind = item.choreKind === "claimable" ? "Extra" : "Quest";
  return (
    <View
      // With a high-five button inside, the row can't be one element or
      // VoiceOver can't reach the button; the text gets the label instead.
      accessible={!onCheer}
      accessibilityLabel={
        onCheer
          ? undefined
          : `${who} completed ${item.choreTitle}, ${kind}, plus ${item.valueSek} kronor, ${formatApprovedAt(item.approvedAt, timezone)}`
      }
      className="min-h-[52px] flex-row items-center gap-3 py-1.5"
    >
      <View>
        <ChoreIcon title={item.choreTitle} size={34} />
        <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-night">
          <Icon name="star" color={color} size={10} />
        </View>
      </View>
      <View
        className="flex-1"
        accessible={Boolean(onCheer)}
        accessibilityLabel={
          onCheer
            ? `${who} completed ${item.choreTitle}, ${kind}, plus ${item.valueSek} kronor, ${formatApprovedAt(item.approvedAt, timezone)}`
            : undefined
        }
      >
        <AppText
          className="font-body-heavy text-[15px] leading-[20px]"
          numberOfLines={1}
        >
          <AppText className="font-body-heavy text-[15px]" style={{ color }}>
            {who}
          </AppText>{" "}
          · {item.choreTitle}
        </AppText>
        <AppText variant="caption" color="ink-muted">
          {kind} · {formatApprovedAt(item.approvedAt, timezone)}
        </AppText>
      </View>
      <AppText className="font-display text-[15px]" color="gold">
        +{item.valueSek} kr
      </AppText>
      {onCheer ? (
        <HighFiveButton
          cheered={cheered}
          who={item.childDisplayName}
          onPress={onCheer}
        />
      ) : null}
    </View>
  );
}

/**
 * A high-five for a sibling's win. Press gives a small squash; once sent
 * it turns gold and stays that way (one per win).
 */
function HighFiveButton({
  cheered,
  who,
  onPress,
}: {
  cheered: boolean;
  who: string;
  onPress: () => void;
}) {
  // Only kids see this button, always on the night-sky theme.
  // Sent from this tap (never when saved high-fives load in): the hand
  // gives one little wave.
  const [sentHere, setSentHere] = useState(false);
  const reducedMotion = useReducedMotion();
  const wave = cheered && sentHere && !reducedMotion;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        cheered ? `You high-fived ${who}` : `High-five ${who}`
      }
      accessibilityState={{ disabled: cheered }}
      disabled={cheered}
      onPress={() => {
        setSentHere(true);
        onPress();
      }}
      hitSlop={8}
    >
      {({ pressed }) => (
        <Animated.View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: cheered
              ? questTokens.gold
              : questTokens.nightRaised,
            transform: [{ scale: pressed ? PRESS.scale : 1 }],
            transitionProperty: ["transform", "backgroundColor"],
            transitionDuration: [`${PRESS.durationMs}ms`, "200ms"],
            transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
          }}
        >
          <Animated.View
            style={
              wave
                ? {
                    animationName: HIGH_FIVE_WAVE,
                    animationDuration: "320ms",
                    animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
                  }
                : undefined
            }
          >
            <HighFiveHand
              size={20}
              color={cheered ? questTokens.night : questTokens.ink}
            />
          </Animated.View>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** One quick wave when a high-five is sent. */
const HIGH_FIVE_WAVE = {
  "0%": { transform: [{ scale: 1 }, { rotate: "0deg" }] },
  "40%": { transform: [{ scale: 1.18 }, { rotate: "-16deg" }] },
  "100%": { transform: [{ scale: 1 }, { rotate: "0deg" }] },
};

/** What the patches mean, one line each. */
function PatchLegend() {
  const kinds: { kind: PatchKind; text: string }[] = [
    { kind: "busy", text: "3 wins in one day" },
    { kind: "everyday", text: "Wins on 5 days" },
    { kind: "streak", text: "Unlock Chore days in a row" },
    { kind: "hero", text: "An Extra done" },
  ];
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1.5 px-1">
      {kinds.map(({ kind, text }) => (
        <View key={kind} className="flex-row items-center gap-1.5">
          <Patch kind={kind} size={16} />
          <AppText variant="caption" color="ink-muted" style={{ fontSize: 11 }}>
            {text}
          </AppText>
        </View>
      ))}
    </View>
  );
}
