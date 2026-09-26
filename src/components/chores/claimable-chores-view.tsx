import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { AppImage as Image } from "@/components/ui/app-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/direction-c/dates";
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

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dishwasher: require("../../../assets/images/direction-c/chore-dishwasher.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  laundry: require("../../../assets/images/direction-c/chore-laundry.png"),
  plants: require("../../../assets/images/direction-c/chore-plants.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
  table: require("../../../assets/images/direction-c/chore-table.png"),
};
const extrasArtwork = require("../../../assets/images/direction-c/extras-unlocked.png");
const extrasLockArtwork = require("../../../assets/images/direction-c/extras-lock.png");
const extrasOpenLockArtwork = require("../../../assets/images/direction-c/extras-open-lock.png");
const carWashHeroArtwork = require("../../../assets/images/direction-c/chore-car-wash-hero.png");
const oneStepNoteArtwork = require("../../../assets/images/direction-c/one-step-note.png");
const parentAvatarArtwork = require("../../../assets/images/direction-c/sam-avatar.png");
const submitStepArtwork = require("../../../assets/images/direction-c/qr-scan-phone.png");

function artworkForTitle(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dishwasher") || normalized.includes("dishes"))
    return artwork.dishwasher;
  if (normalized.includes("table")) return artwork.table;
  if (normalized.includes("laundry") || normalized.includes("fold"))
    return artwork.laundry;
  if (normalized.includes("plant") || normalized.includes("water"))
    return artwork.plants;
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
  detail = false,
  activeClaim = false,
  gate = false,
  pool = false,
}: {
  title: string;
  large?: boolean;
  detail?: boolean;
  activeClaim?: boolean;
  gate?: boolean;
  pool?: boolean;
}) {
  const source = artworkForTitle(title);
  return (
    <View
      className={`${large ? "h-[245px] w-full" : activeClaim ? "h-[188px] w-[156px]" : detail ? "h-[128px] w-[132px]" : gate ? "h-[116px] w-[116px]" : pool ? "h-[84px] w-[110px]" : "h-24 w-28"} items-center justify-center overflow-hidden rounded-control bg-[#F7EDDF]`}
    >
      {source ? (
        <Image
          source={source}
          className={
            large
              ? "h-[235px] w-full"
              : activeClaim
                ? "h-[182px] w-[150px]"
                : detail
                  ? "h-[122px] w-[126px]"
                  : gate
                    ? "h-[112px] w-[112px]"
                    : pool
                      ? "h-[80px] w-[106px]"
                      : "h-[92px] w-[106px]"
          }
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

function ChoreHero({ title }: { title: string }) {
  const source = title.toLowerCase().includes("car")
    ? carWashHeroArtwork
    : artworkForTitle(title);

  return (
    <View className="relative h-[180px] w-full overflow-hidden rounded-card bg-[#F7EDDF]">
      {source ? (
        <Image
          source={source}
          className="h-full w-full"
          contentFit="cover"
          accessible={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <DirectionCIcon
            name="chores"
            color={DirectionC.color.greenDeep}
            size={70}
          />
        </View>
      )}
      <View className="absolute bottom-3 left-3">
        <StatusChip
          label="Redo required"
          tone="urgent"
          icon={
            <DirectionCIcon
              name="redo"
              color={DirectionC.color.coral}
              size={16}
            />
          }
        />
      </View>
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
  return (
    <Surface
      className={`${claimedBy ? "mt-[5px] min-h-[105px]" : "min-h-[98px]"} flex-row items-center py-[3px] pl-[7px] pr-1`}
    >
      <ChoreArtwork title={occurrence.title} pool />
      <View className="ml-[15px] flex-1">
        <AppText
          style={{ fontSize: 16, lineHeight: 20, fontWeight: "800" }}
          numberOfLines={2}
        >
          {occurrence.title}
        </AppText>
        <AppText
          className="mt-1"
          style={{ fontSize: 18, lineHeight: 22, fontWeight: "900" }}
        >
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
          className={`min-h-[40px] min-w-[94px] items-center justify-center rounded-control px-4 ${
            disabled ? "bg-disabledSurface" : "bg-action"
          }`}
        >
          <AppText
            color={disabled ? "ink-faint" : "white"}
            style={{ fontSize: 17, lineHeight: 20, fontWeight: "600" }}
          >
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
    return (
      <View className="pb-4">
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-[3px] h-[112px] flex-row items-center px-4 py-1"
        >
          <View className="h-28 w-28 items-center justify-center">
            <Image
              source={extrasLockArtwork}
              className="h-36 w-36"
              contentFit="contain"
              accessible={false}
            />
          </View>
          <View className="ml-[14px] flex-1">
            <AppText
              style={{ fontSize: 22, lineHeight: 27, fontWeight: "900" }}
            >
              Extras are locked
            </AppText>
            <AppText className="mt-1">
              Get your current Unlock Chore approved to open Extras.
            </AppText>
          </View>
        </Surface>

        <AppText
          className="mt-5"
          style={{ fontSize: 26, lineHeight: 31, fontWeight: "900" }}
        >
          Your Unlock Chore
        </AppText>
        <Surface className="mt-[3px] p-3">
          <View className="flex-row items-start">
            <ChoreArtwork title={unlockChore?.title ?? "Unlock chore"} gate />
            <View className="ml-[9px] flex-1">
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
              <AppText
                className="mt-2"
                style={{ fontSize: 16, lineHeight: 20, fontWeight: "800" }}
              >
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
              <View className="mt-2">
                <StatusChip
                  label={
                    unlockChore?.state === "submitted"
                      ? "Waiting for parent"
                      : "Not submitted"
                  }
                  tone="neutral"
                  icon={
                    <DirectionCIcon
                      name={
                        unlockChore?.state === "submitted"
                          ? "waiting"
                          : "document"
                      }
                      color={DirectionC.color.inkMuted}
                      size={14}
                    />
                  }
                />
              </View>
            </View>
          </View>
          {unlockChore && onOpenChore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View chore"
              className="mt-3 h-[52px] overflow-hidden rounded-control"
              onPress={() => onOpenChore(unlockChore.occurrenceId)}
            >
              <LinearGradient
                colors={["#5B9A89", "#3F7D70"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText
                  color="white"
                  style={{ fontSize: 18, lineHeight: 22, fontWeight: "700" }}
                >
                  View chore
                </AppText>
                <View className="absolute right-4">
                  <DirectionCIcon
                    name="chevron"
                    color={DirectionC.color.white}
                    size={22}
                  />
                </View>
              </LinearGradient>
            </Pressable>
          ) : (
            <Surface tone="mint" elevated={false} className="mt-3 p-3">
              <AppText
                variant="bodySmall"
                color="action"
                className="text-center"
              >
                {unlockChore?.state === "submitted"
                  ? "Waiting for Parent approval."
                  : "Open Home to view or submit this chore."}
              </AppText>
            </Surface>
          )}
        </Surface>

        <AppText
          className="mt-[15px]"
          style={{ fontSize: 26, lineHeight: 31, fontWeight: "900" }}
        >
          How Extras open
        </AppText>
        <View className="relative min-h-[224px]">
          <View className="w-[74%]">
            {[
              ["1", "Do the chore", artwork.bedroom],
              ["2", "Submit your work", submitStepArtwork],
              ["3", "Parent approves", parentAvatarArtwork],
            ].map(([number, label, source], index) => (
              <Surface
                key={number as string}
                className={`${index === 0 ? "mt-1" : "mt-[3px]"} min-h-[62px] flex-row items-center px-2 py-1.5`}
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full ${index === 0 ? "bg-actionSoftStrong" : index === 1 ? "bg-infoSoftStrong" : "bg-urgencySoft"}`}
                >
                  <AppText variant="cardTitle">{number as string}</AppText>
                </View>
                <View className="ml-2 h-12 w-12 overflow-hidden rounded-control bg-[#F7EDDF]">
                  <Image
                    source={source}
                    className="h-12 w-12"
                    contentFit="contain"
                    accessible={false}
                  />
                </View>
                <View className="ml-2 flex-1">
                  <AppText variant="label" numberOfLines={2}>
                    {label as string}
                  </AppText>
                  {index === 2 ? (
                    <AppText variant="caption" color="ink-muted">
                      Approval opens Extras.
                    </AppText>
                  ) : null}
                </View>
              </Surface>
            ))}
          </View>

          <Image
            source={oneStepNoteArtwork}
            className="absolute -right-[39px] -top-[49px] h-[160px] w-[150px]"
            contentFit="contain"
            accessible={false}
          />
          <View className="absolute -right-[32px] bottom-0 h-[201px] w-[111px] overflow-hidden">
            <Image
              source={extrasArtwork}
              className="absolute -right-1 h-[201px] w-[220px]"
              contentFit="contain"
              accessible={false}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="pb-4">
      <Surface
        tone="mint"
        elevated={false}
        className="mt-[5px] h-[90px] flex-row items-center px-[6px] py-1"
      >
        <View className="h-[90px] w-[92px] items-center justify-center">
          <Image
            source={extrasOpenLockArtwork}
            className="h-28 w-28"
            contentFit="contain"
            accessible={false}
          />
        </View>
        <View className="ml-2 flex-1">
          <AppText style={{ fontSize: 22, lineHeight: 27, fontWeight: "900" }}>
            Extras are open
          </AppText>
          <AppText style={{ fontSize: 14, lineHeight: 20, fontWeight: "500" }}>
            {gate.currentUnlockOccurrence?.title ?? "Your Unlock Chore"} was
            approved.
          </AppText>
        </View>
      </Surface>

      <Surface
        tone="lavender"
        elevated={false}
        className="mt-2 h-[62px] flex-row items-center px-4 py-1"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoftStrong">
          <DirectionCIcon
            name="unclaim"
            color={DirectionC.color.ink}
            size={25}
          />
        </View>
        <View className="ml-3 flex-1">
          <AppText style={{ fontSize: 16, lineHeight: 20, fontWeight: "800" }}>
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

      <AppText variant="sectionTitle" className="mt-[11px]">
        Available now
      </AppText>
      {myClaim ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Resolve your active claim before claiming another Extra.
        </AppText>
      ) : null}
      <View className="mt-1 gap-1.5">
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
                      <DirectionCIcon
                        name="tag"
                        color={DirectionC.color.coral}
                        size={22}
                      />
                      <AppText
                        variant="cardTitle"
                        color="urgency"
                        className="ml-2"
                      >
                        {selectedClaim.valueSek} kr
                      </AppText>
                    </View>
                    <View className="flex-1 flex-row items-center rounded-control bg-urgencySoft px-3 py-2">
                      <DirectionCIcon
                        name="clock"
                        color={DirectionC.color.coral}
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
                    className="mt-3 flex-row items-center p-4"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSoftStrong">
                      <DirectionCIcon
                        name="link"
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

                  <View className="mt-5">
                    <AppText variant="cardTitle">What happens next?</AppText>
                    <Surface
                      tone="mint"
                      elevated={false}
                      className="mt-2 flex-row items-center p-1.5"
                    >
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-action">
                        <DirectionCIcon
                          name="check"
                          color={DirectionC.color.white}
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
                        <DirectionCIcon
                          name="close"
                          color={DirectionC.color.white}
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
                          Deadline{" "}
                          {formatDeadlineSentence(
                            selectedClaim.deadlineAt,
                            selectedClaim.timezone,
                          )}
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
                        name="link"
                        color={DirectionC.color.ink}
                        size={28}
                      />
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
                    <DirectionCIcon
                      name="chevron"
                      color={DirectionC.color.white}
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
                    <DirectionCIcon
                      name="chevron"
                      color={DirectionC.color.white}
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
                    className="min-h-[140px] flex-row items-center bg-[#F7EDDF] p-3"
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
                    hideSubmitButton
                    onControlStateChange={setSubmissionControlState}
                    footerBeforeSubmit={
                      <Surface
                        tone="lavender"
                        elevated={false}
                        className="mt-4 min-h-[100px] flex-row items-center overflow-hidden p-0 pr-3"
                      >
                        <View className="relative h-[92px] w-[84px]">
                          <Image
                            source={parentAvatarArtwork}
                            className="h-[92px] w-[84px]"
                            contentFit="cover"
                            accessible={false}
                          />
                          <View className="absolute bottom-2 right-0 h-9 w-9 items-center justify-center rounded-full bg-action">
                            <DirectionCIcon
                              name="check"
                              color={DirectionC.color.white}
                              size={21}
                            />
                          </View>
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
                      <DirectionCIcon
                        name="chevron"
                        color={DirectionC.color.white}
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
                        <DirectionCIcon
                          name="brokenLink"
                          color={DirectionC.color.ink}
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
              className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
            >
              <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
              <View className="mt-3 self-center">
                <ChoreArtwork title={lockedCandidate.title} detail />
              </View>
              <AppText variant="sectionTitle" className="mt-3 text-center">
                Claim {lockedCandidate.title}?
              </AppText>
              <View className="mt-2 flex-row items-center justify-center">
                <DirectionCIcon
                  name="money"
                  color={DirectionC.color.greenDeep}
                  size={22}
                />
                <AppText variant="cardTitle" color="action" className="ml-2">
                  {lockedCandidate.valueSek} kr
                </AppText>
                <View className="mx-4 h-7 w-px bg-line" />
                <DirectionCIcon
                  name="clock"
                  color={DirectionC.color.coral}
                  size={22}
                />
                <AppText color="urgency" className="ml-2">
                  {formatDeadline(
                    lockedCandidate.deadlineAt,
                    lockedCandidate.timezone,
                  )}
                </AppText>
              </View>
              <Surface
                tone="coral"
                elevated={false}
                className="mt-4 flex-row items-center p-4"
              >
                <View className="h-14 w-14 items-center justify-center rounded-full bg-urgencySoft">
                  <DirectionCIcon
                    name="lock"
                    color={DirectionC.color.coral}
                    size={29}
                  />
                </View>
                <View className="ml-4 flex-1">
                  <AppText variant="cardTitle" color="urgency">
                    Locked immediately
                  </AppText>
                  <AppText variant="bodySmall" className="mt-1">
                    {lockExplanation(lockedCandidate.commitment)}
                  </AppText>
                </View>
              </Surface>
              <View className="mt-3 flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-urgencySoft">
                  <AppText color="urgency" className="font-black">
                    −
                  </AppText>
                </View>
                <AppText variant="bodySmall" className="ml-3 flex-1">
                  If you miss this locked chore, {lockedCandidate.valueSek} kr
                  will be deducted from your Running Balance.
                </AppText>
              </View>
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
    </View>
  );
}
