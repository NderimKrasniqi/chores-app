import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Id } from "../../../convex/_generated/dataModel";
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
  claimableOccurrences: Array<{
    occurrenceId: Id<"choreOccurrences">;
    title: string;
    description?: string;
    valueSek: number;
    timezone: string;
    deadlineAt: number;
    commitment: ClaimCommitmentStatus;
  }>;
  claimedOccurrences: Array<{
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
  }>;
};

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};

function artworkForTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("car") || normalized.includes("wash"))
    return artwork.carWash;
  if (normalized.includes("walk") && normalized.includes("dog"))
    return artwork.dogWalk;
  if (normalized.includes("room") || normalized.includes("bed"))
    return artwork.bedroom;
  if (
    normalized.includes("dog") ||
    normalized.includes("pet") ||
    normalized.includes("feed")
  )
    return artwork.dog;
  if (normalized.includes("recycl") || normalized.includes("trash"))
    return artwork.recycling;
  return null;
}

function ChoreArtwork({
  title,
  large = false,
}: {
  title: string;
  large?: boolean;
}) {
  const source = artworkForTitle(title);
  return (
    <View
      className={`${large ? "h-[245px] w-full" : "h-24 w-28"} items-center justify-center overflow-hidden rounded-control bg-[#F7EDDF]`}
    >
      {source ? (
        <Image
          source={source}
          className={large ? "h-[235px] w-full" : "h-[92px] w-[106px]"}
          contentFit="contain"
          accessible={false}
        />
      ) : (
        <DirectionCIcon
          name="chores"
          color={DirectionC.color.greenDeep}
          size={large ? 70 : 42}
        />
      )}
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
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
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
  return (
    <Surface className="min-h-[120px] flex-row items-center p-2.5">
      <ChoreArtwork title={occurrence.title} />
      <View className="ml-3 flex-1">
        <AppText variant="cardTitle" numberOfLines={2}>
          {occurrence.title}
        </AppText>
        <AppText className="mt-1 text-xl font-black">
          {occurrence.valueSek} kr
        </AppText>
        <View className="mt-1 flex-row items-center">
          <DirectionCIcon
            name={claimedBy ? "person" : "clock"}
            color={
              claimedBy ? DirectionC.color.inkMuted : DirectionC.color.coral
            }
            size={17}
          />
          <AppText
            variant="bodySmall"
            color={claimedBy ? "ink-muted" : "urgency"}
            className="ml-1 flex-1"
            numberOfLines={1}
          >
            {claimedBy ??
              formatDeadline(occurrence.deadlineAt, occurrence.timezone)}
          </AppText>
        </View>
      </View>
      {onClaim ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Claim ${occurrence.title}`}
          disabled={disabled}
          onPress={onClaim}
          className={`min-h-control min-w-[88px] items-center justify-center rounded-control px-4 ${
            disabled ? "bg-disabledSurface" : "bg-action"
          }`}
        >
          <AppText variant="cardTitle" color={disabled ? "ink-faint" : "white"}>
            {loading ? "…" : "Claim"}
          </AppText>
        </Pressable>
      ) : null}
    </Surface>
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
  redos?: Array<{
    occurrenceId: Id<"choreOccurrences">;
    deadlineAt: number;
    canSubmitRedo: boolean;
  }>;
  onSubmitRedo?: (
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<void>;
}) {
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
    useState<Id<"choreClaims"> | null>(null);
  const [lockedCandidateId, setLockedCandidateId] =
    useState<Id<"choreOccurrences"> | null>(null);
  const [unclaimCandidateId, setUnclaimCandidateId] =
    useState<Id<"choreClaims"> | null>(null);
  const [submissionAttempt, setSubmissionAttempt] = useState<1 | 2 | null>(
    null,
  );
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
    return (
      <View className="pb-4">
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-3 flex-row items-center p-4"
        >
          <View className="h-20 w-24 items-center justify-center">
            <DirectionCIcon
              name="key"
              color={DirectionC.color.greenDeep}
              size={54}
            />
          </View>
          <View className="ml-2 flex-1">
            <AppText variant="sectionTitle">Extras are locked</AppText>
            <AppText className="mt-1">
              Get your current Unlock Chore approved to open Extras.
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          Your Unlock Chore
        </AppText>
        <Surface className="mt-2 p-3">
          <View className="flex-row items-center">
            <ChoreArtwork title={unlockChore?.title ?? "Unlock chore"} />
            <View className="ml-3 flex-1">
              <StatusChip
                label="Unlock chore"
                tone="urgent"
                icon={
                  <DirectionCIcon
                    name="key"
                    color={DirectionC.color.coral}
                    size={14}
                  />
                }
              />
              <AppText variant="cardTitle" className="mt-2">
                {unlockChore?.title ?? "Current Unlock Chore"}
              </AppText>
              {unlockChore ? (
                <AppText className="mt-1 text-xl font-black">
                  {unlockChore.valueSek} kr
                </AppText>
              ) : null}
              <View className="mt-1 flex-row items-center">
                <DirectionCIcon
                  name="clock"
                  color={DirectionC.color.coral}
                  size={17}
                />
                <AppText variant="bodySmall" color="urgency" className="ml-1">
                  {unlockChore
                    ? formatDeadline(
                        unlockChore.deadlineAt,
                        unlockChore.timezone,
                      )
                    : gate.currentUnlockOccurrence?.state === "submitted"
                      ? "Waiting for Parent"
                      : "Not approved yet"}
                </AppText>
              </View>
            </View>
          </View>
          <Surface tone="mint" elevated={false} className="mt-3 p-3">
            <AppText variant="bodySmall" color="action" className="text-center">
              Open Home to view or submit this chore.
            </AppText>
          </Surface>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          How Extras open
        </AppText>
        {[
          ["1", "Do the chore"],
          ["2", "Submit your work"],
          ["3", "Parent approves"],
        ].map(([number, label], index) => (
          <Surface
            key={number}
            className="mt-2 min-h-[66px] flex-row items-center px-3 py-2"
          >
            <View
              className={`h-11 w-11 items-center justify-center rounded-full ${index === 0 ? "bg-actionSoftStrong" : index === 1 ? "bg-infoSoftStrong" : "bg-urgencySoft"}`}
            >
              <AppText variant="cardTitle">{number}</AppText>
            </View>
            <AppText variant="cardTitle" className="ml-4">
              {label}
            </AppText>
          </Surface>
        ))}
      </View>
    );
  }

  return (
    <View className="pb-4">
      <Surface
        tone="mint"
        elevated={false}
        className="mt-3 flex-row items-center p-4"
      >
        <View className="h-16 w-20 items-center justify-center">
          <DirectionCIcon
            name="key"
            color={DirectionC.color.greenDeep}
            size={48}
          />
        </View>
        <View className="ml-2 flex-1">
          <AppText variant="sectionTitle">Extras are open</AppText>
          <AppText className="mt-1">
            Your current Unlock Chore was approved.
          </AppText>
        </View>
      </Surface>

      <Surface
        tone="lavender"
        elevated={false}
        className="mt-3 flex-row items-center p-4"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoftStrong">
          <DirectionCIcon
            name="refresh"
            color={DirectionC.color.ink}
            size={25}
          />
        </View>
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle">
            {unclaimAllowance.remainingUnclaims}{" "}
            {unclaimAllowance.remainingUnclaims === 1 ? "unclaim" : "unclaims"}{" "}
            left this week
          </AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            {unclaimAllowance.remainingUnclaims === 0
              ? "You can still claim chores. New claims lock immediately."
              : "One active claim at a time."}
          </AppText>
        </View>
      </Surface>

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
            <Surface className="min-h-[120px] flex-row items-center p-2.5">
              <ChoreArtwork title={myClaim.title} />
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
                <AppText className="mt-1 text-xl font-black">
                  {myClaim.valueSek} kr
                </AppText>
              </View>
              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.ink}
                size={22}
              />
            </Surface>
          </Pressable>
        </>
      ) : null}

      <AppText variant="sectionTitle" className="mt-5">
        Available now
      </AppText>
      {myClaim ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Resolve your active claim before claiming another Extra.
        </AppText>
      ) : null}
      <View className="mt-2 gap-3">
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
            <AppText variant="cardTitle">Nothing available right now</AppText>
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
          setSubmissionAttempt(null);
          setSelectedClaimId(null);
        }}
      >
        {selectedClaim ? (
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <TopBar
              title="Active claim"
              onBack={() => setSelectedClaimId(null)}
            />
            <ScrollView
              contentContainerClassName={`${selectedClaim.claimState === "claimed" || (selectedClaim.claimState === "redo_required" && selectedRedo?.canSubmitRedo) ? "pb-32" : "pb-8"} px-5`}
              showsVerticalScrollIndicator={false}
            >
              <Surface className="p-3">
                <View className="flex-row items-center">
                  <ChoreArtwork title={selectedClaim.title} />
                  <View className="ml-4 flex-1">
                    <StatusChip
                      label={
                        selectedClaim.claimState === "redo_required"
                          ? "Redo required"
                          : selectedClaim.claimState === "submitted"
                            ? "Waiting for Parent"
                            : "Claimed by you"
                      }
                      tone={
                        selectedClaim.claimState === "redo_required"
                          ? "urgent"
                          : "success"
                      }
                    />
                    <AppText variant="sectionTitle" className="mt-3">
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
                    <DirectionCIcon
                      name="clock"
                      color={DirectionC.color.coral}
                      size={25}
                    />
                    <AppText
                      variant="bodySmall"
                      color="urgency"
                      className="ml-2 flex-1"
                    >
                      {selectedClaim.claimState === "redo_required" &&
                      selectedRedo
                        ? `Redo due ${formatDeadline(selectedRedo.deadlineAt, selectedClaim.timezone)}`
                        : `Deadline ${formatDeadline(selectedClaim.deadlineAt, selectedClaim.timezone)}`}
                    </AppText>
                  </View>
                  {selectedClaim.commitment?.canUnclaim ? (
                    <View className="flex-1 flex-row items-center border-l border-line pl-4">
                      <DirectionCIcon
                        name="refresh"
                        color={DirectionC.color.ink}
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
                  <DirectionCIcon
                    name="brokenLink"
                    color={DirectionC.color.ink}
                    size={28}
                  />
                </View>
                <View className="ml-3 flex-1">
                  <AppText variant="cardTitle">Active commitment</AppText>
                  <AppText variant="bodySmall" className="mt-1">
                    You can’t claim another Extra until this one is resolved.
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
                    onPress={() => setUnclaimCandidateId(selectedClaim.claimId)}
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
                    This claim can no longer be unclaimed. Missing it deducts{" "}
                    {selectedClaim.valueSek} kr.
                  </AppText>
                </Surface>
              ) : null}

              {selectedClaim.claimState === "submitted" ? (
                <Surface tone="mint" elevated={false} className="mt-5 p-4">
                  <AppText variant="cardTitle" color="action">
                    Waiting for Parent review
                  </AppText>
                  <AppText variant="bodySmall" className="mt-1">
                    Your submission is recorded. This claim stays active until
                    it is resolved.
                  </AppText>
                </Surface>
              ) : null}

              {selectedClaim.claimState === "redo_required" ? (
                <>
                  <Surface
                    tone="coral"
                    elevated={false}
                    className="mt-5 flex-row items-center p-4"
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-surfaceRaised">
                      <DirectionCIcon
                        name="redo"
                        color={DirectionC.color.coral}
                        size={30}
                      />
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
                    className="mt-4 flex-row items-center p-4"
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
                      <DirectionCIcon
                        name="brokenLink"
                        color={DirectionC.color.ink}
                        size={30}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle">Claim stays active</AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        You can’t claim another Extra while this Redo is
                        unresolved.
                      </AppText>
                    </View>
                  </Surface>

                  <Surface className="mt-4 p-4">
                    <AppText variant="sectionTitle">What happens next?</AppText>
                    <Surface
                      tone="mint"
                      elevated={false}
                      className="mt-3 flex-row items-center p-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-action">
                        <DirectionCIcon
                          name="check"
                          color={DirectionC.color.white}
                          size={20}
                        />
                      </View>
                      <AppText className="ml-3 flex-1">
                        <AppText color="action" className="font-black">
                          Approved:
                        </AppText>{" "}
                        earn {selectedClaim.valueSek} kr and release the Claim.
                      </AppText>
                    </Surface>
                    <Surface
                      tone="coral"
                      elevated={false}
                      className="mt-2 flex-row items-center p-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-urgency">
                        <DirectionCIcon
                          name="close"
                          color={DirectionC.color.white}
                          size={18}
                        />
                      </View>
                      <AppText className="ml-3 flex-1">
                        <AppText color="urgency" className="font-black">
                          Missed or rejected:
                        </AppText>{" "}
                        {selectedClaim.valueSek} kr is deducted and the Claim
                        ends.
                      </AppText>
                    </Surface>
                  </Surface>
                </>
              ) : null}
            </ScrollView>

            {selectedClaim.claimState === "claimed" && onSubmit ? (
              <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
                <ActionButton
                  label="Submit work"
                  trailing={
                    <DirectionCIcon
                      name="chevron"
                      color={DirectionC.color.white}
                      size={22}
                    />
                  }
                  onPress={() => setSubmissionAttempt(1)}
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
                    <DirectionCIcon
                      name="chevron"
                      color={DirectionC.color.white}
                      size={22}
                    />
                  }
                  onPress={() => setSubmissionAttempt(2)}
                />
              </View>
            ) : null}

            <Modal
              visible={submissionAttempt !== null}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => setSubmissionAttempt(null)}
            >
              <SafeAreaView
                edges={["top", "bottom"]}
                className="flex-1 bg-canvas"
              >
                <TopBar
                  title={
                    submissionAttempt === 2 ? "Submit redo" : "Submit work"
                  }
                  onBack={() => setSubmissionAttempt(null)}
                />
                <ScrollView contentContainerClassName="flex-grow px-5 pb-7">
                  <Surface
                    elevated={false}
                    className="flex-row items-center bg-[#F7EDDF] p-3"
                  >
                    <ChoreArtwork title={selectedClaim.title} />
                    <View className="ml-4 flex-1">
                      <AppText variant="sectionTitle" numberOfLines={2}>
                        {selectedClaim.title}
                      </AppText>
                      <StatusChip
                        label={`${selectedClaim.valueSek} kr`}
                        tone="urgent"
                        icon={
                          <DirectionCIcon
                            name="tag"
                            color={DirectionC.color.coral}
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
                    footerBeforeSubmit={
                      <Surface
                        tone="lavender"
                        elevated={false}
                        className="mt-4 flex-row items-center p-4"
                      >
                        <View className="h-14 w-14 items-center justify-center rounded-full bg-action">
                          <DirectionCIcon
                            name="checkShield"
                            color={DirectionC.color.white}
                            size={28}
                          />
                        </View>
                        <View className="ml-4 flex-1">
                          <AppText variant="cardTitle">
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
              </SafeAreaView>
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
              className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
            >
              <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
              <View className="mt-3 self-center">
                <ChoreArtwork title={lockedCandidate.title} />
              </View>
              <AppText variant="sectionTitle" className="mt-3 text-center">
                Claim {lockedCandidate.title}?
              </AppText>
              <View className="mt-2 flex-row justify-center gap-4">
                <AppText variant="cardTitle" color="action">
                  {lockedCandidate.valueSek} kr
                </AppText>
                <AppText color="urgency">
                  {formatDeadline(
                    lockedCandidate.deadlineAt,
                    lockedCandidate.timezone,
                  )}
                </AppText>
              </View>
              <Surface tone="coral" elevated={false} className="mt-4 p-4">
                <AppText variant="cardTitle" color="urgency">
                  Locked immediately
                </AppText>
                <AppText variant="bodySmall" className="mt-1">
                  {lockExplanation(lockedCandidate.commitment)}
                </AppText>
              </Surface>
              <AppText variant="bodySmall" className="mt-3 text-center">
                If you miss this locked chore, {lockedCandidate.valueSek} kr
                will be deducted from your Running Balance.
              </AppText>
              <ActionButton
                className="mt-4"
                label="Cancel"
                tone="secondary"
                onPress={() => setLockedCandidateId(null)}
              />
              <ActionButton
                className="mt-2"
                label="Claim anyway"
                tone="destructive"
                loading={claimingId === lockedCandidate.occurrenceId}
                onPress={() =>
                  void executeClaim(lockedCandidate.occurrenceId, true)
                }
              />
            </SafeAreaView>
          ) : null}
        </View>
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
              className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
            >
              <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
              <View className="mt-4 h-16 w-16 items-center justify-center self-center rounded-full bg-infoSoftStrong">
                <DirectionCIcon
                  name="brokenLink"
                  color={DirectionC.color.ink}
                  size={34}
                />
              </View>
              <AppText variant="sectionTitle" className="mt-3 text-center">
                Unclaim {unclaimCandidate.title}?
              </AppText>
              <AppText className="mt-2 text-center">
                The chore returns to Extras so another eligible Child can claim
                it.
              </AppText>
              <Surface tone="lavender" elevated={false} className="mt-4 p-4">
                <AppText variant="cardTitle">Uses 1 weekly unclaim</AppText>
                <AppText variant="bodySmall" className="mt-1">
                  You’ll have{" "}
                  {Math.max(0, unclaimAllowance.remainingUnclaims - 1)} of{" "}
                  {unclaimAllowance.allowance} unclaims left this week.
                </AppText>
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
                onPress={() => void executeUnclaim(unclaimCandidate.claimId)}
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
    </View>
  );
}
