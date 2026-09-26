import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import {
  childAvatarTone,
  DirectionCAvatar,
} from "@/components/ui/direction-c-avatar";
import { ActiveClaimableClaimsCard } from "@/components/chores/active-claimable-claims-card";
import { DirectionC } from "@/constants/direction-c";
import { AppText, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { AppImage as Image } from "@/components/ui/app-image";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary } from "./household-card";

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dishwasher: require("../../../assets/images/direction-c/chore-dishwasher.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  laundry: require("../../../assets/images/direction-c/chore-laundry.png"),
  plants: require("../../../assets/images/direction-c/chore-plants.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
  table: require("../../../assets/images/direction-c/chore-table.png"),
};
const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");
const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const reviewClipboard = require("../../../assets/images/direction-c/review-clipboard.png");

function choreArtwork(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dishwasher") || normalized.includes("dishes"))
    return artwork.dishwasher;
  if (normalized.includes("table")) return artwork.table;
  if (normalized.includes("laundry") || normalized.includes("fold"))
    return artwork.laundry;
  if (normalized.includes("plant") || normalized.includes("water"))
    return artwork.plants;
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

function greeting(timezone?: string) {
  let hour = new Date().getHours();

  try {
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        ...(timezone ? { timeZone: timezone } : {}),
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
  } catch {
    // Keep the device-local fallback for an invalid or unavailable timezone.
  }

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function InitialAvatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const source =
    name.trim().toLowerCase() === "alex"
      ? alexAvatar
      : name.trim().toLowerCase() === "maya"
        ? mayaAvatar
        : null;

  if (source) {
    return (
      <DirectionCAvatar
        source={source}
        tone={childAvatarTone(name)}
        className={small ? "h-11 w-11" : "h-14 w-14"}
      />
    );
  }

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
  onOpenMoney,
}: {
  household: HouseholdSummary;
  parentName: string;
  onOpenReviews: () => void;
  onAddChore: () => void;
  onOpenSwitcher: () => void;
  onOpenActivity: () => void;
  onOpenMoney: () => void;
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
  const activeClaims = useQuery(api.claimableChores.listActiveForParent, {
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
          accessibilityLabel="Open Parent account"
          onPress={onOpenSwitcher}
          className="h-[76px] w-[76px]"
        >
          <DirectionCAvatar
            source={parentAvatar}
            tone="parent"
            className="h-full w-full"
          />
        </Pressable>
        <View className="ml-4 flex-1">
          <AppText
            variant="display"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {greeting(household.timezone)},{" "}
            {parentName.split(" ")[0] || "Parent"}
          </AppText>
          <AppText className="mt-1">{household.name}</AppText>
        </View>
      </View>

      {pending.length > 0 ? (
        <Surface
          tone="coral"
          elevated={false}
          className="mt-3 overflow-hidden p-2"
        >
          <View className="flex-row items-center">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-urgency">
              <Image
                source={reviewClipboard}
                className="h-[72px] w-[72px]"
                contentFit="contain"
                accessible={false}
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
            className="mt-2 min-h-[40px] flex-row items-center justify-center rounded-control bg-urgency px-5"
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
          className="mt-3 flex-row items-center p-4"
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
        className="mt-2 min-h-[44px] flex-row items-center rounded-control bg-actionSoft px-4"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="plus"
            color={DirectionC.color.white}
            size={25}
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

      <AppText variant="sectionTitle" className="mt-3">
        Your children
      </AppText>
      <View className="mt-2 gap-2.5">
        {household.children.map((child) => {
          const childPayout = payouts?.children.find(
            (item) => item.childId === child.childId,
          );
          const childPendingCount = pending.filter(
            (item) => item.childDisplayName === child.displayName,
          ).length;
          const childActiveCount =
            activeClaims?.filter((item) => item.childId === child.childId)
              .length ?? 0;
          const childTodayCount = childPendingCount + childActiveCount;
          return (
            <Pressable
              key={child.childId}
              accessibilityRole="button"
              accessibilityLabel={`Open Money to view ${child.displayName}'s balance`}
              onPress={onOpenMoney}
            >
              <Surface className="min-h-[70px] flex-row items-center px-4 py-2">
                <InitialAvatar name={child.displayName} />
                <View className="ml-3 flex-1">
                  <AppText variant="cardTitle">{child.displayName}</AppText>
                  <AppText
                    variant="bodySmall"
                    className="mt-0.5"
                    numberOfLines={1}
                  >
                    {childPendingCount > 0
                      ? childActiveCount > 0
                        ? `${childTodayCount} chores today`
                        : `${childPendingCount} ${childPendingCount === 1 ? "chore" : "chores"} waiting for review`
                      : childActiveCount > 0
                        ? `${childActiveCount} ${childActiveCount === 1 ? "chore" : "chores"} today`
                        : "No work waiting for review"}
                  </AppText>
                </View>
                {childPayout ? (
                  <AppText
                    variant="amount"
                    className="ml-2"
                    style={{ fontSize: 24, lineHeight: 28, fontWeight: "900" }}
                    numberOfLines={1}
                  >
                    {childPayout.runningBalanceSek} kr
                  </AppText>
                ) : null}
                <DirectionCIcon
                  name="chevron"
                  color={DirectionC.color.ink}
                  size={22}
                />
              </Surface>
            </Pressable>
          );
        })}
      </View>

      <ActiveClaimableClaimsCard householdId={householdId} homeVariant />

      {activity !== undefined ? (
        <View>
          <AppText variant="sectionTitle" className="mt-3">
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
