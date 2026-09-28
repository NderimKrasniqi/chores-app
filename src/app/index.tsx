import { EntryChoiceScreen } from "@/components/auth/entry-choice-screen";
import { ParentAuthScreen } from "@/components/auth/parent-auth-screen";
import { ChildAccessGate } from "@/components/child-access/child-access-gate";
import { ChildNoAccessScreen } from "@/components/child-access/child-no-access-screen";
import { HouseholdListScreen } from "@/components/household/household-list-screen";
import { HouseholdSetupScreen } from "@/components/household/household-setup-screen";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { StarBuddy, Starfield } from "@/components/art";
import { ActionButton, AppText, ThemeScope } from "@/design-system";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { authClient } from "@/lib/auth/client";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { useConvexAuth, useQuery } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { api } from "../../convex/_generated/api";

type EntryMode = "choose" | "parent";

type OnboardingState = "loading" | "required" | "complete";

function isAnonymousUser(user: object) {
  return "isAnonymous" in user && user.isAnonymous === true;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <ThemeScope mode="quest">
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={21} />
        <StarBuddy size={84} mood="hop" />
        <AppText variant="sectionTitle" className="mt-6 text-center">
          Getting things ready
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center font-body-bold">
          {message}
        </AppText>
      </View>
    </ThemeScope>
  );
}

const SLOW_CONNECT_MS = 12_000;

/**
 * A Child login the server hasn't recognised yet. Normally a second or two;
 * if it drags on, offer a way back to the profile list (nothing is deleted).
 */
function ChildConnecting() {
  const { activateParentStorage } = useAuthRuntime();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_CONNECT_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <ThemeScope mode="quest">
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={21} />
        <StarBuddy size={84} mood={slow ? "sleepy" : "hop"} />
        <AppText variant="sectionTitle" className="mt-6 text-center">
          {slow ? "Still connecting…" : "Getting things ready"}
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center font-body-bold">
          {slow
            ? "Check the Wi-Fi. Your profile is safe on this phone."
            : "Connecting your profile…"}
        </AppText>
        {slow ? (
          <ActionButton
            className="mt-6 w-full"
            tone="quiet"
            label="Back to profiles"
            onPress={() => activateParentStorage()}
          />
        ) : null}
      </View>
    </ThemeScope>
  );
}

export default function HomeScreen() {
  const [onboardingState, setOnboardingState] =
    useState<OnboardingState>("loading");

  const [entryMode, setEntryMode] = useState<EntryMode>("choose");

  useEffect(() => {
    let cancelled = false;

    async function loadOnboardingState() {
      try {
        const complete = await hasCompletedOnboarding();

        if (!cancelled) {
          setOnboardingState(complete ? "complete" : "required");
        }
      } catch {
        if (!cancelled) setOnboardingState("required");
      }
    }

    void loadOnboardingState();

    return () => {
      cancelled = true;
    };
  }, []);

  const { data: session, isPending: sessionPending } = authClient.useSession();

  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const hasSession = session?.user !== undefined;

  const anonymousSession = session?.user
    ? isAnonymousUser(session.user)
    : false;

  const households = useQuery(
    api.households.listForCurrentParent,

    isAuthenticated && hasSession && !anonymousSession ? {} : "skip",
  );

  const childAccess = useQuery(
    api.childAccess.getCurrentChildAccess,

    isAuthenticated && hasSession && anonymousSession ? {} : "skip",
  );

  if (onboardingState === "loading" || sessionPending || convexAuthLoading) {
    return <LoadingScreen message="Checking session…" />;
  }

  if (onboardingState === "required") {
    return (
      <OnboardingScreen
        onChooseParent={() => {
          setEntryMode("parent");
          setOnboardingState("complete");
        }}
        onChooseChild={() => {
          setEntryMode("choose");
          setOnboardingState("complete");
        }}
      />
    );
  }

  if (!session?.user) {
    if (entryMode === "parent") {
      return <ParentAuthScreen onBack={() => setEntryMode("choose")} />;
    }

    return <EntryChoiceScreen onChooseParent={() => setEntryMode("parent")} />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen message="Connecting secure session…" />;
  }

  if (anonymousSession) {
    if (childAccess === undefined) {
      return <LoadingScreen message="Checking child access…" />;
    }

    // The login isn't recognised yet (auth settling after a restart):
    // wait — never treat this as "unlinked".
    if (childAccess.status === "unrecognized") {
      return <ChildConnecting />;
    }

    // Everything a Child sees lives in the night-sky quest theme.
    return (
      <ThemeScope mode="quest">
        {childAccess.status === "not_linked" ? (
          <ChildNoAccessScreen />
        ) : (
          <ChildAccessGate access={childAccess} />
        )}
      </ThemeScope>
    );
  }

  if (households === undefined) {
    return <LoadingScreen message="Loading household…" />;
  }

  if (households.length > 0) {
    return (
      <HouseholdListScreen
        parentName={session.user.name}
        parentEmail={session.user.email}
        households={households}
      />
    );
  }

  return <HouseholdSetupScreen />;
}
