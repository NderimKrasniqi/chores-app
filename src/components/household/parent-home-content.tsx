import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { ActiveClaimableClaimsCard } from "@/components/chores/active-claimable-claims-card";
import { DirectionC } from "@/constants/direction-c";
import { AppText, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary } from "./household-card";

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};
const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");

function choreArtwork(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("car") || normalized.includes("wash"))
    return artwork.carWash;
  if (normalized.includes("walk") && normalized.includes("dog"))
    return artwork.dogWalk;
  if (normalized.includes("dog") || normalized.includes("pet"))
    return artwork.dog;
  if (normalized.includes("recycl") || normalized.includes("trash"))
    return artwork.recycling;
  return artwork.bedroom;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDeadline(timestamp: number, timezone: string) {
  try {
    const date = new Date(timestamp);
    const day = new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      weekday: "short",
    }).format(date);
    const time = new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${day}, ${time}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function InitialAvatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <View
      className={`${small ? "h-11 w-11" : "h-14 w-14"} items-center justify-center rounded-full bg-rewardSoft`}
    >
      <AppText variant={small ? "label" : "cardTitle"}>
        {name.trim().charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

export function ParentHomeContent({
  household,
  parentName,
  onOpenReviews,
  onAddChore,
  onOpenSwitcher,
  onOpenActivity,
}: {
  household: HouseholdSummary;
  parentName: string;
  onOpenReviews: () => void;
  onAddChore: () => void;
  onOpenSwitcher: () => void;
  onOpenActivity: () => void;
}) {
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

  const pending = [...(personal ?? []), ...(claimable ?? []), ...(redos ?? [])];
  const waitingNames = [
    ...new Set(pending.map((item) => item.childDisplayName)),
  ];
  const latestActivity = activity?.items[0];

  return (
    <View className="pb-6">
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open household switcher"
          onPress={onOpenSwitcher}
          className="h-[76px] w-[76px] overflow-hidden rounded-full bg-rewardSoft"
        >
          <Image
            source={parentAvatar}
            className="h-full w-full"
            contentFit="cover"
          />
        </Pressable>
        <View className="ml-4 flex-1">
          <AppText variant="sectionTitle">
            {greeting()}, {parentName.split(" ")[0] || "Parent"}
          </AppText>
          <AppText className="mt-1">{household.name}</AppText>
        </View>
      </View>

      {pending.length > 0 ? (
        <Surface
          tone="coral"
          elevated={false}
          className="mt-5 overflow-hidden p-4"
        >
          <View className="flex-row items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-urgency">
              <DirectionCIcon
                name="chores"
                color={DirectionC.color.white}
                size={32}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">
                {pending.length}{" "}
                {pending.length === 1 ? "chore needs" : "chores need"} review
              </AppText>
              <AppText variant="bodySmall" className="mt-1">
                {waitingNames.length > 0
                  ? `${waitingNames.join(" and ")} ${waitingNames.length === 1 ? "is" : "are"} waiting for you.`
                  : "Completed work is waiting for you."}
              </AppText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenReviews}
            className="mt-4 min-h-control flex-row items-center justify-center rounded-control bg-urgency px-5"
          >
            <AppText variant="cardTitle" color="white">
              Review work
            </AppText>
            <View className="absolute right-4">
              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.white}
                size={23}
              />
            </View>
          </Pressable>
        </Surface>
      ) : (
        <Surface
          tone="mint"
          elevated={false}
          className="mt-5 flex-row items-center p-4"
        >
          <View className="h-12 w-12 items-center justify-center rounded-full bg-action">
            <DirectionCIcon
              name="check"
              color={DirectionC.color.white}
              size={25}
            />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="cardTitle">Nothing needs review</AppText>
            <AppText variant="bodySmall" className="mt-1">
              You’re all caught up.
            </AppText>
          </View>
        </Surface>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={onAddChore}
        className="mt-3 min-h-control flex-row items-center rounded-control bg-actionSoft px-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="plus"
            color={DirectionC.color.white}
            size={22}
          />
        </View>
        <AppText variant="cardTitle" color="action" className="ml-3">
          Add chore
        </AppText>
        <View className="ml-auto">
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={22}
          />
        </View>
      </Pressable>

      <AppText variant="sectionTitle" className="mt-5">
        Your children
      </AppText>
      <View className="mt-2 gap-3">
        {household.children.map((child) => {
          const childPayout = payouts?.children.find(
            (item) => item.childId === child.childId,
          );
          const childPendingCount = pending.filter(
            (item) => item.childDisplayName === child.displayName,
          ).length;
          return (
            <Surface
              key={child.childId}
              className="min-h-[78px] flex-row items-center px-4 py-3"
            >
              <InitialAvatar name={child.displayName} />
              <View className="ml-3 flex-1">
                <AppText variant="cardTitle">{child.displayName}</AppText>
                <AppText variant="bodySmall" className="mt-0.5">
                  {childPendingCount > 0
                    ? `${childPendingCount} ${childPendingCount === 1 ? "chore" : "chores"} waiting for review`
                    : "No work waiting for review"}
                </AppText>
              </View>
              {childPayout ? (
                <AppText variant="amount" className="ml-2">
                  {childPayout.runningBalanceSek} kr
                </AppText>
              ) : null}
            </Surface>
          );
        })}
      </View>

      <ActiveClaimableClaimsCard householdId={householdId} />

      {activity !== undefined ? (
        <View>
          <AppText variant="sectionTitle" className="mt-5">
            Recent activity
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open household activity"
            onPress={onOpenActivity}
          >
            <Surface className="mt-2 flex-row items-center p-3">
              {latestActivity ? (
                <Image
                  source={choreArtwork(latestActivity.choreTitle)}
                  className="h-16 w-20 rounded-control bg-infoSoft"
                  contentFit="cover"
                  accessible={false}
                />
              ) : (
                <View className="h-16 w-20 items-center justify-center rounded-control bg-rewardSoft">
                  <DirectionCIcon
                    name="star"
                    color={DirectionC.color.yellow}
                    size={32}
                  />
                </View>
              )}
              <View className="ml-3 flex-1">
                <AppText variant="label">
                  {latestActivity
                    ? `${latestActivity.childDisplayName} completed ${latestActivity.choreTitle}`
                    : "No family wins yet"}
                </AppText>
                <AppText variant="bodySmall" className="mt-1">
                  {latestActivity
                    ? `${latestActivity.valueSek} kr approved`
                    : "Approved chores will appear here."}
                </AppText>
              </View>
              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.ink}
                size={22}
              />
            </Surface>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
