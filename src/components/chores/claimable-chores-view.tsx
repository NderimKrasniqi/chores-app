import { amountFontSize } from "@/lib/amount-size";
import {
  Airlock,
  CommitmentTrack,
  LaunchPad,
  ChoreIcon,
  LockClunk,
  StarBuddy,
  UnclaimKeys,
} from "@/components/art";
import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface, SheetBody } from "@/design-system";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { userErrorMessage } from "@/lib/errors";
import { useMinuteNow } from "@/lib/use-hour-now";

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
        note: "Launch control stays shut for now. Your next Unlock Chore can open it.",
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
      <AppText
        numberOfLines={1}
        className="font-display text-night"
        style={{ fontSize: amountFontSize(value, 18, 3) }}
      >
        {value}{" "}
        <AppText className="font-body-heavy text-[10px] leading-[12px] text-night">
          kr
        </AppText>
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
  // Someone else won the first-come race: say so kindly, by name (the
  // server says who).
  if (/already been claimed/i.test(message)) {
    const winner = /claimed by (.+?)\.?$/i.exec(message)?.[1];
    return winner
      ? `${winner} got it first! Pick another mission.`
      : "Too slow — someone else just grabbed that one! Pick another.";
  }
  return message || "Could not complete this action. Please try again.";
}

function lockExplanation(commitment: ClaimCommitmentStatus) {
  if (commitment.lockReason === "time_window") {
    return "It’s less than 2 hours until it’s due, so once it’s launched you can’t abort.";
  }
  if (commitment.lockReason === "allowance_exhausted") {
    return "You’ve used all your abort passes this week, so once it’s launched you can’t abort.";
  }
  return "Once it’s launched you can’t abort.";
}

/** "1 h 20 min", "25 min", "under a minute". */
function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * One mission on the board: its reward, when it's due, and the promise it
 * asks for — the track shows how long you could still abort, and where it
 * locks. A mission a sibling launched stays on the board, faded, so the
 * shared, first-come pool is visible.
 */
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
  const now = useMinuteNow();
  if (claimedBy) {
    return (
      <View
        className="flex-row items-center gap-3 rounded-large border-2 border-dashed border-nightRaised px-3.5 py-2.5"
        style={{ opacity: 0.7 }}
      >
        <ValueCoin value={occurrence.valueSek} />
        <View className="flex-1">
          <AppText className="font-body-heavy text-[15px]" numberOfLines={1}>
            {occurrence.title}
          </AppText>
          <AppText variant="caption" color="ink-muted" numberOfLines={1}>
            {claimedBy}
          </AppText>
        </View>
        <Icon name="person" color={themeColors.inkMuted} size={18} />
      </View>
    );
  }

  // Past the lock point, launching it locks it at once.
  const locksNow =
    occurrence.commitment.isImmediatelyLocked ||
    occurrence.commitment.lockAt <= now;

  return (
    <View className="rounded-large bg-surface px-3.5 pb-3 pt-3">
      <View className="flex-row items-center gap-3">
        <ValueCoin value={occurrence.valueSek} />
        <View className="flex-1">
          <AppText
            className="font-body-heavy text-[16px] leading-[21px]"
            numberOfLines={2}
          >
            {occurrence.title}
          </AppText>
          <AppText
            variant="caption"
            color={locksNow ? "pink" : "ink-muted"}
            numberOfLines={1}
          >
            {locksNow
              ? `Locks at launch · ${formatDeadline(occurrence.deadlineAt, occurrence.timezone)}`
              : formatDeadline(occurrence.deadlineAt, occurrence.timezone)}
          </AppText>
        </View>
        {onClaim ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Launch ${occurrence.title}${locksNow ? ", locks right away" : ""}`}
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
                  {loading ? "…" : "Launch"}
                </AppText>
              </Animated.View>
            )}
          </Pressable>
        ) : null}
      </View>
      <View className="mt-2.5">
        <CommitmentTrack
          now={now}
          lockAt={occurrence.commitment.lockAt}
          deadlineAt={occurrence.deadlineAt}
          immediate={locksNow}
        />
        <View className="mt-0.5 flex-row justify-between">
          <AppText variant="caption" color="ink-muted" style={{ fontSize: 11 }}>
            {locksNow
              ? "No abort once launched"
              : `Abort until ${formatDeadline(occurrence.commitment.lockAt, occurrence.timezone).replace(/^(Today|Tomorrow)/, (day) => day.toLowerCase())}`}
          </AppText>
          <AppText variant="caption" color="pink" style={{ fontSize: 11 }}>
            Miss it: −{occurrence.valueSek} kr
          </AppText>
        </View>
      </View>
    </View>
  );
}

/**
 * One pad, one mission: your active Extra stands on the launch pad, and the
 * ring around it is the abort window running out. Once it closes you're
 * committed: finish by the deadline or lose the reward. An empty pad
 * invites launching one. Makes "one at a time" and "a promise is a
 * promise" visible.
 */
function PadSlot({
  claim,
  onOpen,
}: {
  claim: ClaimableChoresViewModel["claimedOccurrences"][number] | undefined;
  onOpen: () => void;
}) {
  const now = useMinuteNow();
  // A mission launched while you watch lands on the pad; one that was
  // already there when the tab opened just stands.
  const [firstClaimId] = useState(claim?.claimId);
  const launched = claim !== undefined && claim.claimId !== firstClaimId;
  // Past the lock time it's committed, even before the server's next
  // refresh says so.
  const committed =
    claim?.claimState === "claimed" &&
    (!claim.commitment?.canUnclaim ||
      (claim.commitment?.lockAt ?? claim.deadlineAt) <= now);
  // The ring snapping shut plays once, the first look after a lock.
  const firstLockLook = useFirstSighting(
    committed && claim ? `lock.${claim.claimId}` : undefined,
  );

  if (!claim) {
    return (
      <View className="mt-4 flex-row items-center gap-3 rounded-large border-2 border-dashed border-nightRaised py-2 pl-2 pr-4">
        <LaunchPad size={64} state="empty" />
        <View className="flex-1">
          <AppText className="font-body-heavy text-[16px] leading-[21px]">
            Launch pad is free
          </AppText>
          <AppText variant="caption" color="ink-muted" className="mt-0.5">
            Pick a mission below. You can abort until it locks, after that it’s
            a promise.
          </AppText>
        </View>
      </View>
    );
  }

  const lockAt = claim.commitment?.lockAt ?? claim.deadlineAt;
  const abortUsed =
    (now - claim.claimedAt) / Math.max(1, lockAt - claim.claimedAt);
  const padState =
    claim.claimState === "submitted"
      ? "submitted"
      : claim.claimState === "redo_required"
        ? "redo"
        : committed
          ? "locked"
          : "ready";
  const tag =
    padState === "submitted"
      ? { label: "Mission report sent", color: themeColors.inkMuted }
      : padState === "redo"
        ? { label: "Redo needed", color: themeColors.pink }
        : padState === "locked"
          ? { label: "Committed", color: themeColors.pink }
          : { label: "On the pad", color: themeColors.accent };
  const line =
    padState === "submitted"
      ? "A Parent is checking it"
      : padState === "redo"
        ? "Fix it and send it again"
        : padState === "locked"
          ? `Finish by ${formatTime(claim.deadlineAt, claim.timezone)} or lose ${claim.valueSek} kr`
          : `Abort window closes in ${formatDuration(lockAt - now)}`;

  return (
    <Animated.View
      key={claim.claimId}
      entering={
        launched ? FadeInUp.duration(500).easing(Easings.out) : undefined
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open your mission ${claim.title}, ${claim.valueSek} kr. ${tag.label}. ${line}.`}
        onPress={onOpen}
        className="mt-4"
      >
        {({ pressed }) => (
          <Animated.View
            className="flex-row items-center gap-3 rounded-large bg-surface py-2 pl-2 pr-4"
            style={[
              { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
              pressTransition,
            ]}
          >
            <LaunchPad
              size={72}
              state={padState}
              title={claim.title}
              abortUsed={abortUsed}
              snap={padState === "locked" && firstLockLook === true}
            />
            <View className="flex-1">
              <AppText
                variant="label"
                className="uppercase tracking-[1.1px]"
                style={{ color: tag.color }}
              >
                {tag.label}
              </AppText>
              <AppText
                className="mt-0.5 font-body-heavy text-[16px] leading-[21px]"
                numberOfLines={1}
              >
                {claim.title} · +{claim.valueSek} kr
              </AppText>
              <AppText
                variant="caption"
                color={padState === "locked" ? "pink" : "ink-muted"}
                className="mt-0.5"
              >
                {line}
              </AppText>
            </View>
            <Icon name="chevron" color={themeColors.inkMuted} size={20} />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/**
 * True only on the first look at the open chest after a given unlock, so
 * the big rays-and-coins card is a moment, not wallpaper. Later visits (and
 * a failed read) get the calm strip.
 */
function useFirstSighting(key: string | undefined) {
  // undefined = still reading; per key so a new unlock starts fresh.
  const [result, setResult] = useState<{ key: string; first: boolean }>();
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const storageKey = `chest-seen.${key}`;
    SecureStore.getItemAsync(storageKey)
      .then((seen) => {
        if (cancelled) return;
        setResult({ key, first: !seen });
        if (!seen) return SecureStore.setItemAsync(storageKey, "1");
      })
      .catch(() => {
        if (!cancelled) setResult({ key, first: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  if (!key) return false;
  return result?.key === key ? result.first : undefined;
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
    reason?: string;
  }[];
  onSubmitRedo?: (
    claimId: Id<"choreClaims">,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<void>;
  onOpenChore?: (occurrenceId: Id<"choreOccurrences">) => void;
  initialVisualState?:
    "active" | "submitted" | "unclaim" | "locked" | "redo" | "lock-sheet";
}) {
  const clockNow = useMinuteNow();
  const { gate, unclaimAllowance, claimableOccurrences, claimedOccurrences } =
    result;
  const chestFirstSighting = useFirstSighting(
    gate.canAccessClaimables
      ? gate.currentUnlockOccurrence?.occurrenceId
      : undefined,
  );
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
    // The server's flag goes stale once the lock time passes with the tab
    // open; a claim past the lock needs the "locks right away" confirmation.
    if (
      occurrence.commitment.isImmediatelyLocked ||
      occurrence.commitment.lockAt <= clockNow
    ) {
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
          <Airlock size={72} open={false} />
          <View className="flex-1">
            <AppText
              variant="label"
              color="gold"
              className="uppercase tracking-[1.2px]"
            >
              Launch control closed
            </AppText>
            <AppText variant="sectionTitle" className="mt-0.5">
              Extras are locked
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-1 font-body-bold"
            >
              Get your current Unlock Chore approved to open launch control.
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
          How launch control opens
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
              label: "A Parent approves: launch control opens!",
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
      {chestFirstSighting === undefined ? (
        <View className="mt-1 h-[76px]" />
      ) : chestFirstSighting ? (
        <View className="mt-1 flex-row items-center gap-1 overflow-hidden rounded-large bg-surface py-2 pl-1 pr-4">
          <Airlock size={72} open opening />
          <View className="flex-1">
            <AppText
              variant="label"
              color="gold"
              className="uppercase tracking-[1.2px]"
            >
              Launch control open
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
              {gate.currentUnlockOccurrence?.title ?? "your Unlock Chore"}.
              Launch one mission at a time. Open until your next Unlock Chore
              starts.
            </AppText>
          </View>
        </View>
      ) : (
        <View className="mt-1 flex-row items-center gap-2 rounded-large bg-surface py-1.5 pl-1 pr-4">
          <Airlock size={48} open />
          <View className="flex-1">
            <AppText variant="label" color="gold">
              Launch control open
            </AppText>
            <AppText variant="caption" color="ink-muted">
              Until your next Unlock Chore starts
            </AppText>
          </View>
        </View>
      )}

      <View className="mt-3 flex-row items-center gap-2.5 self-start rounded-full bg-surface py-2 pl-3 pr-3.5">
        <UnclaimKeys
          total={unclaimAllowance.allowance}
          remaining={unclaimAllowance.remainingUnclaims}
          size={18}
        />
        <AppText variant="caption" color="ink-muted" className="shrink">
          {unclaimAllowance.remainingUnclaims === 0
            ? "No abort passes left · new launches lock"
            : `${unclaimAllowance.remainingUnclaims} abort ${unclaimAllowance.remainingUnclaims === 1 ? "pass" : "passes"} left this week`}
        </AppText>
      </View>

      {actionError ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-4">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </Surface>
      ) : null}

      <PadSlot
        claim={myClaim}
        onOpen={() => myClaim && setSelectedClaimId(myClaim.claimId)}
      />

      <View className="mt-6 flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Missions</AppText>
        <AppText variant="label" color="ink-muted">
          {claimableOccurrences.length} open
        </AppText>
      </View>
      {myClaim ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          One mission at a time: finish this one to launch another.
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
              claimedBy={`${occurrence.claimedByDisplayName} launched this`}
            />
          ))}
        {claimableOccurrences.length === 0 &&
        claimedOccurrences.length === 0 ? (
          <Surface className="items-center p-6">
            <StarBuddy size={56} mood="sleepy" />
            <AppText variant="cardTitle" className="mt-3">
              No missions right now
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="mt-1 text-center"
            >
              New ones show up here. First to launch gets it.
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
                label="Launch and lock it"
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
