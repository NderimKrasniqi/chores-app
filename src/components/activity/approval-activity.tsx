import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";
import { AppImage as Image } from "@/components/ui/app-image";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import type { Id } from "../../../convex/_generated/dataModel";

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dishwasher: require("../../../assets/images/direction-c/chore-dishwasher.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  laundry: require("../../../assets/images/direction-c/chore-laundry.png"),
  plants: require("../../../assets/images/direction-c/chore-plants.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
  table: require("../../../assets/images/direction-c/chore-table.png"),
};

const emptyActivityArtwork = require("../../../assets/images/direction-c/activity-empty.png");
const celebrationArtwork = require("../../../assets/images/direction-c/activity-celebration.png");
const parentCelebrationArtwork = require("../../../assets/images/direction-c/activity-celebration-parent.png");

function artworkForTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dishwasher") || normalized.includes("dishes"))
    return artwork.dishwasher;
  if (normalized.includes("table")) return artwork.table;
  if (normalized.includes("laundry") || normalized.includes("fold"))
    return artwork.laundry;
  if (normalized.includes("plant") || normalized.includes("water"))
    return artwork.plants;
  if (normalized.includes("dog") || normalized.includes("walk"))
    return artwork.dog;
  if (normalized.includes("recycl") || normalized.includes("trash"))
    return artwork.recycling;
  if (normalized.includes("room") || normalized.includes("bed"))
    return artwork.bedroom;
  return null;
}

export type ApprovalActivityItem = {
  activityId: Id<"choreReviews">;
  childId: Id<"children">;
  childDisplayName: string;
  choreTitle: string;
  choreKind: "personal" | "claimable";
  valueSek: number;
  approvedAt: number;
};

function actorName(item: ApprovalActivityItem, viewerChildId?: Id<"children">) {
  return viewerChildId === item.childId ? "You" : item.childDisplayName;
}

function localDateKey(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

function formatApprovedAt(timestamp: number, timezone: string) {
  try {
    const isToday =
      localDateKey(timestamp, timezone) === localDateKey(Date.now(), timezone);
    const time = new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
    if (isToday) return `Today, ${time}`;
    const weekday = new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date(timestamp));
    return `${weekday}, ${time}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function ActivityCard({
  item,
  timezone,
  viewerChildId,
}: {
  item: ApprovalActivityItem;
  timezone: string;
  viewerChildId?: Id<"children">;
}) {
  const mine = item.childId === viewerChildId;
  const artworkSource = artworkForTitle(item.choreTitle);
  return (
    <View className="flex-row">
      <View className="w-5 items-center">
        <View className="mt-[47px] h-3 w-3 rounded-full bg-action" />
        <View className="w-0.5 flex-1 bg-actionSoftStrong" />
      </View>
      <Surface className="mb-2 ml-2 min-h-[100px] flex-1 flex-row items-center p-2.5">
        {artworkSource ? (
          <Image
            source={artworkSource}
            className="h-[84px] w-[84px] rounded-control bg-[#F7EDDF]"
            contentFit="contain"
            accessible={false}
          />
        ) : (
          <View className="h-[84px] w-[84px] items-center justify-center rounded-control bg-rewardSoft">
            <DirectionCIcon
              name={item.choreKind === "claimable" ? "star" : "chores"}
              color={DirectionC.color.greenDeep}
              size={42}
            />
          </View>
        )}
        <View className="ml-3 flex-1">
          <AppText
            className="text-[17px] font-extrabold leading-[20px]"
            numberOfLines={2}
          >
            {mine ? "You" : item.childDisplayName} completed{`\n`}
            {item.choreTitle}
          </AppText>
          <AppText variant="caption" color="ink-muted" className="mt-1">
            {item.choreKind === "claimable"
              ? "Claimable chore"
              : "Personal chore"}{" "}
            · {formatApprovedAt(item.approvedAt, timezone)}
          </AppText>
        </View>
        <View className="rounded-control bg-actionSoft px-2 py-2">
          <AppText
            className="text-[18px] font-extrabold leading-[22px]"
            color="action"
          >
            +{item.valueSek} kr
          </AppText>
        </View>
      </Surface>
    </View>
  );
}

export function ApprovalActivitySurface({
  items,
  timezone,
  viewerChildId,
  showHistory,
  historyHeader,
  onOpenChores,
  celebrationStyle = "child",
  privacyCopy = "Each chore reward is shared.\nEveryone’s balance stays private.",
  emptyTitle = "No wins here yet",
  emptyBody = "When someone’s chore is approved, the celebration will show up here.",
  emptyActionLabel = "See your chores",
  initialCelebrationItem,
}: {
  items: ApprovalActivityItem[];
  timezone: string;
  viewerChildId?: Id<"children">;
  showHistory: boolean;
  historyHeader?: ReactNode;
  onOpenChores?: () => void;
  celebrationStyle?: "child" | "parent";
  privacyCopy?: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  initialCelebrationItem?: ApprovalActivityItem;
}) {
  const celebrationImage =
    celebrationStyle === "parent"
      ? parentCelebrationArtwork
      : celebrationArtwork;
  const [celebration, setCelebration] = useState<ApprovalActivityItem | null>(
    initialCelebrationItem ?? null,
  );
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const seenLatestKey = useRef<string | null | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const latest = items[0] ?? null;
    const latestKey = latest
      ? `${latest.activityId}:${latest.approvedAt}`
      : null;

    if (seenLatestKey.current === undefined) {
      seenLatestKey.current = latestKey;
      return;
    }

    if (!latest || latestKey === seenLatestKey.current) return;
    seenLatestKey.current = latestKey;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCelebration(latest);
    timeoutRef.current = setTimeout(() => {
      setCelebration(null);
      timeoutRef.current = null;
    }, 6000);
  }, [items]);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    const updateToday = () => setTodayKey(localDateKey(Date.now(), timezone));
    const initialTimer = setTimeout(updateToday, 0);
    const interval = setInterval(updateToday, 60_000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [timezone]);

  if (!showHistory && !celebration) return null;

  const today = items.filter(
    (item) =>
      todayKey !== null && localDateKey(item.approvedAt, timezone) === todayKey,
  );
  const earlier = items.filter(
    (item) =>
      todayKey === null || localDateKey(item.approvedAt, timezone) !== todayKey,
  );

  return (
    <View className="pb-5">
      {celebration ? (
        <Surface
          tone="mint"
          elevated={false}
          className="mt-2 min-h-[112px] flex-row items-center overflow-hidden p-4"
          testID="household-approval-celebration"
        >
          <View className="absolute left-5 top-2 h-3 w-1.5 rotate-[-35deg] rounded-full bg-action" />
          <View className="absolute left-[102px] top-2 h-3 w-1.5 rotate-[28deg] rounded-full bg-reward" />
          <View className="absolute bottom-2 left-3 h-3 w-1.5 rotate-[-38deg] rounded-full bg-reward" />
          <View className="absolute right-5 top-2 h-3 w-1.5 rotate-[-38deg] rounded-full bg-reward" />
          <View className="absolute bottom-2 right-5 h-3 w-1.5 rotate-[38deg] rounded-full bg-action" />
          <Image
            source={celebrationImage}
            className="h-[72px] w-[72px]"
            contentFit="contain"
            accessible={false}
          />
          <View className="ml-2 flex-1">
            <AppText
              variant="cardTitle"
              testID="household-approval-celebration-title"
            >
              Household win!
            </AppText>
            <AppText
              className="mt-0.5 text-[13px] leading-[16px]"
              numberOfLines={2}
            >
              {actorName(celebration, viewerChildId)} completed{" "}
              {celebration.choreTitle}
            </AppText>
            {celebrationStyle === "parent" ? null : (
              <AppText
                className="mt-0.5 text-[14px] font-extrabold leading-[18px]"
                color="action"
              >
                +{celebration.valueSek} kr approved
              </AppText>
            )}
          </View>
          {celebrationStyle === "parent" ? (
            <View className="rounded-control bg-actionSoft px-2 py-2">
              <AppText
                className="text-[16px] font-extrabold leading-[20px]"
                color="action"
              >
                +{celebration.valueSek} kr approved
              </AppText>
            </View>
          ) : null}
        </Surface>
      ) : null}

      {showHistory ? (
        <>
          {historyHeader}
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 flex-row items-center p-3"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSoftStrong">
              <DirectionCIcon
                name="lock"
                color={DirectionC.color.ink}
                size={23}
              />
            </View>
            <AppText variant="caption" className="ml-3 flex-1">
              {privacyCopy}
            </AppText>
          </Surface>

          {items.length === 0 ? (
            <View
              className="flex-1 items-center px-5 pb-8 pt-14"
              testID="household-approval-activity"
            >
              <Image
                source={emptyActivityArtwork}
                className="h-[245px] w-full"
                contentFit="contain"
                accessible={false}
              />
              <AppText variant="sectionTitle" className="mt-6 text-center">
                {emptyTitle}
              </AppText>
              <AppText className="mt-2 text-center">{emptyBody}</AppText>
              {onOpenChores ? (
                <ActionButton
                  className="mt-6 w-[80%]"
                  tone="soft"
                  label={emptyActionLabel}
                  onPress={onOpenChores}
                />
              ) : null}
            </View>
          ) : (
            <View className="mt-4" testID="household-approval-activity">
              {today.length > 0 ? (
                <>
                  <AppText variant="sectionTitle">Today</AppText>
                  <View className="mt-2">
                    {today.map((item) => (
                      <ActivityCard
                        key={item.activityId}
                        item={item}
                        timezone={timezone}
                        viewerChildId={viewerChildId}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              {earlier.length > 0 ? (
                <>
                  <AppText
                    variant="sectionTitle"
                    className={today.length > 0 ? "mt-3" : ""}
                  >
                    Earlier this week
                  </AppText>
                  <View className="mt-2">
                    {earlier.map((item) => (
                      <ActivityCard
                        key={item.activityId}
                        item={item}
                        timezone={timezone}
                        viewerChildId={viewerChildId}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}
