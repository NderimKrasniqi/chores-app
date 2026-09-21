import { ChildHouseholdActivity } from "@/components/activity/child-household-activity";
import type { ApprovalActivityItem } from "@/components/activity/approval-activity";
import { ClaimableChoresCard } from "@/components/chores/claimable-chores-card";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import {
  childAvatarTone,
  DirectionCAvatar,
} from "@/components/ui/direction-c-avatar";
import { DirectionC } from "@/constants/direction-c";
import { AppText } from "@/design-system";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useQuery } from "convex/react";
import { AppImage as Image } from "@/components/ui/app-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChildHomeChoreList } from "./child-home-chore-list";
import { ChildMoneyContent } from "./child-money-content";
import { ChildProfileScreen } from "./child-profile-screen";

type ChildHomeScreenProps = {
  access: {
    accessGrantId: Id<"childDeviceAccessGrants">;
    householdId: Id<"households">;
    householdName: string;
    childId: Id<"children">;
    childDisplayName: string;
    grantedAt: number;
  };
  visualFixture?: {
    initialTab?: ChildTab;
    balanceSek?: number;
    activity?: {
      items: ApprovalActivityItem[];
      timezone: string;
      initialCelebrationItem?: ApprovalActivityItem;
    };
  };
};

type ChildTab = "home" | "extras" | "activity" | "money";

const tabs: { key: ChildTab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "extras", label: "Extras" },
  { key: "activity", label: "Activity" },
  { key: "money", label: "Money" },
];

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const extrasArtwork = require("../../../assets/images/direction-c/extras-unlocked.png");
const balanceNoteArtwork = require("../../../assets/images/direction-c/running-balance-note.png");

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

export function ChildHomeScreen({
  access,
  visualFixture,
}: ChildHomeScreenProps) {
  const { activateParentStorage } = useAuthRuntime();
  const queriedBalance = useQuery(
    api.runningBalances.getMine,
    visualFixture ? "skip" : {},
  );
  const balance = visualFixture
    ? { balanceSek: visualFixture.balanceSek ?? 0 }
    : queriedBalance;
  const [activeTab, setActiveTab] = useState<ChildTab>(
    visualFixture?.initialTab ?? "home",
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingChoreId, setPendingChoreId] =
    useState<Id<"choreOccurrences"> | null>(null);

  async function handleLockAndSwitch() {
    try {
      await setChildExplicitlyLocked(access.childId, true);
      activateParentStorage();
    } catch (error) {
      Alert.alert(
        "Could not lock profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />

      {activeTab === "home" ? (
        <HomeTab
          childName={access.childDisplayName}
          balanceSek={balance?.balanceSek}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenMoney={() => setActiveTab("money")}
          onOpenExtras={() => setActiveTab("extras")}
          initialOccurrenceId={pendingChoreId}
          onInitialOccurrenceHandled={() => setPendingChoreId(null)}
        />
      ) : (
        <ExistingFeatureTab
          tab={activeTab}
          childId={access.childId}
          childName={access.childDisplayName}
          householdName={access.householdName}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenHome={() => setActiveTab("home")}
          onOpenChore={(occurrenceId) => {
            setPendingChoreId(occurrenceId);
            setActiveTab("home");
          }}
          activityVisualFixture={visualFixture?.activity}
        />
      )}

      <ChildTabBar activeTab={activeTab} onChange={setActiveTab} />

      <Modal
        visible={profileOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileOpen(false)}
      >
        <ChildProfileScreen
          childName={access.childDisplayName}
          householdName={access.householdName}
          onClose={() => setProfileOpen(false)}
          onLockAndSwitch={handleLockAndSwitch}
        />
      </Modal>
    </SafeAreaView>
  );
}

function HomeTab({
  childName,
  balanceSek,
  onOpenProfile,
  onOpenMoney,
  onOpenExtras,
  initialOccurrenceId,
  onInitialOccurrenceHandled,
}: {
  childName: string;
  balanceSek: number | undefined;
  onOpenProfile: () => void;
  onOpenMoney: () => void;
  onOpenExtras: () => void;
  initialOccurrenceId: Id<"choreOccurrences"> | null;
  onInitialOccurrenceHandled: () => void;
}) {
  return (
    <View className="flex-1 px-5 pt-3">
      <View className="min-h-[82px] flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${childName}'s profile actions`}
          onPress={onOpenProfile}
          className="relative h-avatar-hero w-avatar-hero"
        >
          <DirectionCAvatar
            source={childAvatar(childName)}
            tone={childAvatarTone(childName)}
            className="h-full w-full"
            fallbackLabel={childName}
          />
          <View className="absolute bottom-[-1px] right-[-1px] h-8 w-8 items-center justify-center rounded-full bg-surfaceRaised shadow-md">
            <DirectionCIcon
              name="chevronDown"
              color={DirectionC.color.ink}
              size={17}
            />
          </View>
        </Pressable>

        <View className="ml-3.5 flex-1">
          <AppText variant="screenTitle" numberOfLines={1}>
            Hi, {childName}
          </AppText>
          <AppText className="mt-0.5 text-[19px] leading-6">
            Here’s what’s on today.
          </AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open running balance"
        onPress={onOpenMoney}
        className="relative mt-2.5 h-[104px] shrink-0 flex-row items-center rounded-large bg-actionSoft px-3.5"
        testID="task14-running-balance-card"
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="money"
            color={DirectionC.color.white}
            size={34}
          />
        </View>

        <View className="ml-3.5 flex-1 pr-[118px]">
          <AppText className="text-base font-semibold">Running balance</AppText>
          <AppText
            variant="screenTitle"
            className="mt-0.5"
            testID="task14-running-balance-value"
          >
            {balanceSek === undefined ? "…" : `${balanceSek} kr`}
          </AppText>
        </View>

        <Image
          source={balanceNoteArtwork}
          className="absolute -top-4 right-6 h-[148px] w-[140px]"
          contentFit="contain"
          accessible={false}
        />

        <View className="absolute right-2.5">
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={24}
          />
        </View>
      </Pressable>

      <AppText variant="sectionTitle" className="mb-2 mt-3">
        Your chores
      </AppText>
      <ChildHomeChoreList
        initialOccurrenceId={initialOccurrenceId}
        onInitialOccurrenceHandled={onInitialOccurrenceHandled}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Extras"
        onPress={onOpenExtras}
        className="mb-2 mt-2 h-24 shrink-0 flex-row items-center overflow-hidden rounded-large bg-infoSoft"
      >
        <View className="h-24 w-[76px] overflow-hidden">
          <Image
            source={extrasArtwork}
            className="absolute -left-8 h-24 w-[204px]"
            contentFit="contain"
            accessible={false}
          />
        </View>
        <AppText variant="label" className="flex-1 px-2 text-center font-bold">
          Extras open when your{`\n`}Unlock Chore is approved.
        </AppText>
        <View className="h-24 w-[76px] overflow-hidden">
          <Image
            source={extrasArtwork}
            className="absolute -right-1 h-24 w-[204px]"
            contentFit="contain"
            accessible={false}
          />
        </View>
      </Pressable>
    </View>
  );
}

function ExistingFeatureTab({
  tab,
  childId,
  childName,
  householdName,
  onOpenProfile,
  onOpenHome,
  onOpenChore,
  activityVisualFixture,
}: {
  tab: Exclude<ChildTab, "home">;
  childId: Id<"children">;
  childName: string;
  householdName: string;
  onOpenProfile: () => void;
  onOpenHome: () => void;
  onOpenChore: (occurrenceId: Id<"choreOccurrences">) => void;
  activityVisualFixture?: {
    items: ApprovalActivityItem[];
    timezone: string;
    initialCelebrationItem?: ApprovalActivityItem;
  };
}) {
  const title =
    tab === "extras" ? "Extras" : tab === "activity" ? "Activity" : "Money";
  const subtitle =
    tab === "extras"
      ? "Choose one extra chore to earn more."
      : tab === "activity"
        ? `Wins from ${householdName}`
        : "Your balance, your progress.";
  const avatarFirst = tab !== "extras";

  return (
    <View className="flex-1 px-5 pt-3">
      <View className="min-h-[82px] flex-row items-center">
        {avatarFirst ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${childName}'s profile`}
            onPress={onOpenProfile}
            className="h-avatar-hero w-avatar-hero"
          >
            <DirectionCAvatar
              source={childAvatar(childName)}
              tone={childAvatarTone(childName)}
              className="h-full w-full"
              fallbackLabel={childName}
            />
          </Pressable>
        ) : null}

        <View className={`${avatarFirst ? "ml-4" : ""} flex-1`}>
          <AppText variant="screenTitle">{title}</AppText>
          <AppText className="mt-0.5" numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>

        {!avatarFirst ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${childName}'s profile`}
            onPress={onOpenProfile}
            className="h-avatar-hero w-avatar-hero"
          >
            <DirectionCAvatar
              source={childAvatar(childName)}
              tone={childAvatarTone(childName)}
              className="h-full w-full"
              fallbackLabel={childName}
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {tab === "extras" ? (
          <ClaimableChoresCard onOpenChore={onOpenChore} />
        ) : null}
        {tab === "activity" ? (
          <ChildHouseholdActivity
            viewerChildId={childId}
            onOpenChores={onOpenHome}
            visualFixture={activityVisualFixture}
          />
        ) : null}
        {tab === "money" ? <ChildMoneyContent /> : null}
      </ScrollView>
    </View>
  );
}

function ChildTabBar({
  activeTab,
  onChange,
}: {
  activeTab: ChildTab;
  onChange: (tab: ChildTab) => void;
}) {
  return (
    <View className="min-h-bottom-navigation flex-row border-t border-line bg-surface px-1.5 pt-2 shadow-md">
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            className="min-h-[54px] flex-1 items-center justify-center"
          >
            <DirectionCIcon
              name={tab.key}
              color={
                selected ? DirectionC.color.green : DirectionC.color.inkMuted
              }
              size={25}
            />
            <AppText
              variant="caption"
              color={selected ? "action" : "ink-muted"}
              className={`mt-0.5 ${selected ? "font-black" : ""}`}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
