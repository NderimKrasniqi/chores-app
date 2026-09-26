import { BalanceOrb, Starfield } from "@/components/art";
import { ChildApprovalCelebrations } from "@/components/activity/approval-celebration";
import { ChildHouseholdActivity } from "@/components/activity/child-household-activity";
import type { ApprovalActivityItem } from "@/components/activity/approval-activity";
import { ClaimableChoresCard } from "@/components/chores/claimable-chores-card";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { questTokens as themeColors } from "@/design-system/theme";
import { AppText, ThemeScope } from "@/design-system";
import { setChildExplicitlyLocked } from "@/lib/child-access/unlock-policy";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { onNotificationIntent } from "@/lib/notification-intent";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ChildHomeChoreList,
  type ChildHomeChoreOccurrence,
  type ChildHomeRedo,
} from "./child-home-chore-list";
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
    homeOccurrences?: ChildHomeChoreOccurrence[];
    homeRedos?: ChildHomeRedo[];
    activity?: {
      loading?: boolean;
      items: ApprovalActivityItem[];
      timezone: string;
    };
    celebration?: {
      items: ApprovalActivityItem[];
      watermark?: { at: number; ids: string[] };
      toast?: ApprovalActivityItem;
    };
  };
};

type ChildTab = "home" | "extras" | "activity" | "money";

const tabs: { key: ChildTab; label: string }[] = [
  { key: "home", label: "Quests" },
  { key: "extras", label: "Extras" },
  { key: "activity", label: "Family" },
  { key: "money", label: "Money" },
];

export function ChildHomeScreen({
  access,
  visualFixture,
}: ChildHomeScreenProps) {
  const { activateParentStorage } = useAuthRuntime();
  const insets = useSafeAreaInsets();
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

  // A tapped notification opens the thing it was about.
  useEffect(
    () =>
      onNotificationIntent((intent) => {
        const extras =
          intent.claimId !== undefined ||
          intent.eventKind === "claimable_available" ||
          intent.eventKind === "pre_lock_reminder";
        if (extras) {
          setActiveTab("extras");
          return;
        }
        if (intent.occurrenceId) {
          setPendingChoreId(intent.occurrenceId as Id<"choreOccurrences">);
        }
        setActiveTab("home");
      }),
    [],
  );

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
    <ThemeScope mode="quest">
      <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
        <StatusBar style="light" />
        <Starfield seed={activeTab.length * 7} />

        {activeTab === "home" ? (
          <HomeTab
            childName={access.childDisplayName}
            balanceSek={balance?.balanceSek}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenMoney={() => setActiveTab("money")}
            onOpenExtras={() => setActiveTab("extras")}
            initialOccurrenceId={pendingChoreId}
            onInitialOccurrenceHandled={() => setPendingChoreId(null)}
            visualOccurrences={visualFixture?.homeOccurrences}
            visualRedos={visualFixture?.homeRedos}
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

        <View>
          <ChildTabBar activeTab={activeTab} onChange={setActiveTab} />
          <View className="bg-surface" style={{ height: insets.bottom }} />
        </View>

        <ChildApprovalCelebrations
          key={access.childId}
          viewerChildId={access.childId}
          visualFixture={
            visualFixture
              ? (visualFixture.celebration ?? { items: [] })
              : undefined
          }
        />

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
    </ThemeScope>
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
  visualOccurrences,
  visualRedos,
}: {
  childName: string;
  balanceSek: number | undefined;
  onOpenProfile: () => void;
  onOpenMoney: () => void;
  onOpenExtras: () => void;
  initialOccurrenceId: Id<"choreOccurrences"> | null;
  onInitialOccurrenceHandled: () => void;
  visualOccurrences?: ChildHomeChoreOccurrence[];
  visualRedos?: ChildHomeRedo[];
}) {
  return (
    <ChildHomeChoreList
      initialOccurrenceId={initialOccurrenceId}
      onInitialOccurrenceHandled={onInitialOccurrenceHandled}
      visualOccurrences={visualOccurrences}
      visualRedos={visualRedos}
      onOpenExtras={onOpenExtras}
      header={
        <View className="pb-6">
          <View className="min-h-[60px] flex-row items-center justify-between pt-2">
            <View className="flex-1">
              <AppText variant="label" color="ink-muted">
                Hi, {childName}!
              </AppText>
              <AppText variant="screenTitle" numberOfLines={1}>
                {childName}’s quests
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${childName}'s profile actions`}
              onPress={onOpenProfile}
            >
              <Avatar
                tone={childAvatarTone(childName)}
                className="h-[52px] w-[52px] rounded-[18px]"
                fallbackLabel={childName}
              />
            </Pressable>
          </View>

          <RecentPenaltyNotice preview={visualOccurrences !== undefined} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Running balance ${balanceSek ?? "loading"} kronor. Open money.`}
            onPress={onOpenMoney}
            className="mt-4 flex-row items-center gap-4 rounded-large bg-surface px-4 py-3"
            testID="task14-running-balance-card"
          >
            <BalanceOrb size={92}>
              <AppText
                className="font-display text-[30px] leading-[33px] text-night"
                testID="task14-running-balance-value"
              >
                {balanceSek === undefined ? "…" : balanceSek}
              </AppText>
              <AppText className="font-body-heavy text-[13px] leading-[15px] text-night">
                kr
              </AppText>
            </BalanceOrb>
            <View className="flex-1">
              <AppText variant="label" color="ink-muted">
                Running balance
              </AppText>
              <AppText className="font-display-medium text-[20px] leading-[25px]">
                Your money jar
              </AppText>
              <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-nightRaised px-3 py-1">
                <AppText variant="caption">See payday</AppText>
                <Icon name="chevron" color={themeColors.ink} size={12} />
              </View>
            </View>
          </Pressable>
        </View>
      }
    />
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
    loading?: boolean;
    items: ApprovalActivityItem[];
    timezone: string;
  };
}) {
  const extrasResult = useQuery(
    api.claimableChores.listMine,
    tab === "extras" ? {} : "skip",
  );
  const title =
    tab === "extras" ? "Extras" : tab === "activity" ? "Family" : "My money";
  const subtitle =
    tab === "extras"
      ? extrasResult?.gate.canAccessClaimables === false
        ? "Extra chores unlock after approval."
        : "Choose one extra chore to earn more."
      : tab === "activity"
        ? `Cheers from ${householdName}`
        : "Your balance, your progress.";
  const avatarFirst = tab !== "extras";

  return (
    <View className="flex-1 px-5">
      <View className="min-h-[76px] flex-row items-center pt-2">
        {avatarFirst ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${childName}'s profile`}
            onPress={onOpenProfile}
            className="h-[52px] w-[52px]"
          >
            <Avatar
              tone={childAvatarTone(childName)}
              className="h-full w-full rounded-[18px]"
              fallbackLabel={childName}
            />
          </Pressable>
        ) : null}

        <View className={`${avatarFirst ? "ml-4" : ""} flex-1`}>
          <AppText variant="screenTitle">{title}</AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-0.5 font-body-bold"
            numberOfLines={1}
          >
            {subtitle}
          </AppText>
        </View>

        {!avatarFirst ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${childName}'s profile`}
            onPress={onOpenProfile}
            className="h-[52px] w-[52px]"
          >
            <Avatar
              tone={childAvatarTone(childName)}
              className="h-full w-full rounded-[18px]"
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
    <View className="min-h-[74px] flex-row rounded-t-[28px] bg-surface px-2 pt-2.5">
      {tabs.map((tab) => {
        const selected = activeTab === tab.key;
        const icon =
          tab.key === "home"
            ? "home"
            : tab.key === "extras"
              ? "extras"
              : tab.key === "activity"
                ? "family"
                : "money";

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            className="min-h-[58px] flex-1 items-center"
          >
            <View
              className={`h-8 w-12 items-center justify-center rounded-full ${selected ? "bg-primary" : ""}`}
            >
              <Icon
                name={icon}
                color={selected ? themeColors.night : themeColors.inkMuted}
                size={selected ? 20 : 22}
              />
            </View>
            <AppText
              variant="caption"
              color={selected ? "primary" : "ink-muted"}
              className={`mt-1 ${selected ? "font-body-heavy" : ""}`}
            >
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const PENALTY_NOTICE_MS = 48 * 60 * 60 * 1000;

/**
 * If a locked Extra wasn't finished in the last two days, say so plainly on
 * Home — otherwise the only trace is a row in Money.
 */
function RecentPenaltyNotice({ preview }: { preview: boolean }) {
  const [now] = useState(() => Date.now());
  const money = useQuery(api.payouts.getMine, preview ? "skip" : { now });
  const penalty = money?.child.thisPeriodEntries.find(
    (entry) =>
      entry.kind === "penalty" && now - entry.createdAt < PENALTY_NOTICE_MS,
  );
  if (!penalty) return null;
  return (
    <View
      accessible
      accessibilityLabel={`${penalty.choreTitle ?? "An Extra"} wasn't finished in time. ${Math.abs(penalty.amountSek)} kronor came off your balance.`}
      className="mt-4 flex-row items-center gap-3 rounded-large bg-urgencySoft px-4 py-3"
    >
      <Icon name="missed" color={themeColors.pink} size={22} />
      <View className="flex-1">
        <AppText className="font-body-heavy text-[15px]">
          {penalty.choreTitle ?? "An Extra"} wasn’t finished in time
        </AppText>
        <AppText variant="caption" color="ink-muted">
          −{Math.abs(penalty.amountSek)} kr from your balance. Locked Extras
          count — pick ones you can finish.
        </AppText>
      </View>
    </View>
  );
}
