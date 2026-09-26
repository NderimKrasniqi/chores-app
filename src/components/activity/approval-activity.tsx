import { ChoreIcon, StarBuddy } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface } from "@/design-system";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import type { Id } from "../../../convex/_generated/dataModel";

const celebrationVisibilityMs = __DEV__ ? 30_000 : 6_000;
// Shells use different insets; these keep the marker axis on the approved x-coordinate.
const timelineGeometry = {
  parent: { markerOffsetX: -1.25, railLeft: 7.75 },
  child: { markerOffsetX: -8.25, railLeft: 0.75 },
} as const;

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

export function localDateKey(timestamp: number, timezone: string) {
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

export function formatApprovedAt(timestamp: number, timezone: string) {
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
  parentMode,
}: {
  item: ApprovalActivityItem;
  timezone: string;
  viewerChildId?: Id<"children">;
  parentMode: boolean;
}) {
  const mine = item.childId === viewerChildId;
  return (
    <View className="mb-2 flex-row items-center">
      <View className="w-5 items-center justify-center">
        <View
          className="z-10 h-[15px] w-[15px] rounded-full bg-action"
          style={{
            transform: [
              {
                translateX: parentMode
                  ? timelineGeometry.parent.markerOffsetX
                  : timelineGeometry.child.markerOffsetX,
              },
              { translateY: -6 },
            ],
          }}
        />
      </View>
      <Surface
        elevated={false}
        className="min-h-[104px] flex-1 flex-row items-center py-1.5 pl-3 pr-1.5"
      >
        <ChoreIcon title={item.choreTitle} size={parentMode ? 80 : 76} />
        <View className="ml-[18px] flex-1">
          <AppText
            className={
              parentMode
                ? "text-[18px] font-extrabold leading-[22px]"
                : "text-[17px] font-extrabold leading-[20px]"
            }
            numberOfLines={2}
          >
            {mine ? "You" : item.childDisplayName} completed{`\n`}
            {item.choreTitle}
          </AppText>
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-1"
            numberOfLines={parentMode ? 1 : undefined}
            adjustsFontSizeToFit={parentMode}
            minimumFontScale={parentMode ? 0.82 : undefined}
            style={parentMode ? { fontSize: 13, lineHeight: 18 } : undefined}
          >
            {item.choreKind === "claimable"
              ? "Claimable chore"
              : "Personal chore"}{" "}
            · {formatApprovedAt(item.approvedAt, timezone)}
          </AppText>
        </View>
        <View
          className={`rounded-control bg-actionSoft ${parentMode ? "px-3" : "px-2"} py-2`}
        >
          <AppText
            className={
              parentMode
                ? "text-[20px] font-extrabold leading-[24px]"
                : "text-[18px] font-extrabold leading-[22px]"
            }
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
  showCelebration = true,
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
  /** The child shell celebrates approvals itself, full screen. */
  showCelebration?: boolean;
}) {
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

    if (!showCelebration) return;
    if (!latest || latestKey === seenLatestKey.current) return;
    seenLatestKey.current = latestKey;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCelebration(latest);
    timeoutRef.current = setTimeout(() => {
      setCelebration(null);
      timeoutRef.current = null;
    }, celebrationVisibilityMs);
  }, [items, showCelebration]);

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
          className={`flex-row items-center overflow-hidden ${celebrationStyle === "parent" ? "mt-0 min-h-[72px] px-2 py-2" : "mt-2 min-h-[84px] p-3"}`}
          style={
            celebrationStyle === "parent"
              ? { backgroundColor: "#EFFAE4" }
              : undefined
          }
          testID="household-approval-celebration"
        >
          <View className="absolute left-5 top-2 h-3 w-1.5 rotate-[-35deg] rounded-full bg-action" />
          <View
            className={`absolute ${celebrationStyle === "parent" ? "left-[74px]" : "left-[102px]"} top-2 h-3 w-1.5 rotate-[28deg] rounded-full bg-reward`}
          />
          <View className="absolute bottom-2 left-3 h-3 w-1.5 rotate-[-38deg] rounded-full bg-reward" />
          <View className="absolute right-5 top-2 h-3 w-1.5 rotate-[-38deg] rounded-full bg-reward" />
          <View className="absolute bottom-2 right-5 h-3 w-1.5 rotate-[38deg] rounded-full bg-action" />
          <StarBuddy
            size={celebrationStyle === "parent" ? 52 : 60}
            mood="dance"
          />
          <View
            className={`flex-1 ${celebrationStyle === "parent" ? "ml-3" : "ml-[25px]"}`}
          >
            <AppText
              variant="cardTitle"
              style={
                celebrationStyle === "parent"
                  ? { fontSize: 18, lineHeight: 22 }
                  : undefined
              }
              numberOfLines={1}
              adjustsFontSizeToFit={celebrationStyle === "parent"}
              minimumFontScale={
                celebrationStyle === "parent" ? 0.85 : undefined
              }
              testID="household-approval-celebration-title"
            >
              Household win!
            </AppText>
            <AppText
              className={
                celebrationStyle === "parent"
                  ? "mt-0.5 text-[12px] leading-[16px]"
                  : "mt-0.5 text-[13px] leading-[16px]"
              }
              numberOfLines={celebrationStyle === "parent" ? 1 : 2}
              adjustsFontSizeToFit={celebrationStyle === "parent"}
              minimumFontScale={
                celebrationStyle === "parent" ? 0.85 : undefined
              }
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
            <View className="ml-1 shrink-0 rounded-control bg-actionSoft px-2 py-1">
              <AppText
                className="text-[12px] font-extrabold leading-[16px]"
                color="action"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
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
            className={`flex-row items-center px-5 ${celebrationStyle === "parent" ? "mt-5" : "mt-3"}`}
            style={{
              height:
                celebrationStyle === "parent"
                  ? celebration
                    ? 64
                    : 68
                  : celebration
                    ? 68
                    : 64,
            }}
          >
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full">
              <Icon name="info" color={themeColors.ink} size={30} />
            </View>
            <AppText
              className="ml-4 flex-1"
              style={{ fontSize: 15, lineHeight: 21, fontWeight: "500" }}
            >
              {privacyCopy}
            </AppText>
          </Surface>

          {items.length === 0 ? (
            <View
              className={`flex-1 items-center px-5 pb-8 ${celebrationStyle === "parent" ? "pt-[42px]" : "pt-[46px]"}`}
              testID="household-approval-activity"
            >
              <StarBuddy size={120} mood="sleepy" />
              <AppText
                variant="sectionTitle"
                className="mt-6 text-center"
                style={
                  celebrationStyle === "parent"
                    ? { fontSize: 30, lineHeight: 36 }
                    : undefined
                }
              >
                {emptyTitle}
              </AppText>
              <AppText
                className="mt-3 w-[90%] text-center leading-[26px]"
                style={
                  celebrationStyle === "parent"
                    ? { fontSize: 18, lineHeight: 26 }
                    : undefined
                }
              >
                {emptyBody}
              </AppText>
              {onOpenChores ? (
                <ActionButton
                  tone={celebrationStyle === "parent" ? "soft" : "primary"}
                  className={`mt-10 h-[60px] ${celebrationStyle === "parent" ? "w-[90%]" : "w-[77%]"} rounded-full`}
                  labelStyle={
                    celebrationStyle === "parent"
                      ? { color: themeColors.ink }
                      : undefined
                  }
                  style={{
                    backgroundColor:
                      celebrationStyle === "parent" ? "#BAE7C5" : undefined,
                    shadowColor: "#3B2458",
                    shadowOpacity: 0.09,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 4,
                  }}
                  label={emptyActionLabel}
                  onPress={onOpenChores}
                />
              ) : null}
            </View>
          ) : (
            <View
              className={
                celebration
                  ? "mt-1"
                  : celebrationStyle === "parent"
                    ? "mt-[14px]"
                    : "mt-3"
              }
              testID="household-approval-activity"
            >
              {today.length > 0 ? (
                <>
                  <AppText
                    variant="sectionTitle"
                    style={
                      celebrationStyle === "parent"
                        ? { fontSize: 20, lineHeight: 28 }
                        : undefined
                    }
                  >
                    Today
                  </AppText>
                  <View className="relative mt-2">
                    <View
                      pointerEvents="none"
                      className="absolute bottom-2 top-0 w-0.5 rounded-full bg-[#DDE3DD]"
                      style={{
                        left:
                          celebrationStyle === "parent"
                            ? timelineGeometry.parent.railLeft
                            : timelineGeometry.child.railLeft,
                      }}
                    />
                    {today.map((item) => (
                      <ActivityCard
                        key={item.activityId}
                        item={item}
                        timezone={timezone}
                        viewerChildId={viewerChildId}
                        parentMode={celebrationStyle === "parent"}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              {earlier.length > 0 ? (
                <>
                  <AppText
                    variant="sectionTitle"
                    className={
                      today.length > 0
                        ? celebration
                          ? "mt-0"
                          : celebrationStyle === "parent"
                            ? "mt-[13px]"
                            : "mt-[17px]"
                        : ""
                    }
                    style={
                      celebrationStyle === "parent"
                        ? { fontSize: 20, lineHeight: 28 }
                        : undefined
                    }
                  >
                    Earlier this week
                  </AppText>
                  <View className="relative mt-2">
                    <View
                      pointerEvents="none"
                      className="absolute bottom-2 top-0 w-0.5 rounded-full bg-[#DDE3DD]"
                      style={{
                        left:
                          celebrationStyle === "parent"
                            ? timelineGeometry.parent.railLeft
                            : timelineGeometry.child.railLeft,
                      }}
                    />
                    {earlier.map((item) => (
                      <ActivityCard
                        key={item.activityId}
                        item={item}
                        timezone={timezone}
                        viewerChildId={viewerChildId}
                        parentMode={celebrationStyle === "parent"}
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
