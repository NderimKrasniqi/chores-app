import { ChildHouseholdActivity } from "@/components/activity/child-household-activity";
import { ClaimableChoresCard } from "@/components/chores/claimable-chores-card";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { AppText } from "@/design-system";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
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
};

type ChildTab = "home" | "extras" | "activity" | "money";

const tabs: { key: ChildTab; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "extras", label: "Extras" },
  { key: "activity", label: "Activity" },
  { key: "money", label: "Money" },
];

const avatar = require("../../../assets/images/direction-c/alex-avatar.png");
const extrasArtwork = require("../../../assets/images/direction-c/extras-unlocked.png");

export function ChildHomeScreen({ access }: ChildHomeScreenProps) {
  const { activateParentStorage } = useAuthRuntime();
  const balance = useQuery(api.runningBalances.getMine);
  const [activeTab, setActiveTab] = useState<ChildTab>("home");
  const [profileOpen, setProfileOpen] = useState(false);

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
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />

      {activeTab === "home" ? (
        <HomeTab
          childName={access.childDisplayName}
          balanceSek={balance?.balanceSek}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenMoney={() => setActiveTab("money")}
          onOpenExtras={() => setActiveTab("extras")}
        />
      ) : (
        <ExistingFeatureTab
          tab={activeTab}
          childId={access.childId}
          childName={access.childDisplayName}
          householdName={access.householdName}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenHome={() => setActiveTab("home")}
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
}: {
  childName: string;
  balanceSek: number | undefined;
  onOpenProfile: () => void;
  onOpenMoney: () => void;
  onOpenExtras: () => void;
}) {
  return (
    <View className="flex-1 px-5 pt-3">
      <View className="min-h-[82px] flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${childName}'s profile actions`}
          onPress={onOpenProfile}
          className="h-avatar-hero w-avatar-hero overflow-hidden rounded-full bg-[#F4E3CC]"
        >
          <Image
            source={avatar}
            className="h-avatar-hero w-avatar-hero"
            contentFit="cover"
          />
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
        className="mt-3.5 min-h-[116px] flex-row items-center rounded-large bg-actionSoft px-3.5"
        testID="task14-running-balance-card"
      >
        <View className="h-[70px] w-[70px] items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="money"
            color={DirectionC.color.white}
            size={34}
          />
        </View>

        <View className="ml-3.5 flex-1">
          <AppText className="text-base font-semibold">Running balance</AppText>
          <AppText
            className="mt-0.5 text-[35px] font-black leading-10"
            testID="task14-running-balance-value"
          >
            {balanceSek === undefined ? "…" : `${balanceSek} kr`}
          </AppText>
        </View>

        <View className="mr-2 min-h-[104px] w-[92px] rotate-[5deg] items-center justify-center rounded-[5px] bg-[#FFE7BF] px-2 py-2 shadow-md">
          <AppText className="text-center text-[13px] font-bold italic leading-[15px] text-[#20122F]">
            Real effort{`\n`}brings real{`\n`}opportunities
          </AppText>
          <AppText className="text-[21px] leading-[22px] text-[#20122F]">
            ♡
          </AppText>
        </View>

        <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={24} />
      </Pressable>

      <AppText variant="sectionTitle" className="mb-2.5 mt-4">
        Your chores
      </AppText>
      <ChildHomeChoreList />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open Extras"
        onPress={onOpenExtras}
        className="mb-2.5 mt-2.5 h-28 flex-row items-center overflow-hidden rounded-large bg-infoSoft pr-3"
      >
        <Image
          source={extrasArtwork}
          className="-ml-1.5 h-28 w-[150px]"
          contentFit="contain"
          accessible={false}
        />
        <AppText className="flex-1 text-base font-bold leading-[21px]">
          Extras open when your{`\n`}Unlock Chore is approved.
        </AppText>
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
}: {
  tab: Exclude<ChildTab, "home">;
  childId: Id<"children">;
  childName: string;
  householdName: string;
  onOpenProfile: () => void;
  onOpenHome: () => void;
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
            className="h-avatar-hero w-avatar-hero overflow-hidden rounded-full bg-[#F4E3CC]"
          >
            <Image
              source={avatar}
              className="h-avatar-hero w-avatar-hero"
              contentFit="cover"
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
            className="h-avatar-hero w-avatar-hero overflow-hidden rounded-full bg-[#F4E3CC]"
          >
            <Image
              source={avatar}
              className="h-avatar-hero w-avatar-hero"
              contentFit="cover"
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {tab === "extras" ? <ClaimableChoresCard /> : null}
        {tab === "activity" ? (
          <ChildHouseholdActivity
            viewerChildId={childId}
            onOpenChores={onOpenHome}
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
    <View className="min-h-bottom-navigation flex-row border-t border-line bg-surface px-1.5 pb-3 pt-2 shadow-md">
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
