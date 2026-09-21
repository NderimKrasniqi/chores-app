import type { ApprovalActivityItem } from "@/components/activity/approval-activity";
import { ChildHomeScreen } from "@/components/child-access/child-home-screen";
import {
  ChildHomeChoreList,
  type ChildHomeChoreOccurrence,
  type ChildHomeRedo,
} from "@/components/child-access/child-home-chore-list";
import { ChildNoAccessScreen } from "@/components/child-access/child-no-access-screen";
import {
  ActiveClaimableClaimsView,
  type ActiveClaimableClaimViewModel,
} from "@/components/chores/active-claimable-claims-view";
import {
  ParentChoresContent,
  type ParentChoresVisualForm,
} from "@/components/chores/parent-chores-content";
import { ParentBottomNavigation } from "@/components/household/parent-bottom-navigation";
import { ParentFamilyContent } from "@/components/household/parent-family-content";
import { ParentInviteCard } from "@/components/household/parent-invite-card";
import { ParentScreenHeader } from "@/components/household/parent-screen-header";
import {
  HouseholdSettingsScreen,
  HouseholdSwitcherScreen,
  ParentAccountScreen,
  ParentChildAccessScreen,
} from "@/components/household/parent-secondary-screens";
import { HouseholdSetupScreen } from "@/components/household/household-setup-screen";
import type { HouseholdSummary } from "@/components/household/household-card";
import { AppText } from "@/design-system";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Id } from "../../convex/_generated/dataModel";

const householdId = "visual-household" as Id<"households">;
const secondHouseholdId = "visual-grandma-house" as Id<"households">;
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

const grandmasHouse: HouseholdSummary = {
  householdId: secondHouseholdId,
  name: "Grandma’s House",
  timezone: "Europe/Stockholm",
  payoutWeekday: "sunday",
  weeklyUnclaimAllowance: 1,
  parents: [
    {
      membershipId: "visual-grandma-membership" as Id<"householdMembers">,
      displayName: "Sam",
      isCurrent: true,
    },
  ],
  children: [{ childId: mayaId, displayName: "Maya" }],
};

function atLocalTime(dayOffset: number, hour: number, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value.getTime();
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
  qrToken: "visual-direction-c-pairing-token",
  manualCode: "K7M4P-9Q2RW",
  expiresAt: atLocalTime(0, 23, 59),
};

function ChildChoreDetail({
  state,
}: {
  state: "approved" | "missed" | "redo_required";
}) {
  const occurrence = { ...choreOccurrenceBase, state };
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
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-5 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <ParentScreenHeader
          title="Family"
          subtitle="People, access, and household."
          onOpenAccount={noop}
        />
        <ParentFamilyContent
          household={household}
          onOpenSettings={noop}
          onOpenChildAccess={noop}
          visualDeviceCounts={{ [alexId]: 1, [mayaId]: 0 }}
        />
      </ScrollView>
      <ParentBottomNavigation
        householdId={householdId}
        activeSection="family"
        onSelect={noop}
        visualReviewCount={1}
      />
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

function ParentChildAccess({
  variant,
}: {
  variant:
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
    variant === "expired"
      ? { ...pairingCode, expiresAt: atLocalTime(-1, 9, 56) }
      : pairingCode;
  const devices =
    variant === "device" || variant === "device-confirmation"
      ? [activeDevice]
      : variant === "revoked-device"
        ? [revokedDevice]
        : [];

  return (
    <ParentChildAccessScreen
      householdId={householdId}
      timezone={household.timezone}
      child={household.children[1]}
      onBack={noop}
      visualFixture={{
        devices,
        generated,
        generationCount: variant === "regenerated" ? 2 : 1,
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
  switch (state) {
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
              initialCelebrationItem: activityItems[0],
            },
          }}
        />
      );
    case "child-chore-detail-approved-state":
      return <ChildChoreDetail state="approved" />;
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
    case "parent-household-switcher":
      return (
        <HouseholdSwitcherScreen
          households={[household, grandmasHouse]}
          currentHouseholdId={householdId}
          onBack={noop}
          onSelect={noop}
        />
      );
    case "parent-account":
      return (
        <ParentAccountScreen
          parentName="Sam"
          parentEmail="sam@example.com"
          household={household}
          canSwitchHousehold
          onBack={noop}
          onSwitchHousehold={noop}
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
            Unknown Direction C verification state
          </AppText>
          <AppText color="ink-muted" className="mt-2 text-center">
            {state || "Pass a state query parameter."}
          </AppText>
        </SafeAreaView>
      );
  }
}

export default function DirectionCVerificationRoute() {
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const state = Array.isArray(params.state) ? params.state[0] : params.state;

  if (!__DEV__) return <Redirect href="/" />;

  return <VerificationState key={state} state={state ?? ""} />;
}
