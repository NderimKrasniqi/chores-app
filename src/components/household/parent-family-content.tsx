import { Scene } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText, Surface } from "@/design-system";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary } from "./household-card";
import { ParentInviteCard } from "./parent-invite-card";

const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");
const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

function shortTimezone(timezone: string) {
  return timezone.split("/").at(-1)?.replaceAll("_", " ") ?? timezone;
}

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function ChildAccessRow({
  child,
  onOpen,
  visualDeviceCount,
}: {
  child: HouseholdSummary["children"][number];
  onOpen: () => void;
  visualDeviceCount?: number;
}) {
  const devices = useQuery(
    api.childAccess.listDevicesForChild,
    visualDeviceCount === undefined ? { childId: child.childId } : "skip",
  );
  const activeCount =
    visualDeviceCount ??
    devices?.filter((device) => device.isActive).length ??
    0;
  const deviceStatusLoaded =
    visualDeviceCount !== undefined || devices !== undefined;

  return (
    <Pressable accessibilityRole="button" onPress={onOpen}>
      <Surface className="h-[64px] min-h-[64px] flex-row items-center px-3 py-0">
        <Avatar
          source={childAvatar(child.displayName)}
          tone={childAvatarTone(child.displayName)}
          className="h-16 w-16"
          fallbackLabel={child.displayName}
        />
        <View className="ml-4 flex-1">
          <AppText variant="cardTitle">{child.displayName}</AppText>
          <View className="mt-1 flex-row items-center">
            <Icon
              name="phone"
              color={
                activeCount > 0 ? themeColors.action : themeColors.disabledInk
              }
              size={19}
            />
            <AppText
              variant="bodySmall"
              color={activeCount > 0 ? "action" : "ink-muted"}
              className="ml-2"
            >
              {!deviceStatusLoaded
                ? "Checking devices…"
                : activeCount > 0
                  ? `${activeCount} active paired ${activeCount === 1 ? "device" : "devices"}`
                  : "No paired devices"}
            </AppText>
          </View>
        </View>
        {deviceStatusLoaded && activeCount === 0 ? (
          <View className="mr-2 rounded-full bg-actionSoft px-3 py-2">
            <AppText variant="label" color="action">
              Pair device
            </AppText>
          </View>
        ) : null}
        <Icon name="chevron" color={themeColors.ink} size={22} />
      </Surface>
    </Pressable>
  );
}

export function ParentFamilyContent({
  household,
  onOpenSettings,
  onOpenChildAccess,
  visualDeviceCounts,
}: {
  household: HouseholdSummary;
  onOpenSettings: () => void;
  onOpenChildAccess: (childId: Id<"children">) => void;
  visualDeviceCounts?: Partial<Record<string, number>>;
}) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <View className="pb-6">
      <Surface
        tone="lavender"
        elevated={false}
        className="mt-2 h-[124px] overflow-hidden p-3"
      >
        <Scene name="family" size={180} />
        <View className="ml-[52%] flex-1 -translate-y-2 translate-x-2 justify-center">
          <AppText
            variant="sectionTitle"
            style={{ fontSize: 21, lineHeight: 25 }}
            numberOfLines={1}
          >
            {household.name}
          </AppText>
          <AppText className="mt-1" style={{ fontSize: 17, lineHeight: 22 }}>
            {household.children.length}{" "}
            {household.children.length === 1 ? "child" : "children"} ·{" "}
            {household.parents.length}{" "}
            {household.parents.length === 1 ? "parent" : "parents"}
          </AppText>
        </View>
      </Surface>

      <AppText
        variant="sectionTitle"
        className="ml-1 mt-2"
        style={{ fontSize: 19, lineHeight: 24 }}
      >
        Children
      </AppText>
      <View className="mt-3 gap-2">
        {household.children.map((child) => (
          <ChildAccessRow
            key={child.childId}
            child={child}
            onOpen={() => onOpenChildAccess(child.childId)}
            visualDeviceCount={visualDeviceCounts?.[child.childId]}
          />
        ))}
      </View>

      <AppText
        variant="sectionTitle"
        className="ml-1 mt-2"
        style={{ fontSize: 19, lineHeight: 24 }}
      >
        Parents
      </AppText>
      <View className="mt-2 gap-2">
        {household.parents.map((parent) => (
          <Surface
            key={parent.membershipId}
            className="h-[64px] min-h-[64px] flex-row items-center px-3 py-0"
          >
            {parent.isCurrent ? (
              <Avatar
                source={parentAvatar}
                tone="parent"
                className="h-16 w-16"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-infoSoftStrong">
                <AppText variant="cardTitle">
                  {parent.displayName.trim().charAt(0).toUpperCase()}
                </AppText>
              </View>
            )}
            <View className="ml-4 flex-1">
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
        className="mt-2 min-h-[62px] flex-row items-center rounded-control bg-actionSoft px-3"
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-action">
          <Icon name="personPlus" color={themeColors.onAction} size={24} />
        </View>
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle" color="action">
            Invite another parent
          </AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            Parents share the same controls.
          </AppText>
        </View>
        <Icon name="chevron" color={themeColors.ink} size={22} />
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

      <View className="mt-3 flex-row items-center justify-between">
        <AppText
          variant="sectionTitle"
          className="ml-1"
          style={{ fontSize: 19, lineHeight: 24 }}
        >
          Household
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSettings}
          className="min-h-target flex-row items-center px-1"
        >
          <AppText variant="label" color="action">
            Settings
          </AppText>
          <Icon name="chevron" color={themeColors.action} size={19} />
        </Pressable>
      </View>

      <View className="mt-1 flex-row px-2 py-2">
        <View className="flex-1 items-center border-r border-infoSoftStrong px-1">
          <Icon name="globe" color={themeColors.ink} size={22} />
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Timezone
          </AppText>
          <AppText variant="label" className="mt-1 text-center">
            {shortTimezone(household.timezone)}
          </AppText>
        </View>
        <View className="flex-1 items-center border-r border-infoSoftStrong px-1">
          <Icon name="calendar" color={themeColors.ink} size={22} />
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Payout
          </AppText>
          <AppText variant="label" className="mt-1">
            {formatWeekday(household.payoutWeekday)}
          </AppText>
        </View>
        <View className="flex-1 items-center px-1">
          <Icon name="refresh" color={themeColors.ink} size={22} />
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
