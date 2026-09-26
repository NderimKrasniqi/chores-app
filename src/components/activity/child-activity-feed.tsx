import { useEffect, useMemo, useState } from "react";
import { AppState, View } from "react-native";

import {
  ChoreIcon,
  FamilySky,
  StarBuddy,
  type SkyStar,
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

/**
 * The Family tab as a shared night sky: each approved chore lights a star in
 * its owner's colour, and below it a log of who did what for how much.
 * Chore values are shared; balances never appear here.
 */
export function ChildActivityFeed({
  items,
  timezone,
  viewerChildId,
  onOpenChores,
  emptyTitle = "The sky is dark tonight",
  emptyBody = "Your first approved quest lights the first star.",
  emptyActionLabel = "See your quests",
}: {
  items: ApprovalActivityItem[];
  timezone: string;
  /** The signed-in child, shown as "You"; omit for the Parent view. */
  viewerChildId?: Id<"children">;
  onOpenChores?: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
}) {
  const { tokens } = useTheme();
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
    for (const item of items) {
      const current = byId.get(item.childId);
      byId.set(item.childId, {
        name: item.childDisplayName,
        wins: (current?.wins ?? 0) + 1,
      });
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
  }, [items, tokens, viewerChildId]);

  const colorFor = (childId: string) =>
    owners.find((owner) => owner.id === childId)?.color ?? tokens.star;

  const stars = useMemo<SkyStar[]>(
    () =>
      items.map((item) => ({
        id: item.activityId,
        ownerId: item.childId,
        approvedAt: item.approvedAt,
        valueSek: item.valueSek,
        color:
          owners.find((owner) => owner.id === item.childId)?.color ??
          tokens.star,
      })),
    [items, owners, tokens],
  );

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
  const today = items.filter(
    (item) => localDateKey(item.approvedAt, timezone) === todayKey,
  );
  const earlier = items.filter(
    (item) => localDateKey(item.approvedAt, timezone) !== todayKey,
  );

  return (
    <View className="pb-6">
      <FamilySky stars={stars} owners={owners.map((owner) => owner.id)} />

      {owners.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {owners.map((owner) => (
            <View
              key={owner.id}
              accessible
              accessibilityLabel={`${owner.name}: ${owner.wins} ${owner.wins === 1 ? "win" : "wins"}`}
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

      <View className="mt-3 flex-row items-center gap-2">
        <Icon name="lock" color={tokens.inkMuted} size={13} />
        <AppText variant="caption" color="ink-muted" className="flex-1">
          Chore rewards are shared. Everyone’s balance stays private.
        </AppText>
      </View>

      {items.length === 0 ? (
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
      <View className="mt-3 gap-2.5">
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
      className="min-h-[72px] flex-row items-center gap-3 rounded-large bg-surface py-2.5 pl-2.5 pr-3"
      style={mine ? { borderWidth: 2, borderColor: color } : undefined}
    >
      <View>
        <ChoreIcon title={item.choreTitle} size={48} />
        <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-night">
          <Icon name="star" color={color} size={12} />
        </View>
      </View>
      <View className="flex-1">
        <AppText
          className="font-body-heavy text-[15px] leading-[20px]"
          numberOfLines={2}
        >
          <AppText className="font-body-heavy text-[15px]" style={{ color }}>
            {who}
          </AppText>{" "}
          completed {item.choreTitle}
        </AppText>
        <AppText variant="caption" color="ink-muted" className="mt-0.5">
          {kind} · {formatApprovedAt(item.approvedAt, timezone)}
        </AppText>
      </View>
      <View className="h-11 w-11 items-center justify-center rounded-full border-b-[3px] border-goldShade bg-gold">
        <AppText className="font-display text-[14px] leading-[16px] text-night">
          +{item.valueSek}
        </AppText>
      </View>
    </View>
  );
}
