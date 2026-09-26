import {
  ChoreIcon,
  LockClunk,
  StarBuddy,
  TreasureChest,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/dates";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";

type UnlockState =
  | "scheduled"
  | "available"
  | "submitted"
  | "redo_required"
  | "approved"
  | "missed"
  | "failed"
  | "cancelled"
  | "expired_unclaimed";

type ClaimState =
  | "claimed"
  | "submitted"
  | "redo_required"
  | "approved"
  | "unclaimed"
  | "cancelled"
  | "failed";

type CommitmentLockReason = "time_window" | "allowance_exhausted" | null;

export type ClaimCommitmentStatus = {
  lockAt: number;
  isTimeLocked: boolean;
  hasUnclaimAllowance: boolean;
  remainingUnclaims: number;
  canUnclaim: boolean;
  isImmediatelyLocked: boolean;
  lockReason: CommitmentLockReason;
};

export type UnlockChoreSummary = {
  occurrenceId: Id<"choreOccurrences">;
  title: string;
  description?: string;
  valueSek: number;
  scheduledLocalDate: string;
  timezone: string;
  availabilityStartsAt: number;
  deadlineAt: number;
  state: UnlockState;
};

export type ClaimableChoresViewModel = {
  gate: {
    canAccessClaimables: boolean;
    currentUnlockOccurrence: {
      occurrenceId: Id<"choreOccurrences">;
      title: string;
      state: UnlockState;
      scheduledLocalDate: string;
      availabilityStartsAt: number;
      deadlineAt: number;
    } | null;
  };
  unclaimAllowance: {
    allowance: number;
    usedUnclaims: number;
    remainingUnclaims: number;
    payoutWeek: {
      startLocalDate: string;
      endLocalDate: string;
      startAt: number;
      endAt: number;
    };
  };
  claimableOccurrences: {
    occurrenceId: Id<"choreOccurrences">;
    title: string;
    description?: string;
    valueSek: number;
    timezone: string;
    deadlineAt: number;
    commitment: ClaimCommitmentStatus;
  }[];
  claimedOccurrences: {
    claimId: Id<"choreClaims">;
    occurrenceId: Id<"choreOccurrences">;
    childId: Id<"children">;
    claimedByDisplayName: string;
    claimState: ClaimState;
    claimedAt: number;
    title: string;
    description?: string;
    valueSek: number;
    scheduledLocalDate: string;
    timezone: string;
    deadlineAt: number;
    isMine: boolean;
    commitment: ClaimCommitmentStatus | null;
  }[];
};

function ChoreArtwork({
  title,
  large = false,
  activeClaim = false,
  detail = false,
  gate = false,
}: {
  title: string;
  large?: boolean;
  detail?: boolean;
  activeClaim?: boolean;
  gate?: boolean;
  pool?: boolean;
}) {
  return (
    <ChoreIcon
      title={title}
      size={large ? 140 : activeClaim ? 120 : detail ? 96 : gate ? 72 : 60}
      animated={large || activeClaim || detail}
    />
  );
}

function ChoreHero({ title }: { title: string }) {
  return (
    <View className="relative h-[190px] w-full items-center justify-center overflow-hidden rounded-large bg-surface">
      <View className="absolute -left-8 -top-12 h-44 w-44 rounded-full bg-nightRaised opacity-60" />
      <View className="absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-nightTrack" />
      <ChoreArtwork title={title} large />
      <View className="absolute bottom-3 left-3">
        <StatusChip
          label="Redo required"
          tone="urgent"
          icon={<Icon name="redo" color={themeColors.urgency} size={16} />}
        />
      </View>
    </View>
  );
}

/** Gold coin with the Extra's value, flipping slowly while it's claimable. */
function ValueCoin({ value, spin = false }: { value: number; spin?: boolean }) {
  return (
    <View className="h-14 w-14 items-center justify-center rounded-full border-b-4 border-goldShade bg-gold">
      <AppText className="font-display text-[18px] leading-[20px] text-night">
        {value}
      </AppText>
      <AppText className="font-body-heavy text-[10px] leading-[12px] text-night">
        kr
      </AppText>
      {spin ? null : null}
    </View>
  );
}

function formatTime(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function formatDeadline(timestamp: number, timezone: string) {
  const formatLocalDateKey = (value: number) => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value));
    } catch {
      return "";
    }
  };
  const date = formatLocalDateKey(timestamp);
  const today = formatLocalDateKey(Date.now());
  const toDayNumber = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };
  const dayDelta =
    date && today ? toDayNumber(date) - toDayNumber(today) : Number.NaN;
  const dayLabel =
    dayDelta === 0
      ? "Today"
      : dayDelta === 1
        ? "Tomorrow"
        : dayDelta === -1
          ? "Yesterday"
          : formatLocalDate(date);
  return `${dayLabel}, ${formatTime(timestamp, timezone)}`;
}

function formatDeadlineSentence(timestamp: number, timezone: string) {
  const formatted = formatDeadline(timestamp, timezone);
  return formatted
    ? `${formatted[0].toLowerCase()}${formatted.slice(1)}`
    : formatted;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Could not complete this action. Please try again.";
}

function lockExplanation(commitment: ClaimCommitmentStatus) {
  if (commitment.lockReason === "time_window") {
    return "This chore is already inside the two-hour lock window. You will not be able to unclaim it.";
  }
  if (commitment.lockReason === "allowance_exhausted") {
    return "You have no weekly unclaims remaining. You can still claim this chore, but you won’t be able to unclaim it.";
  }
  return "This claim will be locked immediately and cannot be unclaimed.";
}

function ClaimableCard({
  occurrence,
  claimedBy,
  disabled,
  loading,
  onClaim,
}: {
  occurrence: ClaimableChoresViewModel["claimableOccurrences"][number];
  claimedBy?: string;
  disabled?: boolean;
  loading?: boolean;
  onClaim?: () => void;
}) {
  if (claimedBy) {
    return (
      <View className="min-h-[64px] flex-row items-center gap-3 rounded-large border-2 border-dashed border-nightRaised px-4 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-pink">
          <Icon name="person" color={themeColors.night} size={18} />
        </View>
        <View className="flex-1">
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="font-body-bold"
          >
            {claimedBy}
          </AppText>
          <AppText className="font-body-heavy text-[15px]" numberOfLines={1}>
            {occurrence.title} · {occurrence.valueSek} kr
          </AppText>
        </View>
      </View>
    );
  }

  const locksNow = occurrence.commitment.isImmediatelyLocked;

  return (
    <View className="min-h-[84px] flex-row items-center gap-3 rounded-large bg-surface py-3 pl-3.5 pr-3">
      <ValueCoin value={occurrence.valueSek} />
      <View className="flex-1">
        <AppText
          className="font-body-heavy text-[16px] leading-[21px]"
          numberOfLines={2}
        >
          {occurrence.title}
        </AppText>
        <View className="mt-1 flex-row items-center gap-1">
          <Icon
            name={locksNow ? "lock" : "clock"}
            color={locksNow ? themeColors.accent : themeColors.inkMuted}
            size={13}
          />
          <AppText
            variant="caption"
            color={locksNow ? "accent" : "ink-muted"}
            className="flex-1"
            numberOfLines={1}
          >
            {formatDeadline(occurrence.deadlineAt, occurrence.timezone)}
            {locksNow ? " · locks right away" : ""}
          </AppText>
        </View>
      </View>
      {onClaim ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Claim ${occurrence.title}`}
          disabled={disabled}
          onPress={onClaim}
          pressRetentionOffset={16}
        >
          {({ pressed }) => (
            <View
              className={`min-h-[44px] min-w-[84px] items-center justify-center rounded-full px-4 ${
                disabled
                  ? "bg-disabledSurface"
                  : "border-b-[3px] border-primaryShade bg-primary"
              }`}
              style={{
                transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
              }}
            >
              <AppText
                className={`font-display text-[16px] ${disabled ? "text-inkFaint" : "text-night"}`}
              >
                {loading ? "…" : "Claim"}
              </AppText>
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export function ClaimableChoresView({
  result,
  unlockChore,
  onClaim,
  onUnclaim,
  onSubmit,
  redos = [],
  onSubmitRedo,
  onOpenChore,
  initialVisualState,
}: {
  result: ClaimableChoresViewModel;
  unlockChore?: UnlockChoreSummary;
  onClaim: (
    occurrenceId: Id<"choreOccurrences">,
    acceptImmediateLock: boolean,
  ) => Promise<void>;
  onUnclaim: (claimId: Id<"choreClaims">) => Promise<void>;
  onSubmit?: (
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<void>;
  redos?: {
    occurrenceId: Id<"choreOccurrences">;
    deadlineAt: number;
    canSubmitRedo: boolean;
  }[];
  onSubmitRedo?: (
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<void>;
  onOpenChore?: (occurrenceId: Id<"choreOccurrences">) => void;
  initialVisualState?: "active" | "unclaim" | "locked" | "redo";
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const { gate, unclaimAllowance, claimableOccurrences, claimedOccurrences } =
    result;
  const [claimingId, setClaimingId] = useState<Id<"choreOccurrences"> | null>(
    null,
  );
  const [submittingId, setSubmittingId] = useState<Id<"choreClaims"> | null>(
    null,
  );
  const [unclaimingId, setUnclaimingId] = useState<Id<"choreClaims"> | null>(
    null,
  );
  const [selectedClaimId, setSelectedClaimId] =
    useState<Id<"choreClaims"> | null>(
      initialVisualState === "active" ||
        initialVisualState === "unclaim" ||
        initialVisualState === "redo"
        ? (claimedOccurrences.find((occurrence) => occurrence.isMine)
            ?.claimId ?? null)
        : null,
    );
  const [lockedCandidateId, setLockedCandidateId] =
    useState<Id<"choreOccurrences"> | null>(
      initialVisualState === "locked"
        ? (claimableOccurrences[0]?.occurrenceId ?? null)
        : null,
    );
  const [unclaimCandidateId, setUnclaimCandidateId] =
    useState<Id<"choreClaims"> | null>(
      initialVisualState === "unclaim"
        ? (claimedOccurrences.find((occurrence) => occurrence.isMine)
            ?.claimId ?? null)
        : null,
    );
  const [submissionAttempt, setSubmissionAttempt] = useState<1 | 2 | null>(
    null,
  );
  const [submissionControlState, setSubmissionControlState] = useState<{
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">;
    busy: boolean;
  }>({ busy: false });
  const [actionError, setActionError] = useState<string | null>(null);

  const myClaim = claimedOccurrences.find((occurrence) => occurrence.isMine);
  const selectedClaim = claimedOccurrences.find(
    (occurrence) => occurrence.claimId === selectedClaimId,
  );
  const selectedRedo = selectedClaim
    ? redos.find((redo) => redo.occurrenceId === selectedClaim.occurrenceId)
    : undefined;
  const lockedCandidate = claimableOccurrences.find(
    (occurrence) => occurrence.occurrenceId === lockedCandidateId,
  );
  const unclaimCandidate = claimedOccurrences.find(
    (occurrence) => occurrence.claimId === unclaimCandidateId,
  );
  const busy =
    claimingId !== null || submittingId !== null || unclaimingId !== null;

  function openSubmission(attempt: 1 | 2) {
    setSubmissionControlState({ busy: false });
    setSubmissionAttempt(attempt);
  }

  function closeSubmission() {
    setSubmissionControlState({ busy: false });
    setSubmissionAttempt(null);
  }

  async function executeClaim(
    occurrenceId: Id<"choreOccurrences">,
    acceptImmediateLock: boolean,
  ) {
    if (busy) return;
    setActionError(null);
    setClaimingId(occurrenceId);
    try {
      await onClaim(occurrenceId, acceptImmediateLock);
      setLockedCandidateId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setClaimingId(null);
    }
  }

  function beginClaim(
    occurrence: ClaimableChoresViewModel["claimableOccurrences"][number],
  ) {
    if (busy || myClaim) return;
    if (occurrence.commitment.isImmediatelyLocked) {
      setLockedCandidateId(occurrence.occurrenceId);
    } else {
      void executeClaim(occurrence.occurrenceId, false);
    }
  }

  async function executeUnclaim(claimId: Id<"choreClaims">) {
    if (busy) return;
    setActionError(null);
    setUnclaimingId(claimId);
    try {
      await onUnclaim(claimId);
      setUnclaimCandidateId(null);
      setSelectedClaimId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setUnclaimingId(null);
    }
  }

  async function executeSubmit(
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) {
    if (busy || !onSubmit) return;
    setActionError(null);
    setSubmittingId(claimId);
    try {
      await onSubmit(claimId, evidenceUploadIntentId);
      setSubmissionAttempt(null);
      setSelectedClaimId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSubmittingId(null);
    }
  }

  async function executeSubmitRedo(
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) {
    if (busy || !onSubmitRedo) return;
    setActionError(null);
    setSubmittingId(claimId);
    try {
      await onSubmitRedo(claimId, evidenceUploadIntentId);
      setSubmissionAttempt(null);
      setSelectedClaimId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSubmittingId(null);
    }
  }

  if (!gate.canAccessClaimables) {
    const unlockWaiting = unlockChore?.state === "submitted";
    return (
      <View className="pb-6">
        <View className="mt-1 flex-row items-center gap-2 overflow-hidden rounded-large bg-surface p-3 pr-4">
          <TreasureChest state="locked" size={130} />
          <View className="flex-1">
            <AppText
              variant="label"
              color="gold"
              className="uppercase tracking-[1.2px]"
            >
              Chest locked
            </AppText>
            <AppText variant="sectionTitle" className="mt-0.5">
              Extras are locked
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-1 font-body-bold"
            >
              Get your current Unlock Chore approved to open the chest.
            </AppText>
          </View>
        </View>

        <AppText variant="sectionTitle" className="mt-6">
          Your Unlock Chore
        </AppText>
        <View className="mt-3 rounded-large bg-surface p-3.5">
          <View className="flex-row items-center gap-3">
            <ChoreArtwork title={unlockChore?.title ?? "Unlock chore"} gate />
            <View className="flex-1">
              <AppText className="font-body-heavy text-[17px] leading-[22px]">
                {unlockChore?.title ?? "Current Unlock Chore"}
              </AppText>
              <View className="mt-1 flex-row items-center gap-1">
                <Icon
                  name={unlockWaiting ? "hourglass" : "clock"}
                  color={unlockWaiting ? themeColors.info : themeColors.gold}
                  size={14}
                />
                <AppText
                  variant="caption"
                  color={unlockWaiting ? "ink-muted" : "gold"}
                  className="flex-1"
                >
                  {unlockChore
                    ? unlockWaiting
                      ? "A Parent is checking"
                      : `Due ${formatDeadlineSentence(unlockChore.deadlineAt, unlockChore.timezone)}`
                    : gate.currentUnlockOccurrence?.state === "submitted"
                      ? "A Parent is checking"
                      : "Not approved yet"}
                </AppText>
              </View>
            </View>
            {unlockChore ? <ValueCoin value={unlockChore.valueSek} /> : null}
          </View>
          {unlockChore && onOpenChore ? (
            <ActionButton
              className="mt-4"
              label={unlockWaiting ? "View chore" : "Do it now"}
              onPress={() => onOpenChore(unlockChore.occurrenceId)}
              trailing={
                <Icon name="chevron" color={themeColors.onPrimary} size={20} />
              }
            />
          ) : (
            <View className="mt-3 rounded-control bg-nightRaised p-3">
              <AppText
                variant="bodySmall"
                className="text-center font-body-bold"
              >
                {unlockWaiting
                  ? "Waiting for Parent approval."
                  : "Open Quests to view or submit this chore."}
              </AppText>
            </View>
          )}
        </View>

        <AppText variant="sectionTitle" className="mt-6">
          How the chest opens
        </AppText>
        <View className="mt-3 gap-2.5">
          {[
            {
              number: "1",
              label: "Do your Unlock Chore",
              icon: "chores" as const,
            },
            {
              number: "2",
              label: "Send it for review",
              icon: "camera" as const,
            },
            {
              number: "3",
              label: "A Parent approves — the chest opens!",
              icon: "checkShield" as const,
            },
          ].map((step) => (
            <View
              key={step.number}
              className="flex-row items-center gap-3 rounded-large bg-surface px-3 py-2.5"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full border-b-4 border-accentShade bg-accent">
                <AppText className="font-display text-[18px] text-night">
                  {step.number}
                </AppText>
              </View>
              <AppText className="flex-1 font-body-heavy text-[15px]">
                {step.label}
              </AppText>
              <Icon name={step.icon} color={themeColors.inkMuted} size={22} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="pb-6">
      <View className="mt-1 flex-row items-center gap-1 overflow-hidden rounded-large bg-surface py-2 pl-1 pr-4">
        <TreasureChest state="open" size={150} />
        <View className="flex-1">
          <AppText
            variant="label"
            color="gold"
            className="uppercase tracking-[1.2px]"
          >
            Chest open
          </AppText>
          <AppText variant="sectionTitle" className="mt-0.5">
            Extras unlocked!
          </AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-1 font-body-bold"
          >
            A Parent approved{" "}
            {gate.currentUnlockOccurrence?.title ?? "your Unlock Chore"}. Claim
            one Extra at a time.
          </AppText>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-surface px-3.5 py-2">
        <Icon name="unclaim" color={themeColors.inkMuted} size={16} />
        <AppText variant="caption" color="ink-muted">
          {unclaimAllowance.remainingUnclaims}{" "}
          {unclaimAllowance.remainingUnclaims === 1 ? "unclaim" : "unclaims"}{" "}
          left this week
          {unclaimAllowance.remainingUnclaims === 0
            ? " · new claims lock right away"
            : ""}
        </AppText>
      </View>

      {actionError ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-4">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </Surface>
      ) : null}

      {myClaim ? (
        <>
          <AppText variant="sectionTitle" className="mt-5">
            Your active claim
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open active claim ${myClaim.title}`}
            onPress={() => setSelectedClaimId(myClaim.claimId)}
            className="mt-2"
          >
            <Surface className="min-h-[104px] flex-row items-center gap-3 p-3">
              <ChoreArtwork title={myClaim.title} gate />
              <View className="ml-3 flex-1">
                <StatusChip
                  label={
                    myClaim.claimState === "submitted"
                      ? "Waiting for Parent"
                      : myClaim.claimState === "redo_required"
                        ? "Redo required"
                        : "Claimed by you"
                  }
                  tone={
                    myClaim.claimState === "redo_required"
                      ? "urgent"
                      : "success"
                  }
                />
                <AppText variant="cardTitle" className="mt-2">
                  {myClaim.title}
                </AppText>
                <AppText className="mt-0.5 font-display text-[20px] text-gold">
                  +{myClaim.valueSek} kr
                </AppText>
              </View>
              <Icon name="chevron" color={themeColors.ink} size={22} />
            </Surface>
          </Pressable>
        </>
      ) : null}

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Bonus quests</AppText>
        <AppText variant="label" color="ink-muted">
          {claimableOccurrences.length} available
        </AppText>
      </View>
      {myClaim ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Resolve your active claim before claiming another Extra.
        </AppText>
      ) : null}
      <View className="mt-3 gap-2.5">
        {claimableOccurrences.map((occurrence) => (
          <ClaimableCard
            key={occurrence.occurrenceId}
            occurrence={occurrence}
            disabled={Boolean(myClaim) || busy}
            loading={claimingId === occurrence.occurrenceId}
            onClaim={() => beginClaim(occurrence)}
          />
        ))}
        {claimedOccurrences
          .filter((occurrence) => !occurrence.isMine)
          .map((occurrence) => (
            <ClaimableCard
              key={occurrence.claimId}
              occurrence={{
                occurrenceId: occurrence.occurrenceId,
                title: occurrence.title,
                description: occurrence.description,
                valueSek: occurrence.valueSek,
                timezone: occurrence.timezone,
                deadlineAt: occurrence.deadlineAt,
                commitment: {
                  lockAt: occurrence.deadlineAt,
                  isTimeLocked: true,
                  hasUnclaimAllowance: false,
                  remainingUnclaims: 0,
                  canUnclaim: false,
                  isImmediatelyLocked: true,
                  lockReason: "time_window",
                },
              }}
              claimedBy={`Claimed by ${occurrence.claimedByDisplayName}`}
            />
          ))}
        {claimableOccurrences.length === 0 &&
        claimedOccurrences.length === 0 ? (
          <Surface className="items-center p-6">
            <StarBuddy size={56} mood="sleepy" />
            <AppText variant="cardTitle" className="mt-3">
              Nothing available right now
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-1 text-center"
            >
              New eligible Extras will appear here.
            </AppText>
          </Surface>
        ) : null}
      </View>

      <Modal
        visible={selectedClaim !== undefined}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          closeSubmission();
          setSelectedClaimId(null);
        }}
      >
        {selectedClaim ? (
          <SafeAreaView
            edges={["bottom"]}
            className="flex-1 bg-canvas"
            style={{ paddingTop: safeAreaInsets.top }}
          >
            <View className="px-5">
              <TopBar
                title="Active claim"
                titleStyle={{ fontSize: 20, lineHeight: 24 }}
                onBack={() => setSelectedClaimId(null)}
              />
            </View>
            <ScrollView
              contentContainerClassName={`${selectedClaim.claimState === "claimed" || (selectedClaim.claimState === "redo_required" && selectedRedo?.canSubmitRedo) ? "pb-32" : "pb-8"} px-5`}
              showsVerticalScrollIndicator={false}
            >
              {selectedClaim.claimState === "redo_required" ? (
                <>
                  <ChoreHero title={selectedClaim.title} />
                  <AppText variant="screenTitle" className="mt-1">
                    {selectedClaim.title}
                  </AppText>
                  <View className="mt-1 flex-row gap-3">
                    <View className="flex-row items-center rounded-control bg-urgencySoft px-3 py-2">
                      <Icon name="tag" color={themeColors.urgency} size={22} />
                      <AppText
                        variant="cardTitle"
                        color="urgency"
                        className="ml-2"
                      >
                        {selectedClaim.valueSek} kr
                      </AppText>
                    </View>
                    <View className="flex-1 flex-row items-center rounded-control bg-urgencySoft px-3 py-2">
                      <Icon
                        name="clock"
                        color={themeColors.urgency}
                        size={22}
                      />
                      <AppText
                        variant="bodySmall"
                        color="urgency"
                        className="ml-2 flex-1"
                        numberOfLines={2}
                      >
                        Redo due{" "}
                        {formatDeadlineSentence(
                          selectedRedo?.deadlineAt ?? selectedClaim.deadlineAt,
                          selectedClaim.timezone,
                        )}
                      </AppText>
                    </View>
                  </View>

                  {selectedClaim.description ? (
                    <Surface className="mt-2 p-3">
                      <AppText variant="sectionTitle">Instructions</AppText>
                      <AppText variant="bodySmall" className="mt-2">
                        {selectedClaim.description}
                      </AppText>
                    </Surface>
                  ) : null}

                  <Surface
                    tone="coral"
                    elevated={false}
                    className="mt-3 flex-row items-center p-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-surfaceRaised">
                      <Icon name="redo" color={themeColors.urgency} size={30} />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle">One redo</AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        Submit your corrected work by the new deadline. There is
                        no second redo.
                      </AppText>
                    </View>
                  </Surface>

                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-3 flex-row items-center p-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSoftStrong">
                      <Icon name="link" color={themeColors.ink} size={30} />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle">Claim stays active</AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        You can’t claim another Extra while this Redo is
                        unresolved.
                      </AppText>
                    </View>
                  </Surface>

                  <View className="mt-5">
                    <AppText variant="cardTitle">What happens next?</AppText>
                    <Surface
                      tone="mint"
                      elevated={false}
                      className="mt-2 flex-row items-center p-1.5"
                    >
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-action">
                        <Icon
                          name="check"
                          color={themeColors.onAction}
                          size={18}
                        />
                      </View>
                      <AppText variant="caption" className="ml-2 flex-1">
                        <AppText color="action" className="font-black">
                          Approved:
                        </AppText>{" "}
                        earn {selectedClaim.valueSek} kr and release the Claim.
                      </AppText>
                    </Surface>
                    <Surface
                      tone="coral"
                      elevated={false}
                      className="mt-2 flex-row items-center p-1.5"
                    >
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-urgency">
                        <Icon
                          name="close"
                          color={themeColors.onAction}
                          size={16}
                        />
                      </View>
                      <AppText variant="caption" className="ml-2 flex-1">
                        <AppText color="urgency" className="font-black">
                          Missed or rejected:
                        </AppText>{" "}
                        {selectedClaim.valueSek} kr is deducted and the Claim
                        ends.
                      </AppText>
                    </Surface>
                  </View>
                </>
              ) : (
                <>
                  <Surface className="p-3">
                    <View className="flex-row items-center">
                      <ChoreArtwork title={selectedClaim.title} activeClaim />
                      <View className="ml-4 flex-1">
                        <StatusChip
                          label={
                            selectedClaim.claimState === "submitted"
                              ? "Waiting for review"
                              : "Claimed by you"
                          }
                          tone="success"
                          icon={
                            <View className="h-3 w-3 rounded-full bg-action" />
                          }
                        />
                        <AppText
                          variant="sectionTitle"
                          className="mt-3"
                          numberOfLines={2}
                        >
                          {selectedClaim.title}
                        </AppText>
                        <AppText variant="amount" className="mt-1">
                          {selectedClaim.valueSek} kr
                        </AppText>
                      </View>
                    </View>
                    <View className="mt-4 h-px bg-line" />
                    <View className="mt-4 flex-row">
                      <View className="flex-1 flex-row items-center pr-3">
                        <Icon
                          name="clock"
                          color={themeColors.urgency}
                          size={25}
                        />
                        <AppText
                          variant="bodySmall"
                          color="urgency"
                          className="ml-2 flex-1"
                        >
                          Deadline{" "}
                          {formatDeadlineSentence(
                            selectedClaim.deadlineAt,
                            selectedClaim.timezone,
                          )}
                        </AppText>
                      </View>
                      {selectedClaim.commitment?.canUnclaim ? (
                        <View className="flex-1 flex-row items-center border-l border-line pl-4">
                          <Icon
                            name="refresh"
                            color={themeColors.ink}
                            size={25}
                          />
                          <AppText variant="bodySmall" className="ml-2 flex-1">
                            Unclaim until{" "}
                            {formatTime(
                              selectedClaim.commitment.lockAt,
                              selectedClaim.timezone,
                            )}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </Surface>

                  {selectedClaim.description ? (
                    <View className="mt-5">
                      <AppText variant="sectionTitle">Instructions</AppText>
                      <AppText className="mt-2">
                        {selectedClaim.description}
                      </AppText>
                    </View>
                  ) : null}

                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-5 flex-row items-center p-4"
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
                      <Icon name="link" color={themeColors.ink} size={28} />
                    </View>
                    <View className="ml-3 flex-1">
                      <AppText variant="cardTitle">Active commitment</AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        You can’t claim another Extra until this one is
                        resolved.
                      </AppText>
                    </View>
                  </Surface>

                  {selectedClaim.claimState === "claimed" &&
                  selectedClaim.commitment?.canUnclaim ? (
                    <View className="mt-5">
                      <AppText variant="cardTitle">
                        {unclaimAllowance.remainingUnclaims} of{" "}
                        {unclaimAllowance.allowance} unclaims left this week.
                      </AppText>
                      <ActionButton
                        className="mt-3"
                        label="Unclaim"
                        tone="secondary"
                        testID="child-active-claim-unclaim"
                        onPress={() =>
                          setUnclaimCandidateId(selectedClaim.claimId)
                        }
                      />
                      <AppText
                        variant="bodySmall"
                        color="ink-muted"
                        className="mt-2 text-center"
                      >
                        Unclaiming uses one weekly unclaim.
                      </AppText>
                    </View>
                  ) : null}

                  {selectedClaim.claimState === "claimed" &&
                  !selectedClaim.commitment?.canUnclaim ? (
                    <Surface tone="coral" elevated={false} className="mt-5 p-4">
                      <AppText variant="cardTitle" color="urgency">
                        Locked commitment
                      </AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        This claim can no longer be unclaimed. Missing it
                        deducts {selectedClaim.valueSek} kr.
                      </AppText>
                    </Surface>
                  ) : null}

                  {selectedClaim.claimState === "submitted" ? (
                    <Surface tone="mint" elevated={false} className="mt-5 p-4">
                      <AppText variant="cardTitle" color="action">
                        Waiting for Parent review
                      </AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        Your submission is recorded. This claim stays active
                        until it is resolved.
                      </AppText>
                    </Surface>
                  ) : null}
                </>
              )}
            </ScrollView>

            {selectedClaim.claimState === "claimed" && onSubmit ? (
              <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  className="mb-3 text-center"
                >
                  Parent approval adds {selectedClaim.valueSek} kr to your
                  Running Balance.
                </AppText>
                <ActionButton
                  label="Submit for review"
                  trailing={
                    <Icon
                      name="chevron"
                      color={themeColors.onAction}
                      size={22}
                    />
                  }
                  onPress={() => openSubmission(1)}
                />
              </View>
            ) : null}

            {selectedClaim.claimState === "redo_required" &&
            selectedRedo?.canSubmitRedo &&
            onSubmitRedo ? (
              <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
                <ActionButton
                  label="Submit redo"
                  trailing={
                    <Icon
                      name="chevron"
                      color={themeColors.onAction}
                      size={22}
                    />
                  }
                  onPress={() => openSubmission(2)}
                />
              </View>
            ) : null}

            <Modal
              visible={submissionAttempt !== null}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={closeSubmission}
            >
              <SafeAreaView
                edges={["bottom"]}
                className="flex-1 bg-canvas"
                style={{ paddingTop: safeAreaInsets.top }}
              >
                <View className="px-5">
                  <TopBar
                    title={
                      submissionAttempt === 2 ? "Submit redo" : "Submit work"
                    }
                    titleStyle={{ fontSize: 20, lineHeight: 24 }}
                    onBack={closeSubmission}
                  />
                </View>
                <ScrollView contentContainerClassName="flex-grow px-5 pb-32">
                  <Surface
                    elevated={false}
                    className="min-h-[140px] flex-row items-center gap-3 p-3"
                  >
                    <ChoreArtwork title={selectedClaim.title} />
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle" numberOfLines={2}>
                        {selectedClaim.title}
                      </AppText>
                      <StatusChip
                        label={`${selectedClaim.valueSek} kr`}
                        tone="urgent"
                        icon={
                          <Icon
                            name="tag"
                            color={themeColors.urgency}
                            size={14}
                          />
                        }
                      />
                      <AppText
                        variant="caption"
                        color="urgency"
                        className="mt-2 font-bold"
                      >
                        {submissionAttempt === 2 && selectedRedo
                          ? `Redo due ${formatDeadline(selectedRedo.deadlineAt, selectedClaim.timezone)}`
                          : `Due ${formatDeadline(selectedClaim.deadlineAt, selectedClaim.timezone)}`}
                      </AppText>
                    </View>
                  </Surface>
                  <AppText variant="display" className="mt-7">
                    Ready for review?
                  </AppText>
                  <AppText
                    variant="sectionTitle"
                    className="mb-5 mt-1 font-semibold"
                  >
                    Send your finished chore to a parent.
                  </AppText>
                  <ChildSubmissionActions
                    occurrenceId={selectedClaim.occurrenceId}
                    attemptNumber={submissionAttempt ?? 1}
                    disabled={busy}
                    submitting={submittingId === selectedClaim.claimId}
                    submitTestID={`${submissionAttempt === 2 ? "claimable-redo-submit" : "claimable-submit"}-${selectedClaim.claimId}`}
                    submitLabel={
                      submissionAttempt === 2
                        ? "Submit redo"
                        : "Submit for review"
                    }
                    submittingLabel="Submitting…"
                    hideSubmitButton
                    onControlStateChange={setSubmissionControlState}
                    footerBeforeSubmit={
                      <Surface
                        tone="lavender"
                        elevated={false}
                        className="mt-4 min-h-[100px] flex-row items-center overflow-hidden p-0 pr-3"
                      >
                        <View className="ml-3 h-16 w-16 items-center justify-center rounded-[20px] bg-primary">
                          <Icon
                            name="checkShield"
                            color={themeColors.night}
                            size={32}
                          />
                        </View>
                        <View className="ml-3 flex-1">
                          <AppText
                            variant="cardTitle"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.84}
                          >
                            A parent checks your work.
                          </AppText>
                          <AppText
                            variant="bodySmall"
                            color="ink-muted"
                            className="mt-1"
                          >
                            Approval earns {selectedClaim.valueSek} kr and
                            releases the Claim.
                          </AppText>
                        </View>
                      </Surface>
                    }
                    onSubmit={async (evidenceUploadIntentId) => {
                      if (submissionAttempt === 2) {
                        await executeSubmitRedo(
                          selectedClaim.claimId,
                          evidenceUploadIntentId,
                        );
                      } else {
                        await executeSubmit(
                          selectedClaim.claimId,
                          evidenceUploadIntentId,
                        );
                      }
                    }}
                  />
                </ScrollView>
                <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
                  <ActionButton
                    testID={`${submissionAttempt === 2 ? "claimable-redo-submit" : "claimable-submit"}-${selectedClaim.claimId}`}
                    accessibilityLabel={
                      submissionAttempt === 2
                        ? "Submit redo"
                        : "Submit for review"
                    }
                    disabled={submissionControlState.busy || busy}
                    loading={submittingId === selectedClaim.claimId}
                    label={
                      submittingId === selectedClaim.claimId
                        ? "Submitting…"
                        : submissionAttempt === 2
                          ? "Submit redo"
                          : "Submit for review"
                    }
                    trailing={
                      <Icon
                        name="chevron"
                        color={themeColors.onAction}
                        size={22}
                      />
                    }
                    onPress={() => {
                      if (submissionAttempt === 2) {
                        void executeSubmitRedo(
                          selectedClaim.claimId,
                          submissionControlState.evidenceUploadIntentId,
                        );
                      } else {
                        void executeSubmit(
                          selectedClaim.claimId,
                          submissionControlState.evidenceUploadIntentId,
                        );
                      }
                    }}
                  />
                </View>
              </SafeAreaView>
            </Modal>

            <Modal
              transparent
              animationType="slide"
              visible={unclaimCandidate !== undefined}
              onRequestClose={() => setUnclaimCandidateId(null)}
            >
              <View className="flex-1 justify-end bg-scrim">
                {unclaimCandidate ? (
                  <SafeAreaView
                    edges={["bottom"]}
                    className="rounded-t-sheet bg-surface px-5 pb-3 pt-3"
                  >
                    <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
                    <View className="mt-4 h-16 w-16 items-center justify-center self-center rounded-full bg-infoSoftStrong">
                      <Icon
                        name="brokenLink"
                        color={themeColors.ink}
                        size={34}
                      />
                    </View>
                    <AppText
                      variant="sectionTitle"
                      className="mt-3 text-center"
                    >
                      Unclaim {unclaimCandidate.title}?
                    </AppText>
                    <AppText className="mt-2 text-center">
                      The chore will return to Extras and another eligible Child
                      can claim it.
                    </AppText>
                    <Surface
                      tone="lavender"
                      elevated={false}
                      className="mt-4 flex-row items-center p-4"
                    >
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoftStrong">
                        <Icon
                          name="brokenLink"
                          color={themeColors.ink}
                          size={26}
                        />
                      </View>
                      <View className="ml-3 flex-1">
                        <AppText variant="cardTitle">
                          Uses 1 weekly unclaim
                        </AppText>
                        <AppText variant="bodySmall" className="mt-1">
                          You’ll have {""}
                          {Math.max(
                            0,
                            unclaimAllowance.remainingUnclaims - 1,
                          )}{" "}
                          of {unclaimAllowance.allowance} unclaims left this
                          week.
                        </AppText>
                      </View>
                    </Surface>
                    <AppText
                      variant="bodySmall"
                      color="action"
                      className="mt-3 text-center"
                    >
                      Your Running Balance will not change.
                    </AppText>
                    <ActionButton
                      className="mt-4"
                      label="Unclaim chore"
                      tone="destructive"
                      loading={unclaimingId === unclaimCandidate.claimId}
                      onPress={() =>
                        void executeUnclaim(unclaimCandidate.claimId)
                      }
                    />
                    <ActionButton
                      className="mt-2"
                      label="Keep claim"
                      tone="secondary"
                      onPress={() => setUnclaimCandidateId(null)}
                    />
                  </SafeAreaView>
                ) : null}
              </View>
            </Modal>
          </SafeAreaView>
        ) : null}
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={lockedCandidate !== undefined}
        onRequestClose={() => setLockedCandidateId(null)}
      >
        <View className="flex-1 justify-end bg-scrim">
          {lockedCandidate ? (
            <SafeAreaView
              edges={["bottom"]}
              className="rounded-t-sheet bg-surface px-5 pb-3 pt-3"
            >
              <View className="h-1.5 w-12 self-center rounded-full bg-nightRaised" />
              <View className="mt-3 self-center">
                <LockClunk size={140} />
              </View>
              <AppText variant="sectionTitle" className="mt-3 text-center">
                This one locks right away
              </AppText>
              <AppText
                color="ink-muted"
                className="mt-1.5 text-center font-body-bold"
              >
                {lockExplanation(lockedCandidate.commitment)}
              </AppText>

              <View className="mt-5 rounded-large bg-canvas px-4 py-1">
                <View className="min-h-[46px] flex-row items-center justify-between">
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="font-body-bold"
                  >
                    Finish {lockedCandidate.title}
                  </AppText>
                  <AppText className="font-display text-[17px] text-primary">
                    +{lockedCandidate.valueSek} kr
                  </AppText>
                </View>
                <View className="h-px bg-surface" />
                <View className="min-h-[46px] flex-row items-center justify-between">
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="font-body-bold"
                  >
                    Miss it
                  </AppText>
                  <AppText className="font-display text-[17px] text-pink">
                    −{lockedCandidate.valueSek} kr
                  </AppText>
                </View>
                <View className="h-px bg-surface" />
                <View className="min-h-[46px] flex-row items-center justify-between">
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="font-body-bold"
                  >
                    Due
                  </AppText>
                  <AppText className="font-body-heavy text-[15px]">
                    {formatDeadline(
                      lockedCandidate.deadlineAt,
                      lockedCandidate.timezone,
                    )}
                  </AppText>
                </View>
              </View>

              <ActionButton
                className="mt-5"
                label="Claim and lock it"
                tone="commit"
                leading={
                  <Icon name="lock" color={themeColors.night} size={18} />
                }
                loading={claimingId === lockedCandidate.occurrenceId}
                onPress={() =>
                  void executeClaim(lockedCandidate.occurrenceId, true)
                }
              />
              <ActionButton
                className="mt-1"
                label="Not now"
                tone="quiet"
                onPress={() => setLockedCandidateId(null)}
              />
            </SafeAreaView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
