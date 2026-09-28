import { HomePlanet, Starfield } from "@/components/art";
import { amountFontSize } from "@/lib/amount-size";
import { useHourNow } from "@/lib/use-hour-now";
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
import { userErrorMessage } from "@/lib/errors";

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
        userErrorMessage(error, "Please try again."),
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

        <View
          style={{ paddingBottom: Math.max(insets.bottom - 14, 8) }}
          className="px-4 pt-1"
        >
          <ChildTabBar activeTab={activeTab} onChange={setActiveTab} />
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
      titleAccessory={
        <ProfileButton childName={childName} onPress={onOpenProfile} />
      }
      header={
        <View className="pb-6 pt-2">
          <MoneyCard
            childName={childName}
            balanceSek={balanceSek}
            preview={visualOccurrences !== undefined}
            onOpenMoney={onOpenMoney}
          />
          <RecentPenaltyNotice preview={visualOccurrences !== undefined} />
        </View>
      }
    />
  );
}

const DAY_MS = 86_400_000;

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

/** Counts to `to`, starting from wherever it was showing. */
function useTicker(to: number | undefined) {
  const [shown, setShown] = useState(to);
  // First value: show it straight away (adjust during render, not in an effect).
  if (shown === undefined && to !== undefined) setShown(to);
  useEffect(() => {
    if (to === undefined || shown === undefined || shown === to) return;
    let frame = 0;
    const from = shown;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 700);
      setShown(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    // Let the coin land first.
    const delay = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, 600);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(frame);
    };
    // Only restart when the target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return shown;
}

/**
 * The kid's money, at a glance: the balance on a green planet whose moon
 * climbs toward payday, today's earnings, and when payday is. When money
 * arrives while the screen is open, a coin arcs in and the number ticks up.
 */
function MoneyCard({
  childName,
  balanceSek,
  preview,
  onOpenMoney,
}: {
  childName: string;
  balanceSek: number | undefined;
  preview: boolean;
  onOpenMoney: () => void;
}) {
  const now = useHourNow();
  const money = useQuery(api.payouts.getMine, preview ? "skip" : { now });
  const shown = useTicker(balanceSek);

  // A coin flies in each time the balance goes up while we're watching.
  const [seen, setSeen] = useState(balanceSek);
  const [celebrateKey, setCelebrateKey] = useState(0);
  if (balanceSek !== seen) {
    if (seen !== undefined && balanceSek !== undefined && balanceSek > seen) {
      setCelebrateKey((key) => key + 1);
    }
    setSeen(balanceSek);
  }

  const period = money?.currentPeriod;
  const timezone = period?.timezone ?? "UTC";
  const today = localDateKey(now, timezone);
  const earnedToday = (money?.child.thisPeriodEntries ?? [])
    .filter(
      (entry) =>
        entry.kind === "earning" &&
        localDateKey(entry.createdAt, timezone) === today,
    )
    .reduce((sum, entry) => sum + entry.amountSek, 0);
  const weekProgress = period
    ? (now - period.startAt) / Math.max(1, period.endAt - period.startAt)
    : undefined;
  const daysLeft = period
    ? Math.max(0, Math.ceil((period.endAt - now) / DAY_MS))
    : undefined;
  const payday = period
    ? period.payoutWeekday.charAt(0).toUpperCase() +
      period.payoutWeekday.slice(1)
    : "";
  const paydayLabel =
    daysLeft === undefined
      ? "See payday"
      : daysLeft <= 0
        ? "Payday today!"
        : daysLeft === 1
          ? "Payday tomorrow"
          : `Payday ${payday} · ${daysLeft} days`;

  const value = shown ?? balanceSek;
  const fontSize = amountFontSize(value ?? 0, 34, 4);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${childName}'s money: ${balanceSek ?? "loading"} kronor.${
        earnedToday > 0 ? ` Plus ${earnedToday} today.` : ""
      } ${paydayLabel}. Open money.`}
      onPress={onOpenMoney}
      className="overflow-hidden rounded-large bg-surface"
      style={{ minHeight: PLANET_CARD_HEIGHT }}
      testID="task14-running-balance-card"
    >
      {/* the home planet, half off the card's right edge */}
      <View
        style={{
          position: "absolute",
          right: -PLANET_SIZE * 0.42,
          top: PLANET_CARD_HEIGHT / 2 - PLANET_BOX / 2,
        }}
      >
        <HomePlanet
          size={PLANET_SIZE}
          balance={balanceSek ?? 0}
          weekProgress={weekProgress}
          celebrateKey={celebrateKey}
        />
      </View>
      <View className="px-4 py-3" style={{ maxWidth: "72%" }}>
        <AppText
          className="font-display-medium"
          style={{ fontSize: 15, lineHeight: 19 }}
        >
          Hi, {childName}!
        </AppText>
        <View className="flex-row items-baseline gap-2">
          <AppText
            numberOfLines={1}
            className="font-display"
            style={{
              fontSize,
              lineHeight: fontSize * 1.15,
              color:
                (balanceSek ?? 0) < 0 ? themeColors.pink : themeColors.primary,
            }}
            testID="task14-running-balance-value"
          >
            {value === undefined ? "…" : value}
            <AppText
              className="font-body-heavy"
              style={{ fontSize: 14, color: themeColors.primary }}
            >
              {" "}
              kr
            </AppText>
          </AppText>
          {earnedToday > 0 ? (
            <AppText variant="caption" color="gold" className="font-body-heavy">
              +{earnedToday} today
            </AppText>
          ) : null}
        </View>
        <View className="mt-1 flex-row">
          <View className="flex-row items-center gap-1.5 self-start rounded-full bg-nightRaised px-3 py-1">
            <Icon name="star" color={themeColors.gold} size={12} />
            <AppText variant="caption">{paydayLabel}</AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const PLANET_SIZE = 76;
const PLANET_BOX = PLANET_SIZE * 1.28 + 24;
const PLANET_CARD_HEIGHT = 114;

/** Every tab's top: the title, and your avatar (opens your profile). */
function TabHeader({
  title,
  childName,
  onOpenProfile,
}: {
  title: string;
  childName: string;
  onOpenProfile: () => void;
}) {
  return (
    <View className="flex-row items-center pb-3 pt-2">
      <AppText variant="screenTitle" className="flex-1">
        {title}
      </AppText>
      <ProfileButton childName={childName} onPress={onOpenProfile} />
    </View>
  );
}

function ProfileButton({
  childName,
  onPress,
}: {
  childName: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${childName}'s profile`}
      onPress={onPress}
      hitSlop={6}
      className="h-9 w-9"
    >
      <Avatar
        tone={childAvatarTone(childName)}
        className="h-full w-full rounded-full"
        fallbackLabel={childName}
      />
    </Pressable>
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
  const title =
    tab === "extras" ? "Extras" : tab === "activity" ? "Family" : "Money";

  return (
    <View className="flex-1 px-5">
      <TabHeader
        title={title}
        childName={childName}
        onOpenProfile={onOpenProfile}
      />

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
        {tab === "money" ? <ChildMoneyContent childId={childId} /> : null}
      </ScrollView>
    </View>
  );
}

/**
 * The control deck: a capsule floating above the page, darker than both the
 * sky and the cards so it reads as the app's controls, not another card.
 * The active tab is a lime pill with its name; the rest are icons. No
 * animation on switching — kids flip tabs all day.
 */
function ChildTabBar({
  activeTab,
  onChange,
}: {
  activeTab: ChildTab;
  onChange: (tab: ChildTab) => void;
}) {
  return (
    <View
      className="flex-row overflow-hidden rounded-full p-1.5"
      style={{
        backgroundColor: themeColors.night,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        shadowColor: "#000",
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.32)",
        }}
      />
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
            className="min-h-[50px] flex-row items-center justify-center gap-1.5 rounded-full"
            style={{
              flexGrow: selected ? 1.6 : 1,
              flexBasis: 0,
              backgroundColor: selected ? themeColors.primary : "transparent",
            }}
          >
            <Icon
              name={icon}
              color={selected ? themeColors.night : themeColors.inkMuted}
              size={21}
            />
            {selected ? (
              <AppText className="font-body-heavy text-[14px] text-night">
                {tab.label}
              </AppText>
            ) : null}
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
