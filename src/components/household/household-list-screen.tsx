import { ParentChoresContent } from "@/components/chores/parent-chores-content";
import { ParentReviewsContent } from "@/components/chores/parent-reviews-content";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { AppText, Surface } from "@/design-system";
import { authClient } from "@/lib/auth/client";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { onNotificationIntent } from "@/lib/notification-intent";
import { ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
  HouseholdSwitcherScreen,
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
  | "main"
  | "account"
  | "switcher"
  | "settings"
  | "activity"
  | "childAccess"
  | "kid"
  | "help";

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
  family: { title: "Family", subtitle: "People, access, and household." },
};

export function HouseholdListScreen({
  parentName,
  parentEmail,
  households,
}: HouseholdListScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<ParentSection>("home");
  const [route, setRoute] = useState<ParentRoute>("main");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<
    HouseholdSummary["householdId"]
  >(households[0].householdId);
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

  const household = useMemo(
    () =>
      households.find((item) => item.householdId === selectedHouseholdId) ??
      households[0],
    [households, selectedHouseholdId],
  );

  async function handleSignOut() {
    setErrorMessage(null);
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not sign out.",
      );
      setSigningOut(false);
    }
  }

  if (route === "account") {
    return (
      <ParentAccountScreen
        parentName={parentName}
        parentEmail={parentEmail}
        household={household}
        canSwitchHousehold={households.length > 1}
        onBack={() => setRoute("main")}
        onSwitchHousehold={() => setRoute("switcher")}
        onOpenHelp={() => setRoute("help")}
        onSignOut={() => void handleSignOut()}
        signingOut={signingOut}
      />
    );
  }

  if (route === "switcher") {
    return (
      <HouseholdSwitcherScreen
        households={households}
        currentHouseholdId={household.householdId}
        onBack={() => setRoute("account")}
        onSelect={(householdId) => {
          setSelectedHouseholdId(householdId);
          setRoute("main");
        }}
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
              subtitle={sectionCopy[activeSection].subtitle}
              onOpenAccount={() => setRoute("account")}
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
