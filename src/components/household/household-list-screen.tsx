import { useQuery } from "convex/react";
import { ParentChoresContent } from "@/components/chores/parent-chores-content";
import { ParentReviewsContent } from "@/components/chores/parent-reviews-content";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { AppText, Surface } from "@/design-system";
import { authClient } from "@/lib/auth/client";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { onNotificationIntent } from "@/lib/notification-intent";
import { ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { formatLocalDate } from "@/lib/dates";
import { userErrorMessage } from "@/lib/errors";

import { api } from "../../../convex/_generated/api";
import type { HouseholdSummary } from "./household-types";
import {
  ParentBottomNavigation,
  type ParentSection,
} from "./parent-bottom-navigation";
import { ParentFamilyContent } from "./parent-family-content";
import { ParentHomeContent } from "./parent-home-content";
import { ParentMoneyContent } from "./parent-money-content";
import { ParentKidScreen } from "./parent-kid-screen";
import { ParentScreenHeader } from "./parent-screen-header";
import {
  HouseholdSettingsScreen,
  ParentActivityScreen,
  ParentAccountScreen,
  ParentChildAccessScreen,
} from "./parent-secondary-screens";

type HouseholdListScreenProps = {
  parentName: string;
  parentEmail: string;
  households: HouseholdSummary[];
};

type ParentRoute =
  "main" | "account" | "settings" | "activity" | "childAccess" | "kid" | "help";

const sectionCopy: Record<
  Exclude<ParentSection, "home">,
  { title: string; subtitle: string }
> = {
  chores: { title: "Chores", subtitle: "Plan responsibilities and Extras." },
  reviews: {
    title: "Reviews",
    subtitle: "Check completed work before it earns.",
  },
  money: { title: "Money", subtitle: "Track balances and settle weekly." },
  family: { title: "Family", subtitle: "People, phones and house rules." },
};

export function HouseholdListScreen({
  parentName,
  parentEmail,
  households,
}: HouseholdListScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<ParentSection>("home");
  const [route, setRoute] = useState<ParentRoute>("main");
  const [signingOut, setSigningOut] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<
    HouseholdSummary["children"][number]["childId"] | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // "Something to check" notifications open the review deck.
  useEffect(
    () =>
      onNotificationIntent((intent) => {
        if (intent.eventKind === "submission_review") {
          setActiveSection("reviews");
          setRoute("main");
        }
      }),
    [],
  );

  // A Parent belongs to exactly one household.
  const household = households[0];

  async function handleSignOut() {
    setErrorMessage(null);
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not sign out."));
      setSigningOut(false);
    }
  }

  const liveSubtitle = useLiveSubtitle(activeSection, household);
  // Kept subscribed across tabs so Home's crew balances show instantly
  // instead of "…" each time the parent comes back to it.
  useQuery(api.payouts.getOverview, { householdId: household.householdId });

  if (route === "account") {
    return (
      <ParentAccountScreen
        parentName={parentName}
        parentEmail={parentEmail}
        household={household}
        onBack={() => setRoute("main")}
        onOpenHelp={() => setRoute("help")}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
      />
    );
  }

  if (route === "settings") {
    return (
      <HouseholdSettingsScreen
        household={household}
        onBack={() => setRoute("main")}
      />
    );
  }

  if (route === "activity") {
    return (
      <ParentActivityScreen
        household={household}
        onBack={() => setRoute("main")}
        onAddChore={() => {
          setActiveSection("chores");
          setRoute("main");
        }}
      />
    );
  }

  if (route === "childAccess") {
    const child = household.children.find(
      (item) => item.childId === selectedChildId,
    );
    if (child) {
      return (
        <ParentChildAccessScreen
          householdId={household.householdId}
          timezone={household.timezone}
          child={child}
          onBack={() => setRoute("kid")}
        />
      );
    }
  }

  if (route === "kid") {
    const child = household.children.find(
      (item) => item.childId === selectedChildId,
    );
    if (child) {
      return (
        <ParentKidScreen
          household={household}
          child={child}
          onBack={() => setRoute("main")}
          onOpenPhones={() => setRoute("childAccess")}
          onRemoved={() => {
            setSelectedChildId(null);
            setRoute("main");
          }}
        />
      );
    }
  }

  if (route === "help") {
    return (
      <OnboardingScreen
        reviewMode
        onDone={() => setRoute("account")}
        onChooseParent={() => setRoute("account")}
        onChooseChild={() => setRoute("account")}
      />
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        key={`${household.householdId}-${activeSection}`}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-5 pt-0"
      >
        {activeSection === "home" ? (
          <ParentHomeContent
            household={household}
            parentName={parentName}
            onOpenSwitcher={() => setRoute("account")}
            onOpenReviews={() => setActiveSection("reviews")}
            onAddChore={() => setActiveSection("chores")}
            onOpenActivity={() => setRoute("activity")}
            onOpenMoney={() => setActiveSection("money")}
            onOpenKid={(childId) => {
              setSelectedChildId(childId);
              setRoute("kid");
            }}
          />
        ) : (
          <View>
            <ParentScreenHeader
              title={sectionCopy[activeSection].title}
              subtitle={liveSubtitle ?? sectionCopy[activeSection].subtitle}
              onOpenAccount={() => setRoute("account")}
              parentName={parentName}
            />

            {activeSection === "chores" ? (
              <View className="mt-2">
                <ParentChoresContent
                  householdId={household.householdId}
                  timezone={household.timezone}
                  children={household.children}
                />
              </View>
            ) : null}

            {activeSection === "reviews" ? (
              <View className="mt-2">
                <ParentReviewsContent
                  householdId={household.householdId}
                  householdTimezone={household.timezone}
                />
              </View>
            ) : null}

            {activeSection === "money" ? (
              <View className="mt-2">
                <ParentMoneyContent householdId={household.householdId} />
              </View>
            ) : null}

            {activeSection === "family" ? (
              <ParentFamilyContent
                household={household}
                onOpenSettings={() => setRoute("settings")}
                onOpenChildAccess={(childId) => {
                  setSelectedChildId(childId);
                  setRoute("kid");
                }}
              />
            ) : null}
          </View>
        )}

        {errorMessage ? (
          <Surface tone="coral" elevated={false} className="mt-4 p-3">
            <AppText variant="bodySmall" color="urgency">
              {errorMessage}
            </AppText>
          </Surface>
        ) : null}
      </ScrollView>

      <View className="bg-canvas">
        <ParentBottomNavigation
          householdId={household.householdId}
          activeSection={activeSection}
          onSelect={(section) => {
            setActiveSection(section);
            setRoute("main");
          }}
        />
        <View className="bg-canvas" style={{ height: insets.bottom }} />
      </View>
    </SafeAreaView>
  );
}

/**
 * A live line under each tab's title instead of a generic description.
 * The queries are the same ones the tab content subscribes to, so Convex
 * shares them; tabs that aren't showing skip them.
 */
function useLiveSubtitle(
  section: ParentSection,
  household: HouseholdSummary,
): string | null {
  const definitions = useQuery(
    api.choreDefinitions.listActiveForHousehold,
    section === "chores" ? { householdId: household.householdId } : "skip",
  );
  const reviewArgs =
    section === "reviews" ? { householdId: household.householdId } : "skip";
  const personal = useQuery(api.personalChoreReviews.listPending, reviewArgs);
  const claimable = useQuery(api.claimableChoreReviews.listPending, reviewArgs);
  const redos = useQuery(api.redoChoreReviews.listPending, reviewArgs);
  const money = useQuery(
    api.payouts.getOverview,
    section === "money" ? { householdId: household.householdId } : "skip",
  );

  switch (section) {
    case "chores": {
      if (!definitions) return null;
      const chores = definitions.filter((d) => d.kind === "personal").length;
      const extras = definitions.length - chores;
      return `${chores} ${chores === 1 ? "chore" : "chores"} · ${extras} ${extras === 1 ? "Extra" : "Extras"} on offer`;
    }
    case "reviews": {
      if (!personal || !claimable || !redos) return null;
      const count = personal.length + claimable.length + redos.length;
      return count === 0 ? "All caught up" : `${count} to check`;
    }
    case "money": {
      if (!money) return null;
      // The open week can still close on an old payday after a change,
      // so this follows the open period, not the configured day.
      const period = money.currentPeriod;
      const day =
        period.payoutWeekday.charAt(0).toUpperCase() +
        period.payoutWeekday.slice(1);
      return `Payday ${day} · ${formatLocalDate(period.endLocalDate)}`;
    }
    default:
      return null;
  }
}
