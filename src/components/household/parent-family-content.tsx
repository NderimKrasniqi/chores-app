import { ParentChildAccessContent } from "@/components/child-access/parent-child-access-content";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { AppText, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary } from "./household-card";
import { ParentInviteCard } from "./parent-invite-card";

const familyArtwork = require("../../../assets/images/direction-c/onboarding-family.png");
const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");

function shortTimezone(timezone: string) {
  return timezone.split("/").at(-1)?.replaceAll("_", " ") ?? timezone;
}

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function ChildAccessRow({
  householdId,
  child,
}: {
  householdId: Id<"households">;
  child: HouseholdSummary["children"][number];
}) {
  const devices = useQuery(api.childAccess.listDevicesForChild, {
    childId: child.childId,
  });
  const activeCount = devices?.filter((device) => device.isActive).length ?? 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((current) => !current)}
      >
        <Surface className="min-h-[78px] flex-row items-center px-4 py-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-rewardSoft">
            <AppText variant="cardTitle">
              {child.displayName.charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">{child.displayName}</AppText>
            <View className="mt-1 flex-row items-center">
              <DirectionCIcon
                name="phone"
                color={
                  activeCount > 0
                    ? DirectionC.color.green
                    : DirectionC.color.disabled
                }
                size={19}
              />
              <AppText
                variant="bodySmall"
                color={activeCount > 0 ? "action" : "ink-muted"}
                className="ml-2"
              >
                {devices === undefined
                  ? "Checking devices…"
                  : activeCount > 0
                    ? `${activeCount} active paired ${activeCount === 1 ? "device" : "devices"}`
                    : "No paired devices"}
              </AppText>
            </View>
          </View>
          {activeCount === 0 ? (
            <View className="mr-2 rounded-full bg-actionSoft px-3 py-2">
              <AppText variant="label" color="action">
                Pair device
              </AppText>
            </View>
          ) : null}
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={22}
          />
        </Surface>
      </Pressable>

      {expanded ? (
        <Surface tone="lavender" elevated={false} className="mt-2 p-4">
          <ParentChildAccessContent
            householdId={householdId}
            childId={child.childId}
            childDisplayName={child.displayName}
          />
        </Surface>
      ) : null}
    </View>
  );
}

export function ParentFamilyContent({
  household,
  onOpenSettings,
}: {
  household: HouseholdSummary;
  onOpenSettings: () => void;
}) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <View className="pb-6">
      <Surface
        tone="lavender"
        elevated={false}
        className="mt-5 h-[145px] overflow-hidden p-4"
      >
        <Image
          source={familyArtwork}
          className="absolute -bottom-9 -left-2 h-[190px] w-[210px]"
          contentFit="contain"
          accessible={false}
        />
        <View className="ml-[50%] flex-1 justify-center">
          <AppText variant="sectionTitle">{household.name}</AppText>
          <AppText className="mt-1">
            {household.children.length}{" "}
            {household.children.length === 1 ? "child" : "children"} ·{" "}
            {household.parents.length}{" "}
            {household.parents.length === 1 ? "parent" : "parents"}
          </AppText>
        </View>
      </Surface>

      <AppText variant="sectionTitle" className="mt-5">
        Children
      </AppText>
      <View className="mt-2 gap-3">
        {household.children.map((child) => (
          <ChildAccessRow
            key={child.childId}
            householdId={household.householdId}
            child={child}
          />
        ))}
      </View>

      <AppText variant="sectionTitle" className="mt-5">
        Parents
      </AppText>
      <View className="mt-2 gap-3">
        {household.parents.map((parent) => (
          <Surface
            key={parent.membershipId}
            className="min-h-[78px] flex-row items-center px-4 py-3"
          >
            {parent.isCurrent ? (
              <Image
                source={parentAvatar}
                className="h-14 w-14 rounded-full"
                contentFit="cover"
              />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
                <AppText variant="cardTitle">
                  {parent.displayName.trim().charAt(0).toUpperCase()}
                </AppText>
              </View>
            )}
            <View className="ml-3 flex-1">
              <AppText variant="cardTitle">{parent.displayName}</AppText>
              <AppText variant="bodySmall" className="mt-1">
                {parent.isCurrent ? "You · Equal authority" : "Equal authority"}
              </AppText>
            </View>
          </Surface>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowInvite((current) => !current)}
        className="mt-3 min-h-[78px] flex-row items-center rounded-control bg-actionSoft px-4"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="plus"
            color={DirectionC.color.white}
            size={24}
          />
        </View>
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle" color="action">
            Invite another Parent
          </AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            Parents share the same controls.
          </AppText>
        </View>
        <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={22} />
      </Pressable>

      <Modal
        animationType="slide"
        visible={showInvite}
        onRequestClose={() => setShowInvite(false)}
      >
        <ParentInviteCard
          householdId={household.householdId}
          householdName={household.name}
          onClose={() => setShowInvite(false)}
        />
      </Modal>

      <View className="mt-6 flex-row items-center justify-between">
        <AppText variant="sectionTitle">Household</AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSettings}
          className="min-h-target flex-row items-center px-1"
        >
          <AppText variant="label" color="action">
            Settings
          </AppText>
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.green}
            size={19}
          />
        </Pressable>
      </View>

      <View className="mt-2 flex-row rounded-card bg-surfaceRaised px-2 py-4 shadow-md">
        <View className="flex-1 items-center border-r border-infoSoftStrong px-1">
          <DirectionCIcon name="info" color={DirectionC.color.ink} size={22} />
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Timezone
          </AppText>
          <AppText variant="label" className="mt-1 text-center">
            {shortTimezone(household.timezone)}
          </AppText>
        </View>
        <View className="flex-1 items-center border-r border-infoSoftStrong px-1">
          <DirectionCIcon
            name="calendar"
            color={DirectionC.color.ink}
            size={22}
          />
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Payout
          </AppText>
          <AppText variant="label" className="mt-1">
            {formatWeekday(household.payoutWeekday)}
          </AppText>
        </View>
        <View className="flex-1 items-center px-1">
          <DirectionCIcon
            name="refresh"
            color={DirectionC.color.ink}
            size={22}
          />
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Unclaims
          </AppText>
          <AppText variant="label" className="mt-1">
            {household.weeklyUnclaimAllowance} each
          </AppText>
        </View>
      </View>
    </View>
  );
}
