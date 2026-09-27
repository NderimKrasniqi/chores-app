import type { ApprovalActivityItem } from "@/components/activity/approval-activity";
import { ChildHomeScreen } from "@/components/child-access/child-home-screen";
import {
  ChildHomeChoreList,
  type ChildHomeChoreOccurrence,
  type ChildHomeRedo,
} from "@/components/child-access/child-home-chore-list";
import {
  ChildMoneyView,
  type ChildMoneyOverview,
} from "@/components/child-access/child-money-content";
import { ChildNoAccessScreen } from "@/components/child-access/child-no-access-screen";
import { ChildJoinScreen } from "@/components/child-access/child-join-screen";
import { ChildPinSetupScreen } from "@/components/child-access/child-pin-setup-screen";
import { ChildPinUnlockScreen } from "@/components/child-access/child-pin-unlock-screen";
import { ChildProfileScreen } from "@/components/child-access/child-profile-screen";
import { ChildQrScannerScreen } from "@/components/child-access/child-qr-scanner-screen";
import {
  ActiveClaimableClaimsView,
  type ActiveClaimableClaimViewModel,
} from "@/components/chores/active-claimable-claims-view";
import {
  ClaimableChoresView,
  type ClaimableChoresViewModel,
} from "@/components/chores/claimable-chores-view";
import {
  ParentChoresContent,
  type ParentChoresVisualForm,
} from "@/components/chores/parent-chores-content";
import { ParentReviewsContent } from "@/components/chores/parent-reviews-content";
import { ParentBottomNavigation } from "@/components/household/parent-bottom-navigation";
import { ParentFamilyContent } from "@/components/household/parent-family-content";
import { ParentInviteCard } from "@/components/household/parent-invite-card";
import { NotificationPrimer } from "@/components/notifications/push-registration-bridge";
import { ParentScreenHeader } from "@/components/household/parent-screen-header";
import { RecoveryPayoutDetail } from "@/components/household/parent-money-content";
import {
  HouseholdSettingsScreen,
  ParentAccountScreen,
  ParentChildAccessScreen,
} from "@/components/household/parent-secondary-screens";
import { HouseholdSetupScreen } from "@/components/household/household-setup-screen";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import type { HouseholdSummary } from "@/components/household/household-types";
import { ThemeScope, AppText } from "@/design-system";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Id } from "../../convex/_generated/dataModel";

const householdId = "visual-household" as Id<"households">;
const alexId = "visual-alex" as Id<"children">;
const mayaId = "visual-maya" as Id<"children">;
const membershipId = "visual-membership" as Id<"householdMembers">;
const occurrenceId = "visual-occurrence" as Id<"choreOccurrences">;
const definitionId = "visual-definition" as Id<"choreDefinitions">;
const claimId = "visual-claim" as Id<"choreClaims">;
const reviewId = "visual-review" as Id<"choreReviews">;
const accessGrantId = "visual-device" as Id<"childDeviceAccessGrants">;
const revokedAccessGrantId =
  "visual-revoked-device" as Id<"childDeviceAccessGrants">;
const pairingCredentialId = "visual-pairing" as Id<"childPairingCredentials">;

const noop = () => {};

const household: HouseholdSummary = {
  householdId,
  name: "Krasniqi Family",
  timezone: "Europe/Stockholm",
  payoutWeekday: "friday",
  weeklyUnclaimAllowance: 2,
  parents: [{ membershipId, displayName: "Sam", isCurrent: true }],
  children: [
    { childId: alexId, displayName: "Alex" },
    { childId: mayaId, displayName: "Maya" },
  ],
};

function atLocalTime(dayOffset: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.getTime();
}

function atReferencePairingTime(hour: number, minute: number) {
  return new Date(
    `2026-09-12T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`,
  ).getTime();
}

const choreOccurrenceBase: ChildHomeChoreOccurrence = {
  occurrenceId,
  choreDefinitionId: definitionId,
  title: "Clean your room",
  description: "Make the bed, put clothes away, and clear the floor.",
  valueSek: 30,
  scheduledLocalDate: "2026-09-21",
  timezone: "Europe/Stockholm",
  availabilityStartsAt: atLocalTime(0, 7),
  deadlineAt: atLocalTime(0, 18),
  state: "approved",
  isUnlockChore: true,
  canSubmit: false,
};

const choreRedo: ChildHomeRedo = {
  occurrenceId,
  deadlineAt: atLocalTime(1, 17),
  canSubmitRedo: true,
};

const activeClaimBase: ActiveClaimableClaimViewModel = {
  claimId,
  occurrenceId,
  childId: alexId,
  claimedByDisplayName: "Alex",
  claimState: "claimed",
  claimedAt: atLocalTime(0, 15, 5),
  title: "Walk the dog",
  description: "Use the blue leash and walk around the park.",
  valueSek: 25,
  scheduledLocalDate: "2026-09-21",
  timezone: "Europe/Stockholm",
  deadlineAt: atLocalTime(0, 20),
};

const activityItems: ApprovalActivityItem[] = [
  {
    activityId: reviewId,
    childId: mayaId,
    childDisplayName: "Maya",
    choreTitle: "Set the table",
    choreKind: "personal",
    valueSek: 15,
    approvedAt: atLocalTime(0, 8, 10),
  },
  {
    activityId: "visual-review-2" as Id<"choreReviews">,
    childId: alexId,
    childDisplayName: "Alex",
    choreTitle: "Walk the dog",
    choreKind: "claimable",
    valueSek: 20,
    approvedAt: atLocalTime(0, 7, 42),
  },
  {
    activityId: "visual-review-3" as Id<"choreReviews">,
    childId: alexId,
    childDisplayName: "Alex",
    choreTitle: "Load dishwasher",
    choreKind: "personal",
    valueSek: 25,
    approvedAt: atLocalTime(-1, 18, 26),
  },
];

const familyWeekItems: ApprovalActivityItem[] = [
  ...activityItems,
  ...(
    [
      ["Maya", mayaId, "Water the plants", "personal", 10, -1, 17, 5],
      ["Alex", alexId, "Clean your room", "personal", 30, -2, 16, 30],
      ["Maya", mayaId, "Wash the car", "claimable", 50, -2, 12, 15],
      ["Maya", mayaId, "Fold laundry", "personal", 20, -3, 18, 40],
      ["Alex", alexId, "Take out recycling", "claimable", 15, -4, 9, 0],
    ] as const
  ).map(([name, childId, title, kind, value, day, hour, minute], i) => ({
    activityId: `visual-week-${i}` as Id<"choreReviews">,
    childId,
    childDisplayName: name,
    choreTitle: title,
    choreKind: kind,
    valueSek: value,
    approvedAt: atLocalTime(day, hour, minute),
  })),
];

const personalForm: ParentChoresVisualForm = {
  kind: "personal",
  title: "Clean your room",
  description: "Put clothes away and clear the floor.",
  valueSek: "30",
  personalChildId: alexId,
  recurrenceKind: "daily",
  startDate: "2026-09-14",
  interval: "1",
  availabilityTime: "",
  deadlineTime: "18:00",
  deadlineOffset: "0",
  isUnlockChore: true,
};

const claimableForm: ParentChoresVisualForm = {
  kind: "claimable",
  title: "Walk the dog",
  description: "Use the blue leash and walk around the park.",
  valueSek: "25",
  restrictEligibility: false,
  recurrenceKind: "one_off",
  scheduledDate: "2026-09-14",
  availabilityTime: "15:00",
  deadlineTime: "20:00",
  deadlineOffset: "0",
};

const pairingCode = {
  pairingCredentialId,
  qrToken: "visual-preview-pairing-token",
  manualCode: "K7M4PQ",
  expiresAt: atReferencePairingTime(9, 56),
};

function ChildChoreDetail({
  state,
}: {
  state:
    | "available"
    | "scheduled"
    | "submitted"
    | "approved"
    | "missed"
    | "redo_required";
}) {
  const occurrence = {
    ...choreOccurrenceBase,
    state,
    canSubmit: state === "available",
    availabilityStartsAt:
      state === "scheduled"
        ? atLocalTime(1, 8)
        : choreOccurrenceBase.availabilityStartsAt,
    deadlineAt:
      state === "scheduled"
        ? atLocalTime(1, 18)
        : choreOccurrenceBase.deadlineAt,
  };
  return (
    <View className="flex-1 bg-canvas">
      <ChildHomeChoreList
        initialOccurrenceId={occurrenceId}
        visualOccurrences={[occurrence]}
        visualRedos={state === "redo_required" ? [choreRedo] : []}
      />
    </View>
  );
}

function ParentFamilyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-3 pb-4 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <ParentScreenHeader
          title="Family"
          subtitle="People, phones and house rules."
          onOpenAccount={noop}
          parentName="Sam"
          compact
        />
        <ParentFamilyContent
          household={household}
          onOpenSettings={noop}
          onOpenChildAccess={noop}
          visualDeviceCounts={{ [alexId]: 1, [mayaId]: 0 }}
        />
      </ScrollView>
      <View className="bg-canvas">
        <ParentBottomNavigation
          householdId={householdId}
          activeSection="family"
          onSelect={noop}
          visualReviewCount={1}
        />
        <View className="bg-surfaceRaised" style={{ height: insets.bottom }} />
      </View>
    </SafeAreaView>
  );
}

function ChoreEditor({ form }: { form: ParentChoresVisualForm }) {
  return (
    <View className="flex-1 bg-canvas px-5 pt-5">
      <ParentChoresContent
        householdId={householdId}
        children={household.children}
        visualFixture={{ definitions: [], form }}
      />
    </View>
  );
}

function ParentClaim({
  claim,
  initialVisualState,
}: {
  claim: ActiveClaimableClaimViewModel;
  initialVisualState: "detail" | "confirmation" | "unavailable";
}) {
  return (
    <View className="flex-1 bg-canvas px-5 pt-5">
      <ActiveClaimableClaimsView
        claims={[claim]}
        onCancel={async () => {}}
        initialVisualState={initialVisualState}
      />
    </View>
  );
}

function ChildMoneyFixture({
  state,
}: {
  state: "week" | "pending" | "paid" | "negative" | "first-week";
}) {
  const now = new Date().getTime();
  const day = 86_400_000;
  const localDate = (offset: number) =>
    new Date(now + offset * day).toISOString().slice(0, 10);
  // Balance = last week's close (still unpaid when pending) + this week.
  const balance =
    state === "negative"
      ? -55
      : state === "pending"
        ? 175
        : state === "first-week"
          ? 0
          : 55;
  const payoutId = "visual-payout" as Id<"payouts">;
  const payoutPeriodId = "visual-payout-period" as Id<"payoutPeriods">;
  const latestPayout: ChildMoneyOverview["child"]["latestPayout"] =
    state === "first-week"
      ? null
      : {
          payoutId,
          payoutPeriodId,
          periodEndLocalDate: localDate(-3),
          balanceAtCloseSek: state === "negative" ? -60 : 120,
          amountDueSek: state === "negative" ? 0 : 120,
          pendingOutcomeCount: state === "pending" ? 1 : 0,
          status:
            state === "pending"
              ? "pending"
              : state === "negative"
                ? "no_payment"
                : "paid",
          paidAt: state === "paid" || state === "week" ? now - 2 * day : null,
        };
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;
  const payoutWeekday = weekdays[new Date(now + 3 * day).getUTCDay()];
  const overview: ChildMoneyOverview = {
    configuredPayoutWeekday: payoutWeekday,
    currentPeriod: {
      startLocalDate: localDate(-3),
      startAt: now - 3 * day,
      endLocalDate: localDate(3),
      endAt: now + 3 * day,
      timezone: household.timezone,
      payoutWeekday,
    },
    child: {
      displayName: "Alex",
      runningBalanceSek: balance,
      latestPayout,
      thisPeriodEntries:
        state === "first-week"
          ? []
          : [
              {
                kind: "earning",
                amountSek: 30,
                createdAt: now - 3 * 3_600_000,
                choreTitle: "Clean your room",
              },
              ...(state === "negative"
                ? [
                    {
                      kind: "penalty" as const,
                      amountSek: -50,
                      createdAt: now - day,
                      choreTitle: "Wash the car",
                    },
                  ]
                : []),
              {
                kind: "earning",
                amountSek: 25,
                createdAt: now - 2 * day,
                choreTitle: "Walk the dog",
              },
            ],
    },
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <AppText variant="screenTitle" className="mt-4">
          Money
        </AppText>
        <ChildMoneyView overview={overview} now={now} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChildClaimFixture({
  state,
}: {
  state: "active" | "submitted" | "unclaim" | "locked" | "redo" | "lock-sheet";
}) {
  // Relative to now so the unclaim window is always open in the preview.
  const now = new Date().getTime();
  const deadlineAt = now + 3 * 3_600_000;
  const outOfKeys = state === "locked" || state === "lock-sheet";
  const commitment = {
    lockAt: deadlineAt - 2 * 3_600_000,
    isTimeLocked: false,
    hasUnclaimAllowance: !outOfKeys,
    remainingUnclaims: outOfKeys ? 0 : 1,
    canUnclaim: state === "active" || state === "unclaim",
    isImmediatelyLocked: state === "lock-sheet",
    lockReason: outOfKeys ? ("allowance_exhausted" as const) : null,
  };
  const result: ClaimableChoresViewModel = {
    gate: {
      canAccessClaimables: true,
      currentUnlockOccurrence: {
        occurrenceId,
        title: "Clean your room",
        state: "approved",
        scheduledLocalDate: "2026-09-23",
        availabilityStartsAt: atLocalTime(0, 7),
        deadlineAt: atLocalTime(0, 18),
      },
    },
    unclaimAllowance: {
      allowance: 2,
      usedUnclaims: outOfKeys ? 2 : 1,
      remainingUnclaims: outOfKeys ? 0 : 1,
      payoutWeek: {
        startLocalDate: "2026-09-21",
        endLocalDate: "2026-09-27",
        startAt: atLocalTime(-2, 0),
        endAt: atLocalTime(4, 23, 59),
      },
    },
    claimableOccurrences:
      state === "lock-sheet"
        ? [
            {
              occurrenceId,
              title: "Wash the car",
              description:
                "Wash the outside of the car and put the bucket away.",
              valueSek: 50,
              timezone: household.timezone,
              deadlineAt,
              commitment,
            },
          ]
        : [],
    claimedOccurrences:
      state === "lock-sheet"
        ? []
        : [
            {
              claimId,
              occurrenceId,
              childId: alexId,
              claimedByDisplayName: "Alex",
              claimState:
                state === "redo"
                  ? "redo_required"
                  : state === "submitted"
                    ? "submitted"
                    : "claimed",
              claimedAt: now - 20 * 60_000,
              title: "Wash the car",
              description:
                "Wash the outside of the car and put the bucket away.",
              valueSek: 50,
              scheduledLocalDate: "2026-09-23",
              timezone: household.timezone,
              deadlineAt,
              isMine: true,
              commitment,
            },
          ],
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <AppText variant="screenTitle" className="mt-4">
          Extras
        </AppText>
        <AppText>Choose one extra chore to earn more.</AppText>
        <ClaimableChoresView
          result={result}
          onClaim={async () => {}}
          onUnclaim={async () => {}}
          onSubmit={async () => {}}
          redos={
            state === "redo"
              ? [
                  {
                    occurrenceId,
                    deadlineAt: atLocalTime(1, 17),
                    canSubmitRedo: true,
                  },
                ]
              : []
          }
          onSubmitRedo={async () => {}}
          initialVisualState={state}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ParentChildAccess({
  variant,
}: {
  variant:
    | "empty"
    | "code"
    | "code-confirmation"
    | "expired"
    | "regenerated"
    | "device"
    | "device-confirmation"
    | "revoked-device";
}) {
  const activeDevice = {
    accessGrantId,
    createdAt: atLocalTime(0, 9, 40),
    isActive: true,
  };
  const revokedDevice = {
    accessGrantId: revokedAccessGrantId,
    createdAt: atLocalTime(-2, 9, 40),
    revokedAt: atLocalTime(-1, 10, 20),
    isActive: false,
  };
  const generated =
    variant === "empty"
      ? undefined
      : variant === "expired"
        ? { ...pairingCode, expiresAt: atReferencePairingTime(9, 56) }
        : variant === "regenerated"
          ? {
              ...pairingCode,
              qrToken: "visual-preview-regenerated-pairing-token",
              manualCode: "R8T6HL",
              expiresAt: atReferencePairingTime(10, 12),
            }
          : pairingCode;
  const devices =
    variant === "device" || variant === "device-confirmation"
      ? [activeDevice]
      : variant === "revoked-device"
        ? [revokedDevice]
        : [];

  return (
    <ParentChildAccessScreen
      key={variant}
      householdId={householdId}
      timezone={household.timezone}
      child={household.children[1]}
      onBack={noop}
      visualFixture={{
        devices,
        generated,
        generationCount:
          variant === "empty" ? 0 : variant === "regenerated" ? 2 : 1,
        visualNow:
          variant === "expired"
            ? atReferencePairingTime(10, 0)
            : variant === "regenerated"
              ? atReferencePairingTime(10, 0)
              : atReferencePairingTime(9, 40),
        confirmCodeRevoke: variant === "code-confirmation",
        confirmDeviceId:
          variant === "device-confirmation" ? accessGrantId : undefined,
        showRevoked: false,
      }}
    />
  );
}

function ParentInvitation({
  variant,
}: {
  variant:
    | "empty"
    | "code"
    | "unavailable"
    | "regenerated"
    | "confirmation"
    | "revoked";
}) {
  const hasInvite = variant !== "empty" && variant !== "revoked";
  const showsCode =
    variant === "code" ||
    variant === "regenerated" ||
    variant === "confirmation";
  return (
    <ParentInviteCard
      householdId={householdId}
      householdName={household.name}
      onClose={noop}
      visualFixture={{
        activeInviteExists: hasInvite,
        rawToken: showsCode ? "7fa39c2e4db1a6f6c5e7d9a2b4c6e8f" : undefined,
        feedback:
          variant === "regenerated"
            ? "regenerated"
            : variant === "code"
              ? "generated"
              : variant === "revoked"
                ? "revoked"
                : null,
        showRevokeConfirmation: variant === "confirmation",
      }}
    />
  );
}

function JoinHousehold({
  variant,
}: {
  variant: "empty" | "invalid" | "revoked" | "used" | "expired";
}) {
  const values = {
    empty: { token: "", errorMessage: undefined },
    invalid: {
      token: "invalid-invite-code",
      errorMessage: "Invalid parent invite.",
    },
    revoked: {
      token: "c4a8e2f19b7d3c6a5e0f8b2d",
      errorMessage: "Parent invite was revoked.",
    },
    used: {
      token: "7fa39c2e4db1a6f0c5e7d9a",
      errorMessage: "Parent invite has already been used.",
    },
    expired: {
      token: "9e2f4a6c8d0b2e4f6a8c1d3e",
      errorMessage: "Parent invite has expired.",
    },
  }[variant];
  return (
    <HouseholdSetupScreen
      visualFixture={{
        mode: "join",
        parentInviteToken: values.token,
        errorMessage: values.errorMessage,
      }}
    />
  );
}

function VerificationState({ state }: { state: string }) {
  const insets = useSafeAreaInsets();
  switch (state) {
    case "onboarding":
      return <OnboardingScreen onChooseParent={noop} onChooseChild={noop} />;
    case "onboarding-how":
      return (
        <OnboardingScreen
          onChooseParent={noop}
          onChooseChild={noop}
          initialPage={1}
        />
      );
    case "onboarding-rewards":
      return (
        <OnboardingScreen
          onChooseParent={noop}
          onChooseChild={noop}
          initialPage={2}
        />
      );
    case "onboarding-role":
      return (
        <OnboardingScreen
          onChooseParent={noop}
          onChooseChild={noop}
          initialPage={3}
        />
      );
    case "child-pairing-entry":
      return <ChildJoinScreen />;
    case "child-pairing-scanner":
      return <ChildQrScannerScreen onCancel={noop} />;
    case "child-pin-setup":
      return (
        <ChildPinSetupScreen
          householdId={householdId}
          householdName={household.name}
          childId={alexId}
          childDisplayName="Alex"
          authStoragePrefix="visual-alex"
          onComplete={noop}
        />
      );
    case "child-profile":
      return (
        <ChildProfileScreen
          childName="Alex"
          householdName={household.name}
          onClose={noop}
          onLockAndSwitch={async () => {}}
        />
      );
    case "child-pin-unlock":
      return (
        <ChildPinUnlockScreen
          context={{
            contextId: "visual-alex-context",
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            authStoragePrefix: "visual-alex",
            pinSalt: "visual-only",
            pinVerifier: "visual-only",
            createdAt: atLocalTime(-7, 12),
            updatedAt: atLocalTime(-7, 12),
          }}
          onUnlocked={noop}
        />
      );
    case "child-home":
      return (
        <ChildHomeScreen
          access={{
            accessGrantId,
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            grantedAt: atLocalTime(-7, 12),
          }}
          visualFixture={{
            balanceSek: 240,
            homeOccurrences: [
              {
                ...choreOccurrenceBase,
                state: "available",
                canSubmit: true,
              },
              {
                ...choreOccurrenceBase,
                occurrenceId: "visual-feed-dog" as Id<"choreOccurrences">,
                choreDefinitionId: "visual-feed-dog" as Id<"choreDefinitions">,
                title: "Feed the dog",
                valueSek: 10,
                description: "Give the dog dinner and fresh water.",
                isUnlockChore: false,
                state: "available",
                canSubmit: true,
                deadlineAt: atLocalTime(0, 20),
              },
              {
                ...choreOccurrenceBase,
                occurrenceId: "visual-recycling" as Id<"choreOccurrences">,
                choreDefinitionId: "visual-recycling" as Id<"choreDefinitions">,
                title: "Take out recycling",
                valueSek: 20,
                isUnlockChore: false,
                state: "submitted",
                canSubmit: false,
              },
            ],
            homeRedos: [],
          }}
        />
      );
    case "child-chore-detail":
      return <ChildChoreDetail state="available" />;
    case "child-submit-empty":
    case "child-submit-photo":
      return (
        <View className="flex-1 bg-canvas">
          <ChildHomeChoreList
            initialOccurrenceId={occurrenceId}
            visualOccurrences={[
              {
                ...choreOccurrenceBase,
                state: "available",
                canSubmit: true,
              },
            ]}
            visualRedos={[]}
            initialVisualSubmissionState={
              state === "child-submit-photo" ? "photo" : "empty"
            }
          />
        </View>
      );
    case "child-active-claim":
      return <ChildClaimFixture state="active" />;
    case "child-unclaim-confirmation":
      return <ChildClaimFixture state="unclaim" />;
    case "child-money":
      return <ChildMoneyFixture state="week" />;
    case "child-money-pending":
      return <ChildMoneyFixture state="pending" />;
    case "child-money-paid":
      return <ChildMoneyFixture state="paid" />;
    case "child-money-negative":
      return <ChildMoneyFixture state="negative" />;
    case "child-money-first-week":
      return <ChildMoneyFixture state="first-week" />;
    case "child-active-claim-submitted":
      return <ChildClaimFixture state="submitted" />;
    case "child-active-claim-locked":
      return <ChildClaimFixture state="locked" />;
    case "child-claim-locked-confirmation":
      return <ChildClaimFixture state="lock-sheet" />;
    case "child-claimable-redo":
      return <ChildClaimFixture state="redo" />;
    case "parent-reviews-deck":
    case "parent-reviews-empty":
      return (
        <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
          <ScrollView className="flex-1 px-5">
            <AppText variant="screenTitle" className="mt-4">
              Reviews
            </AppText>
            <View className="mt-4">
              <ParentReviewsContent
                householdId={householdId}
                householdTimezone={household.timezone}
                visualItems={
                  state === "parent-reviews-empty"
                    ? []
                    : [
                        {
                          submissionId:
                            "visual-sub-1" as Id<"choreSubmissions">,
                          source: "personal",
                          kind: "personal",
                          childDisplayName: "Alex",
                          title: "Clean your room",
                          description: "Bed made, clothes away, floor clear.",
                          valueSek: 30,
                          submittedAt: atLocalTime(0, 16, 40),
                          isUnlockChore: true,
                          hasEvidence: false,
                        },
                        {
                          submissionId:
                            "visual-sub-2" as Id<"choreSubmissions">,
                          source: "claimable",
                          kind: "claimable",
                          childDisplayName: "Maya",
                          title: "Wash the car",
                          valueSek: 50,
                          submittedAt: atLocalTime(0, 17, 5),
                          isUnlockChore: false,
                          hasEvidence: false,
                        },
                        {
                          submissionId:
                            "visual-sub-3" as Id<"choreSubmissions">,
                          source: "redo",
                          kind: "personal",
                          childDisplayName: "Maya",
                          title: "Fold laundry",
                          valueSek: 20,
                          submittedAt: atLocalTime(0, 17, 30),
                          isUnlockChore: false,
                          hasEvidence: false,
                        },
                      ]
                }
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    case "parent-household-start":
      return <HouseholdSetupScreen visualFixture={{ mode: "start" }} />;
    case "parent-create-household":
      return (
        <HouseholdSetupScreen
          visualFixture={{
            mode: "create",
            householdName: household.name,
            timezone: household.timezone,
            payoutWeekday: "friday",
            weeklyUnclaimAllowance: "2",
            children: ["Alex"],
          }}
        />
      );
    case "child-access-recovery":
      return <ChildNoAccessScreen visualState="error" />;
    case "parent-payout-recovery":
      return (
        <RecoveryPayoutDetail
          selected={{
            payoutId: "visual-payout" as Id<"payouts">,
            childId: alexId,
            childDisplayName: "Alex",
            periodEndLocalDate: "2026-09-11",
            balanceAtCloseSek: 240,
            amountDueSek: 70,
            pendingOutcomeCount: 1,
            status: "pending",
            paidAt: null,
            runningBalanceSek: 240,
          }}
          insetTop={Math.max(0, insets.top - 12)}
          onBack={noop}
        />
      );
    case "child-activity":
    case "child-activity-empty":
      return (
        <ChildHomeScreen
          access={{
            accessGrantId,
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            grantedAt: atLocalTime(-7, 12),
          }}
          visualFixture={{
            initialTab: "activity",
            activity: {
              items: state === "child-activity" ? familyWeekItems : [],
              timezone: household.timezone,
            },
          }}
        />
      );
    case "child-activity-loading":
      return (
        <ChildHomeScreen
          access={{
            accessGrantId,
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            grantedAt: atLocalTime(-7, 12),
          }}
          visualFixture={{
            initialTab: "activity",
            balanceSek: 240,
            activity: {
              loading: true,
              items: [],
              timezone: household.timezone,
            },
          }}
        />
      );
    case "notification-primer-child":
    case "notification-primer-parent":
      return (
        <NotificationPrimer
          visible
          audience={state === "notification-primer-child" ? "child" : "parent"}
          onEnable={noop}
          onLater={noop}
        />
      );
    case "child-approval-celebration":
    case "child-approval-celebration-multi":
    case "child-sibling-win":
      return (
        <ChildHomeScreen
          access={{
            accessGrantId,
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            grantedAt: atLocalTime(-7, 12),
          }}
          visualFixture={{
            balanceSek: 145,
            celebration:
              state === "child-sibling-win"
                ? {
                    items: activityItems,
                    watermark: {
                      at: Math.max(...activityItems.map((i) => i.approvedAt)),
                      ids: activityItems.map((i) => i.activityId),
                    },
                    toast: activityItems[0],
                  }
                : {
                    items:
                      state === "child-approval-celebration"
                        ? activityItems
                            .filter((i) => i.childId === alexId)
                            .slice(0, 1)
                        : activityItems,
                  },
          }}
        />
      );
    case "child-activity-celebration":
      return (
        <ChildHomeScreen
          access={{
            accessGrantId,
            householdId,
            householdName: household.name,
            childId: alexId,
            childDisplayName: "Alex",
            grantedAt: atLocalTime(-7, 12),
          }}
          visualFixture={{
            initialTab: "activity",
            activity: {
              items: activityItems,
              timezone: household.timezone,
            },
            celebration: { items: activityItems },
          }}
        />
      );
    case "child-chore-detail-approved-state":
      return <ChildChoreDetail state="approved" />;
    case "child-chore-detail-approved":
      return <ChildChoreDetail state="available" />;
    case "child-chore-detail-upcoming":
      return <ChildChoreDetail state="scheduled" />;
    case "child-chore-detail-submitted":
      return <ChildChoreDetail state="submitted" />;
    case "child-chore-detail-missed":
      return <ChildChoreDetail state="missed" />;
    case "child-chore-detail-redo":
      return <ChildChoreDetail state="redo_required" />;
    case "parent-new-chore-personal":
      return <ChoreEditor form={personalForm} />;
    case "parent-new-chore-claimable":
      return <ChoreEditor form={claimableForm} />;
    case "parent-edit-chore":
      return (
        <ChoreEditor form={{ ...personalForm, editingId: definitionId }} />
      );
    case "parent-family":
      return <ParentFamilyScreen />;
    case "parent-household-settings":
      return <HouseholdSettingsScreen household={household} onBack={noop} />;
    case "parent-account":
      return (
        <ParentAccountScreen
          parentName="Sam"
          parentEmail="sam@example.com"
          household={household}
          onBack={noop}
          onOpenHelp={noop}
          onSignOut={noop}
          signingOut={false}
        />
      );
    case "parent-active-claim":
      return (
        <ParentClaim claim={activeClaimBase} initialVisualState="detail" />
      );
    case "parent-active-claim-submitted":
      return (
        <ParentClaim
          claim={{ ...activeClaimBase, claimState: "submitted" }}
          initialVisualState="detail"
        />
      );
    case "parent-active-claim-redo":
      return (
        <ParentClaim
          claim={{
            ...activeClaimBase,
            claimState: "redo_required",
            redoDeadlineAt: atLocalTime(1, 18),
          }}
          initialVisualState="detail"
        />
      );
    case "parent-active-claim-cancel-confirmation":
      return (
        <ParentClaim
          claim={activeClaimBase}
          initialVisualState="confirmation"
        />
      );
    case "parent-active-claim-cancellation-unavailable":
      return (
        <ParentClaim
          claim={{
            ...activeClaimBase,
            claimState: "redo_required",
            redoDeadlineAt: atLocalTime(0, 18),
          }}
          initialVisualState="unavailable"
        />
      );
    case "parent-child-access-code-revoke-confirmation":
      return <ParentChildAccess variant="code-confirmation" />;
    case "parent-child-access-empty":
      return <ParentChildAccess variant="empty" />;
    case "parent-child-access-code":
      return <ParentChildAccess variant="code" />;
    case "parent-child-access-expired-code":
      return <ParentChildAccess variant="expired" />;
    case "parent-child-access-regenerated-code":
      return <ParentChildAccess variant="regenerated" />;
    case "parent-child-access-device":
      return <ParentChildAccess variant="device" />;
    case "parent-child-access-device-revoke-confirmation":
      return <ParentChildAccess variant="device-confirmation" />;
    case "parent-child-access-revoked-device":
      return <ParentChildAccess variant="revoked-device" />;
    case "parent-invitation-empty":
      return <ParentInvitation variant="empty" />;
    case "parent-invitation-code":
      return <ParentInvitation variant="code" />;
    case "parent-invitation-code-unavailable":
      return <ParentInvitation variant="unavailable" />;
    case "parent-invitation-regenerated":
      return <ParentInvitation variant="regenerated" />;
    case "parent-invitation-revoke-confirmation":
      return <ParentInvitation variant="confirmation" />;
    case "parent-invitation-revoked":
      return <ParentInvitation variant="revoked" />;
    case "parent-invitation-accept-empty":
      return <JoinHousehold variant="empty" />;
    case "parent-invitation-accept-invalid":
      return <JoinHousehold variant="invalid" />;
    case "parent-invitation-accept-revoked":
      return <JoinHousehold variant="revoked" />;
    case "parent-invitation-accept-used":
      return <JoinHousehold variant="used" />;
    case "parent-invitation-accept-expired":
      return <JoinHousehold variant="expired" />;
    default:
      return (
        <SafeAreaView className="flex-1 items-center justify-center bg-canvas px-6">
          <AppText variant="screenTitle" className="text-center">
            Unknown design preview state
          </AppText>
          <AppText color="ink-muted" className="mt-2 text-center">
            {state || "Pass a state query parameter."}
          </AppText>
        </SafeAreaView>
      );
  }
}

export default function DesignPreviewRoute() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const state = Array.isArray(params.state) ? params.state[0] : params.state;

  if (!__DEV__) return <Redirect href="/" />;

  // Child states render inside the child app's night-sky theme.
  return (
    <ThemeScope mode={state?.startsWith("child-") ? "quest" : "home"}>
      <VerificationState key={state} state={state ?? ""} />
    </ThemeScope>
  );
}
