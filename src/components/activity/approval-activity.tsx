import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import type { Id } from "../../../convex/_generated/dataModel";

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};

function artworkForTitle(title: string) {
  const normalized = title.toLowerCase();
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
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
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
        <View className="mt-[54px] h-3 w-3 rounded-full bg-action" />
        <View className="w-0.5 flex-1 bg-actionSoftStrong" />
      </View>
      <Surface className="mb-3 ml-2 min-h-[118px] flex-1 flex-row items-center p-2.5">
        {artworkSource ? (
          <Image
            source={artworkSource}
            className="h-24 w-24 rounded-control bg-[#F7EDDF]"
            contentFit="contain"
            accessible={false}
          />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-control bg-rewardSoft">
            <DirectionCIcon
              name={item.choreKind === "claimable" ? "star" : "chores"}
              color={DirectionC.color.greenDeep}
              size={42}
            />
          </View>
        )}
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle" numberOfLines={2}>
            {mine ? "You" : item.childDisplayName} completed{`\n`}
            {item.choreTitle}
          </AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-2">
            {item.choreKind === "claimable"
              ? "Claimable chore"
              : "Personal chore"}{" "}
            · {formatApprovedAt(item.approvedAt, timezone)}
          </AppText>
        </View>
        <View className="rounded-control bg-actionSoft px-3 py-2">
          <AppText variant="cardTitle" color="action">
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
  onOpenChores,
  privacyCopy = "Each chore reward is shared.\nEveryone’s balance stays private.",
  emptyTitle = "No wins here yet",
  emptyBody = "When someone’s chore is approved, the celebration will show up here.",
  emptyActionLabel = "See your chores",
}: {
  items: ApprovalActivityItem[];
  timezone: string;
  viewerChildId?: Id<"children">;
  showHistory: boolean;
  onOpenChores?: () => void;
  privacyCopy?: string;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
}) {
  const [celebration, setCelebration] = useState<ApprovalActivityItem | null>(
    null,
  );
  const seenLatestId = useRef<Id<"choreReviews"> | null | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const latest = items[0] ?? null;
    const latestId = latest?.activityId ?? null;

    if (seenLatestId.current === undefined) {
      seenLatestId.current = latestId;
      return;
    }

    if (!latest || latestId === seenLatestId.current) return;
    seenLatestId.current = latestId;
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

  if (!showHistory && !celebration) return null;

  const todayKey = localDateKey(Date.now(), timezone);
  const today = items.filter(
    (item) => localDateKey(item.approvedAt, timezone) === todayKey,
  );
  const earlier = items.filter(
    (item) => localDateKey(item.approvedAt, timezone) !== todayKey,
  );

  return (
    <View className="pb-5">
      {celebration ? (
        <Surface
          tone="mint"
          elevated={false}
          className="mt-3 flex-row items-center p-4"
          testID="household-approval-celebration"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-action">
            <DirectionCIcon
              name="star"
              color={DirectionC.color.white}
              size={29}
            />
          </View>
          <View className="ml-3 flex-1">
            <AppText
              variant="cardTitle"
              testID="household-approval-celebration-title"
            >
              Household win!
            </AppText>
            <AppText className="mt-1">
              {actorName(celebration, viewerChildId)} completed{" "}
              {celebration.choreTitle}
            </AppText>
            <AppText variant="cardTitle" color="action" className="mt-1">
              +{celebration.valueSek} kr approved
            </AppText>
          </View>
        </Surface>
      ) : null}

      {showHistory ? (
        <>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 flex-row items-center p-4"
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoftStrong">
              <DirectionCIcon
                name="key"
                color={DirectionC.color.ink}
                size={25}
              />
            </View>
            <AppText className="ml-3 flex-1">{privacyCopy}</AppText>
          </Surface>

          {items.length === 0 ? (
            <View
              className="flex-1 items-center px-5 pb-8 pt-14"
              testID="household-approval-activity"
            >
              <View className="h-48 w-56 items-center justify-center rounded-large bg-rewardSoft">
                <DirectionCIcon
                  name="star"
                  color={DirectionC.color.yellow}
                  size={82}
                />
              </View>
              <AppText variant="sectionTitle" className="mt-6 text-center">
                {emptyTitle}
              </AppText>
              <AppText className="mt-2 text-center">{emptyBody}</AppText>
              {onOpenChores ? (
                <ActionButton
                  className="mt-6 w-[80%]"
                  label={emptyActionLabel}
                  onPress={onOpenChores}
                />
              ) : null}
            </View>
          ) : (
            <View className="mt-5" testID="household-approval-activity">
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
