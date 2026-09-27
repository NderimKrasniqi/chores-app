import {
  Backpack,
  ChoreIcon,
  LockClunk,
  StarBuddy,
  TreasureChest,
  UnclaimKeys,
} from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface, SheetBody } from "@/design-system";
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { userErrorMessage } from "@/lib/errors";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatLocalDate } from "@/lib/dates";
import { ClaimedQuestCard } from "./claimed-quest-card";

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

type UnlockGateStatus = {
  icon: "clock" | "hourglass" | "redo" | "calendar" | "missed" | "lock";
  tone: "gold" | "inkMuted" | "pink";
  status: string;
  /** Button label, or null when there's nothing to do here. */
  action: string | null;
  urgent: boolean;
  note: string | null;
};

/** What the Unlock Chore needs next, told plainly for each state. */
function unlockGateStatus(
  chore: UnlockChoreSummary | undefined,
  current: ClaimableChoresViewModel["gate"]["currentUnlockOccurrence"],
): UnlockGateStatus {
  const state = chore?.state ?? current?.state;
  switch (state) {
    case "available":
      return {
        icon: "clock",
        tone: "gold",
        status: chore
          ? `Due ${formatDeadlineSentence(chore.deadlineAt, chore.timezone)}`
          : "Ready to do",
        action: "Do it now",
        urgent: true,
        note: chore ? null : "Open Quests to do this chore.",
      };
    case "redo_required":
      return {
        icon: "redo",
        tone: "pink",
        status: "A Parent asked for a redo",
        action: "Fix it now",
        urgent: true,
        note: null,
      };
    case "submitted":
      return {
        icon: "hourglass",
        tone: "inkMuted",
        status: "A Parent is checking",
        action: "View chore",
        urgent: false,
        note: null,
      };
    case "scheduled":
      return {
        icon: "calendar",
        tone: "inkMuted",
        status: chore
          ? `Opens ${formatDeadlineSentence(chore.availabilityStartsAt, chore.timezone)}`
          : "Coming up",
        action: "View chore",
        urgent: false,
        note: null,
      };
    case "missed":
    case "failed":
      return {
        icon: "missed",
        tone: "pink",
        status: "Missed this time",
        action: null,
        urgent: false,
        note: "The chest stays shut for now. Your next Unlock Chore can open it.",
      };
    default:
      return {
        icon: "lock",
        tone: "inkMuted",
        status: "Not approved yet",
        action: null,
        urgent: false,
        note: "Open Quests to view or submit this chore.",
      };
  }
}

/** Gold coin with the Extra's value. */
function ValueCoin({ value }: { value: number }) {
  return (
    <View className="h-14 w-14 items-center justify-center rounded-full border-b-4 border-goldShade bg-gold">
      <AppText className="font-display text-[18px] leading-[20px] text-night">
        {value}
      </AppText>
      <AppText className="font-body-heavy text-[10px] leading-[12px] text-night">
        kr
      </AppText>
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
  const message = userErrorMessage(error, "");
  // Someone else won the first-come race: say so kindly.
  if (/already been claimed/i.test(message)) {
    return "Too slow — someone else just grabbed that one! Pick another.";
  }
  return message || "Could not complete this action. Please try again.";
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
            <Animated.View
              className={`min-h-[44px] min-w-[84px] items-center justify-center rounded-full px-4 ${
                disabled
                  ? "bg-disabledSurface"
                  : "border-b-[3px] border-primaryShade bg-primary"
              }`}
              style={[
                {
                  transform: [
                    { scale: pressed && !disabled ? PRESS.scale : 1 },
                  ],
                },
                pressTransition,
              ]}
            >
              <AppText
                className={`font-display text-[16px] ${disabled ? "text-inkFaint" : "text-night"}`}
              >
                {loading ? "…" : "Claim"}
              </AppText>
            </Animated.View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * One pocket, one quest: the Child's active Extra rides in the backpack, and
 * an empty backpack invites picking one. Makes "one claim at a time" visible.
 */
function BackpackSlot({
  claim,
  onOpen,
}: {
  claim: ClaimableChoresViewModel["claimedOccurrences"][number] | undefined;
  onOpen: () => void;
}) {
  if (!claim) {
    return (
      <View className="mt-5 flex-row items-center gap-3 rounded-large border-2 border-dashed border-nightRaised py-2 pl-2 pr-4">
        <Backpack size={84} />
        <View className="flex-1">
          <AppText className="font-body-heavy text-[16px] leading-[21px]">
            Your backpack is empty
          </AppText>
          <AppText variant="caption" color="ink-muted" className="mt-0.5">
            It fits one bonus quest at a time. Pick one below!
          </AppText>
        </View>
      </View>
    );
  }

  const locked =
    claim.claimState === "claimed" && !claim.commitment?.canUnclaim;
  const tag =
    claim.claimState === "submitted"
      ? { label: "A Parent is checking", color: themeColors.inkMuted }
      : claim.claimState === "redo_required"
        ? { label: "Redo needed", color: themeColors.pink }
        : locked
          ? { label: "Locked in", color: themeColors.gold }
          : { label: "In your backpack", color: themeColors.accent };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open active claim ${claim.title}, ${claim.valueSek} kr. ${tag.label}.`}
      onPress={onOpen}
      className="mt-5"
    >
      {({ pressed }) => (
        <Animated.View
          className="flex-row items-center gap-3 rounded-large bg-surface py-2 pl-2 pr-4"
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          <Backpack size={84} title={claim.title} />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Icon
                name={
                  claim.claimState === "redo_required"
                    ? "redo"
                    : locked
                      ? "lock"
                      : claim.claimState === "submitted"
                        ? "hourglass"
                        : "star"
                }
                color={tag.color}
                size={13}
              />
              <AppText
                variant="label"
                className="uppercase tracking-[1.1px]"
                style={{ color: tag.color }}
              >
                {tag.label}
              </AppText>
            </View>
            <AppText
              className="mt-0.5 font-body-heavy text-[17px] leading-[22px]"
              numberOfLines={2}
            >
              {claim.title}
            </AppText>
            <AppText
              className="mt-0.5 font-display text-[18px]"
              style={{ color: themeColors.gold }}
            >
              +{claim.valueSek} kr
            </AppText>
          </View>
          <Icon name="chevron" color={themeColors.inkMuted} size={20} />
        </Animated.View>
      )}
    </Pressable>
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
  initialVisualState?:
    "active" | "submitted" | "unclaim" | "locked" | "redo" | "lock-sheet";
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
    useState<Id<"choreClaims"> | null>(
      initialVisualState && initialVisualState !== "lock-sheet"
        ? (claimedOccurrences.find((occurrence) => occurrence.isMine)
            ?.claimId ?? null)
        : null,
    );
  const [lockedCandidateId, setLockedCandidateId] =
    useState<Id<"choreOccurrences"> | null>(
      initialVisualState === "lock-sheet"
        ? (claimableOccurrences[0]?.occurrenceId ?? null)
        : null,
    );
  const [actionError, setActionError] = useState<string | null>(null);
  // An unclaimed claim leaves the query before its card finishes animating
  // out, so the card keeps a snapshot until it closes.
  const [leavingClaim, setLeavingClaim] = useState<
    ClaimableChoresViewModel["claimedOccurrences"][number] | null
  >(null);

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

  /* The claimed quest card shows these errors itself, so they're returned. */
  async function executeUnclaim(
    claim: ClaimableChoresViewModel["claimedOccurrences"][number],
  ) {
    if (busy) return "Please wait a moment and try again.";
    setActionError(null);
    setLeavingClaim(claim);
    setUnclaimingId(claim.claimId);
    try {
      await onUnclaim(claim.claimId);
      return null;
    } catch (error) {
      setLeavingClaim(null);
      return getErrorMessage(error);
    } finally {
      setUnclaimingId(null);
    }
  }

  async function executeSubmit(
    claimId: Id<"choreClaims">,
    attempt: 1 | 2,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) {
    const send = attempt === 2 ? onSubmitRedo : onSubmit;
    if (busy || !send) return "Please wait a moment and try again.";
    setActionError(null);
    setSubmittingId(claimId);
    try {
      await send(claimId, evidenceUploadIntentId);
      return null;
    } catch (error) {
      return getErrorMessage(error);
    } finally {
      setSubmittingId(null);
    }
  }

  if (!gate.canAccessClaimables) {
    const unlock = unlockGateStatus(unlockChore, gate.currentUnlockOccurrence);
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
            <ChoreIcon title={unlockChore?.title ?? "Unlock chore"} size={72} />
            <View className="flex-1">
              <AppText className="font-body-heavy text-[17px] leading-[22px]">
                {unlockChore?.title ?? "Current Unlock Chore"}
              </AppText>
              <View className="mt-1 flex-row items-center gap-1">
                <Icon
                  name={unlock.icon}
                  color={themeColors[unlock.tone]}
                  size={14}
                />
                <AppText
                  variant="caption"
                  className="flex-1"
                  style={{ color: themeColors[unlock.tone] }}
                >
                  {unlock.status}
                </AppText>
              </View>
            </View>
            {unlockChore ? <ValueCoin value={unlockChore.valueSek} /> : null}
          </View>
          {unlockChore && onOpenChore && unlock.action ? (
            <ActionButton
              className="mt-4"
              label={unlock.action}
              tone={unlock.urgent ? "primary" : "secondary"}
              onPress={() => onOpenChore(unlockChore.occurrenceId)}
              trailing={
                <Icon
                  name="chevron"
                  color={
                    unlock.urgent ? themeColors.onPrimary : themeColors.ink
                  }
                  size={20}
                />
              }
            />
          ) : null}
          {unlock.note ? (
            <View className="mt-3 rounded-control bg-nightRaised p-3">
              <AppText
                variant="bodySmall"
                className="text-center font-body-bold"
              >
                {unlock.note}
              </AppText>
            </View>
          ) : null}
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
            one Extra at a time — open until your next Unlock Chore starts.
          </AppText>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2.5 self-start rounded-full bg-surface py-2 pl-3 pr-3.5">
        <UnclaimKeys
          total={unclaimAllowance.allowance}
          remaining={unclaimAllowance.remainingUnclaims}
          size={18}
        />
        <AppText variant="caption" color="ink-muted">
          {unclaimAllowance.remainingUnclaims === 0
            ? "No unclaim keys left · new claims lock right away"
            : `${unclaimAllowance.remainingUnclaims} unclaim ${unclaimAllowance.remainingUnclaims === 1 ? "key" : "keys"} this week`}
        </AppText>
      </View>

      {actionError ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-4">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </Surface>
      ) : null}

      <BackpackSlot
        claim={myClaim}
        onOpen={() => myClaim && setSelectedClaimId(myClaim.claimId)}
      />

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Bonus quests</AppText>
        <AppText variant="label" color="ink-muted">
          {claimableOccurrences.length} available
        </AppText>
      </View>
      {myClaim ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Your backpack is full — one bonus quest at a time.
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

      <ClaimedQuestCard
        claim={selectedClaim ?? leavingClaim ?? undefined}
        redo={selectedRedo}
        unclaimAllowance={unclaimAllowance}
        submitting={
          selectedClaim !== undefined && submittingId === selectedClaim.claimId
        }
        canSubmitFirst={Boolean(onSubmit)}
        canSubmitRedo={Boolean(onSubmitRedo)}
        initialUnclaimOpen={initialVisualState === "unclaim"}
        onClose={() => {
          setSelectedClaimId(null);
          setLeavingClaim(null);
        }}
        onSubmit={(attempt, evidenceUploadIntentId) =>
          selectedClaim
            ? executeSubmit(
                selectedClaim.claimId,
                attempt,
                evidenceUploadIntentId,
              )
            : Promise.resolve(null)
        }
        onUnclaim={() =>
          selectedClaim ? executeUnclaim(selectedClaim) : Promise.resolve(null)
        }
      />

      <Modal
        transparent
        animationType="slide"
        visible={lockedCandidate !== undefined}
        onRequestClose={() => setLockedCandidateId(null)}
      >
        <View className="flex-1 justify-end bg-scrim">
          {lockedCandidate ? (
            <SheetBody className="rounded-t-sheet bg-surface px-5 pb-3 pt-3">
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

              {actionError ? (
                <AppText
                  variant="bodySmall"
                  className="mt-4 text-center font-body-bold"
                  style={{ color: themeColors.pink }}
                >
                  {actionError}
                </AppText>
              ) : null}
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
            </SheetBody>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
