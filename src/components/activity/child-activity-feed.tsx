import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { AppState, View } from "react-native";

import {
  ChoreIcon,
  StarBuddy,
  Constellation,
  type SkyDay,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

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
};

const DAY_MS = 86_400_000;

/** The last 7 household-local dates, oldest first, ending today. */
function lastSevenDays(now: number, timezone: string) {
  const today = localDateKey(now, timezone);
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d, 12);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(base - (6 - i) * DAY_MS);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-GB", {
        weekday: "narrow",
        timeZone: "UTC",
      }),
      isToday: i === 6,
    };
  });
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
 * The Family tab: this week's sky — each approved chore lights a
 * star in its owner's colour — and below it a log of who did what for how much.
 * Chore values are shared; balances never appear here.
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
  // Hold stars back until we know what was seen, so new ones mount as new
  // (and drop) instead of appearing and then silently becoming "new".
  const seenKnown = !seenKey || seen !== undefined;
  const days: SkyDay[] = lastSevenDays(now, timezone).map((day) => ({
    ...day,
    stars: (seenKnown ? week : [])
      .filter((star) => localDateKey(star.approvedAt, timezone) === day.key)
      .sort((a, b) => a.approvedAt - b.approvedAt)
      .map((star) => ({
        id: star.activityId,
        color: colorFor(star.childId),
        isNew: typeof seen === "number" && star.approvedAt > seen,
      })),
  }));

  return (
    <View className="pb-6">
      <Constellation days={days} />

      {owners.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {owners.map((owner) => (
            <View
              key={owner.id}
              accessible
              accessibilityLabel={`${owner.name}: ${owner.wins} ${owner.wins === 1 ? "win" : "wins"} this week`}
              className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-1.5"
            >
              <Icon name="star" color={owner.color} size={14} />
              <AppText className="font-body-heavy text-[14px]">
                {owner.name}
              </AppText>
              <AppText variant="caption" color="ink-muted">
                {owner.wins}
              </AppText>
            </View>
          ))}
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
          />
          <LogSection
            title="Earlier"
            items={earlier}
            timezone={timezone}
            viewerChildId={viewerChildId}
            colorFor={colorFor}
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
}: {
  title: string;
  items: ApprovalActivityItem[];
  timezone: string;
  viewerChildId?: Id<"children">;
  colorFor: (childId: string) => string;
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
}: {
  item: ApprovalActivityItem;
  timezone: string;
  mine: boolean;
  color: string;
}) {
  const who = mine ? "You" : item.childDisplayName;
  const kind = item.choreKind === "claimable" ? "Extra" : "Quest";
  return (
    <View
      accessible
      accessibilityLabel={`${who} completed ${item.choreTitle}, ${kind}, plus ${item.valueSek} kronor, ${formatApprovedAt(item.approvedAt, timezone)}`}
      className="min-h-[52px] flex-row items-center gap-3 py-1.5"
    >
      <View>
        <ChoreIcon title={item.choreTitle} size={34} />
        <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-night">
          <Icon name="star" color={color} size={10} />
        </View>
      </View>
      <View className="flex-1">
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
    </View>
  );
}
