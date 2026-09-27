import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Backpack,
  ChoreIcon,
  Floating,
  LockClunk,
  PulseRings,
  StarBuddy,
  Starfield,
  UnclaimKeys,
  useEntrance,
  useLoop,
} from "@/components/art";
import { Easings } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText, HoldButton, ThemeScope } from "@/design-system";
import { questTokens as tokens } from "@/design-system/theme";
import { useHoldCelebrations } from "@/lib/celebration-gate";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatTime, relativeDayLabel } from "../child-access/chore-format";
import {
  Chip,
  FlippingHourglass,
  Panel,
  SentOverlay,
  StatePill,
} from "../child-access/quest-card-parts";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";
import type { ClaimableChoresViewModel } from "./claimable-chores-view";

type ClaimedQuest = ClaimableChoresViewModel["claimedOccurrences"][number];
type Allowance = ClaimableChoresViewModel["unclaimAllowance"];
type Redo = { deadlineAt: number; canSubmitRedo: boolean };

type Props = {
  claim: ClaimedQuest | undefined;
  redo: Redo | undefined;
  unclaimAllowance: Allowance;
  submitting: boolean;
  /** Whether sending work (first attempt / redo) is wired up here. */
  canSubmitFirst: boolean;
  canSubmitRedo: boolean;
  initialUnclaimOpen?: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSubmit: (
    attempt: 1 | 2,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<string | null>;
  /** Resolves to an error message, or null on success. */
  onUnclaim: () => Promise<string | null>;
};

const LEAVE_MS = 650;

function moment(timestamp: number, tz: string) {
  return `${relativeDayLabel(timestamp, tz)}, ${formatTime(timestamp, tz)}`;
}

/**
 * The Extra in your backpack, as a full-screen quest card. Tells the claim's
 * story visually: the unclaim window closing on a timeline, what's at stake
 * once it's locked, and sending the work with a deliberate hold.
 */
export function ClaimedQuestCard(props: Props) {
  useHoldCelebrations(props.claim !== undefined);
  return (
    <Modal
      visible={props.claim !== undefined}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={props.onClose}
    >
      {props.claim ? (
        <ThemeScope mode="quest">
          <CardBody {...props} claim={props.claim} />
        </ThemeScope>
      ) : null}
    </Modal>
  );
}

function CardBody({
  claim,
  redo,
  unclaimAllowance,
  submitting,
  canSubmitFirst,
  canSubmitRedo,
  initialUnclaimOpen = false,
  onClose,
  onSubmit,
  onUnclaim,
}: Props & { claim: ClaimedQuest }) {
  const insets = useSafeAreaInsets();
  const tz = claim.timezone;
  const [evidenceId, setEvidenceId] =
    useState<Id<"submissionEvidenceUploads">>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [unclaimOpen, setUnclaimOpen] = useState(initialUnclaimOpen);
  // Read once on open: the server's canUnclaim can go stale while the card
  // sits open past the lock time.
  const [openedAt] = useState(() => Date.now());
  const sending = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const isRedo = claim.claimState === "redo_required";
  const canUnclaim =
    claim.claimState === "claimed" &&
    Boolean(claim.commitment?.canUnclaim) &&
    openedAt < (claim.commitment?.lockAt ?? 0);
  const locked = claim.claimState === "claimed" && !canUnclaim;
  const canSend = isRedo
    ? canSubmitRedo && Boolean(redo?.canSubmitRedo)
    : claim.claimState === "claimed" && canSubmitFirst;
  const attempt: 1 | 2 = isRedo ? 2 : 1;
  const pillState = locked ? "locked" : claim.claimState;
  const dueAt = isRedo && redo ? redo.deadlineAt : claim.deadlineAt;

  async function send(id = evidenceId) {
    if (sending.current) return;
    sending.current = true;
    setSendError(null);
    const error = await onSubmit(attempt, id);
    sending.current = false;
    if (error) setSendError(error);
    else setSent(true);
  }

  // Close the sheet first, then the card, so the two never dismiss at once.
  function finishUnclaim() {
    setUnclaimOpen(false);
    closeTimer.current = setTimeout(onClose, 280);
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <Starfield seed={claim.title.length + 29} />

      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close quest"
          onPress={onClose}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" color={tokens.ink} size={18} />
        </Pressable>
        <StatePill state={pillState} />
        <View className="h-11 w-11" />
      </View>

      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: canSend ? 160 : 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Hero
          title={claim.title}
          value={claim.valueSek}
          redo={isRedo}
          waiting={claim.claimState === "submitted"}
        />

        <AppText variant="display" className="mt-5 text-center">
          {claim.title}
        </AppText>

        <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
          <Chip icon="star" tone="gold" label={`+${claim.valueSek} kr`} />
          <Chip
            icon={isRedo ? "redo" : "clock"}
            tone={isRedo ? "pink" : "muted"}
            label={`${isRedo ? "Redo due" : "Due"} ${moment(dueAt, tz)}`}
          />
        </View>

        <View className="mt-6 gap-3">
          {claim.claimState === "submitted" ? (
            <Panel art={<FlippingHourglass />} title="A Parent is checking">
              It stays in your backpack until it’s approved — then you can pick
              another bonus quest.
            </Panel>
          ) : null}

          {isRedo ? (
            <Panel
              art={
                <View className="h-16 w-16 items-center justify-center rounded-full bg-pink">
                  <Icon name="redo" color={tokens.night} size={28} />
                </View>
              }
              title="One redo"
              tone="pink"
            >
              {canSend
                ? `Fix it and send it again by ${moment(dueAt, tz)}. There’s no second redo.`
                : "The redo time is over, so this one can’t be sent again."}
            </Panel>
          ) : null}

          {canUnclaim && claim.commitment ? (
            <CommitmentStrip
              claimedAt={claim.claimedAt}
              lockAt={claim.commitment.lockAt}
              deadlineAt={claim.deadlineAt}
              tz={tz}
            />
          ) : null}

          {locked ? (
            <Panel art={<LockClunk size={64} />} title="Locked in">
              {claim.commitment?.lockReason === "allowance_exhausted"
                ? "You’re out of unclaim keys this week, so this quest is yours to finish."
                : "The unclaim window has closed, so this quest is yours to finish."}
            </Panel>
          ) : null}

          {locked || isRedo ? <Stakes value={claim.valueSek} /> : null}

          {claim.description ? (
            <View className="rounded-large bg-surface p-4">
              <AppText
                variant="label"
                color="ink-muted"
                className="uppercase tracking-[1.2px]"
              >
                Your mission
              </AppText>
              <AppText className="mt-1.5 font-body-bold text-[16px] leading-[23px]">
                {claim.description}
              </AppText>
            </View>
          ) : null}

          {canSend ? (
            <ChildSubmissionActions
              occurrenceId={claim.occurrenceId}
              attemptNumber={attempt}
              disabled={submitting}
              submitting={submitting}
              submitLabel={isRedo ? "Send redo" : "Send for review"}
              submittingLabel="Sending…"
              hideSubmitButton
              onControlStateChange={(state) => {
                setEvidenceId(state.evidenceUploadIntentId);
                setPhotoBusy(state.busy && !submitting);
              }}
              onSubmit={(id) => send(id)}
            />
          ) : null}

          <BuddyNote
            text={
              claim.claimState === "submitted"
                ? "Fingers crossed!"
                : isRedo
                  ? "You can fix this. I believe in you!"
                  : "Bonus quest time — let’s go!"
            }
          />

          {canUnclaim ? (
            <Pressable
              testID="child-active-claim-unclaim"
              accessibilityRole="button"
              accessibilityLabel="Unclaim this quest"
              accessibilityHint="Uses one of your weekly unclaims"
              onPress={() => setUnclaimOpen(true)}
              className="mt-1 min-h-[44px] flex-row items-center justify-center gap-2 self-center px-4"
            >
              <Icon name="key" color={tokens.inkMuted} size={15} />
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="font-body-bold underline"
              >
                Use a key to drop this quest
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {canSend ? (
        <View
          className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          {sendError ? (
            <AppText
              variant="bodySmall"
              className="mb-2 text-center font-body-bold"
              style={{ color: tokens.pink }}
            >
              {sendError}
            </AppText>
          ) : null}
          <HoldButton
            testID={`${isRedo ? "claimable-redo-submit" : "claimable-submit"}-${claim.claimId}`}
            label={
              isRedo ? "Hold to send your redo" : "Hold to send to a Parent"
            }
            holdingLabel="Keep holding…"
            loading={submitting}
            disabled={photoBusy}
            leading={
              <Icon name="checkShield" color={tokens.onPrimary} size={20} />
            }
            onComplete={() => void send()}
          />
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-2 text-center"
          >
            {claim.valueSek} kr is added after a Parent approves.
          </AppText>
        </View>
      ) : null}

      {unclaimOpen ? (
        <UnclaimSheet
          claim={claim}
          allowance={unclaimAllowance}
          onKeep={() => setUnclaimOpen(false)}
          onUnclaim={onUnclaim}
          onDone={finishUnclaim}
        />
      ) : null}

      {sent ? <SentOverlay onDone={onClose} /> : null}
    </View>
  );
}

/** The quest on a glowing disc, its coin value tucked on the rim. */
function Hero({
  title,
  value,
  redo,
  waiting,
}: {
  title: string;
  value: number;
  redo: boolean;
  /** Nothing to do while a Parent checks, so the rings rest. */
  waiting: boolean;
}) {
  const spin = useLoop({ duration: 24000, easing: Easings.linear });
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));

  return (
    <View className="mt-3 items-center">
      <View className="h-[150px] w-[150px] items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: 75,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: tokens.gold,
              opacity: 0.5,
            },
            ringStyle,
          ]}
        />
        {waiting ? (
          <View className="absolute h-[112px] w-[112px] rounded-full bg-surface" />
        ) : (
          <View className="absolute">
            <PulseRings
              size={112}
              color={redo ? tokens.pink : tokens.gold}
              duration={2600}
            >
              <View className="absolute h-[112px] w-[112px] rounded-full bg-surface" />
            </PulseRings>
          </View>
        )}
        <Floating distance={4} duration={3600}>
          <ChoreIcon title={title} size={84} />
        </Floating>
        <View className="absolute bottom-1 right-1 h-11 w-11 items-center justify-center rounded-full border-b-4 border-goldShade bg-gold">
          <AppText className="font-display text-[15px] leading-[17px] text-night">
            {value}
          </AppText>
          <AppText className="font-body-heavy text-[9px] leading-[10px] text-night">
            kr
          </AppText>
        </View>
      </View>
    </View>
  );
}

/**
 * Claimed → lock → due on one track. The stretch before the lock is when a key
 * can still drop the quest; the marker slides in to show where "now" is.
 */
function CommitmentStrip({
  claimedAt,
  lockAt,
  deadlineAt,
  tz,
}: {
  claimedAt: number;
  lockAt: number;
  deadlineAt: number;
  tz: string;
}) {
  const [width, setWidth] = useState(0);
  const arrive = useEntrance({ duration: 300 });
  const span = Math.max(1, deadlineAt - claimedAt);
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const lockFraction = clamp((lockAt - claimedAt) / span);
  // Read once when the card opens; the marker doesn't need to tick.
  const [openedAt] = useState(() => Date.now());
  const nowFraction = clamp((openedAt - claimedAt) / span);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(arrive.get(), [0, 1], [0, nowFraction * width]),
      },
    ],
  }));

  return (
    <View
      className="rounded-large bg-surface p-4"
      accessible
      accessibilityLabel={`You can unclaim until ${moment(lockAt, tz)}. After that it’s locked until it’s due ${moment(deadlineAt, tz)}.`}
    >
      <AppText
        variant="label"
        color="ink-muted"
        className="uppercase tracking-[1.2px]"
      >
        Unclaim window
      </AppText>
      <AppText className="mt-1 font-body-heavy text-[16px] leading-[22px]">
        You can drop it until {stripTime(lockAt, tz).replace(/^T/, "t")}
      </AppText>

      <View
        className="mt-9 h-8 justify-center"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <View className="h-2.5 flex-row overflow-hidden rounded-full">
          <View
            className="h-full bg-accent"
            style={{ flex: Math.max(lockFraction, 0.001) }}
          />
          <View
            className="h-full bg-gold"
            style={{ flex: Math.max(1 - lockFraction, 0.001) }}
          />
        </View>
        {width > 0 ? (
          <>
            <View
              pointerEvents="none"
              className="absolute flex-row items-center gap-1 rounded-full bg-nightRaised px-2 py-0.5"
              style={{
                // Pill stays inside the card; the tick below marks the spot.
                left: Math.min(
                  Math.max(lockFraction * width - 34, 0),
                  width - 68,
                ),
                top: -26,
              }}
            >
              <Icon name="lock" color={tokens.gold} size={10} />
              <AppText className="font-body-heavy text-[11px]">
                {formatTime(lockAt, tz)}
              </AppText>
            </View>
            <View
              pointerEvents="none"
              className="absolute h-3 w-0.5 rounded-full bg-gold"
              style={{ left: lockFraction * width - 1, top: -4 }}
            />
          </>
        ) : null}
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[{ position: "absolute", left: -12, top: 0 }, markerStyle]}
          >
            <View className="h-8 w-6 items-center justify-center rounded-full border-2 border-night bg-star" />
          </Animated.View>
        ) : null}
      </View>

      <View className="mt-2 flex-row justify-between">
        <StripLabel title="Claimed" time={stripTime(claimedAt, tz)} />
        <StripLabel
          title="Due"
          time={stripTime(deadlineAt, tz)}
          align="right"
        />
      </View>
    </View>
  );
}

/** "16:00" today, otherwise "Tomorrow 16:00" / "Fri 3 Oct 16:00". */
function stripTime(timestamp: number, tz: string) {
  const day = relativeDayLabel(timestamp, tz);
  const time = formatTime(timestamp, tz);
  return day === "today"
    ? time
    : `${day[0].toUpperCase()}${day.slice(1)} ${time}`;
}

function StripLabel({
  title,
  time,
  align = "left",
}: {
  title: string;
  time: string;
  align?: "left" | "center" | "right";
}) {
  const textAlign =
    align === "left"
      ? "text-left"
      : align === "center"
        ? "text-center"
        : "text-right";
  return (
    <View>
      <AppText variant="caption" color="ink-muted" className={textAlign}>
        {title}
      </AppText>
      <AppText className={`font-body-heavy text-[14px] ${textAlign}`}>
        {time}
      </AppText>
    </View>
  );
}

/** What finishing vs missing a locked Extra means, side by side. */
function Stakes({ value }: { value: number }) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1 items-center rounded-large bg-surface px-3 py-3.5">
        <AppText variant="caption" color="ink-muted">
          Finish it
        </AppText>
        <AppText className="mt-0.5 font-display text-[22px] text-primary">
          +{value} kr
        </AppText>
      </View>
      <View className="flex-1 items-center rounded-large bg-surface px-3 py-3.5">
        <AppText variant="caption" color="ink-muted">
          Miss it
        </AppText>
        <AppText className="mt-0.5 font-display text-[22px] text-pink">
          −{value} kr
        </AppText>
      </View>
    </View>
  );
}

function BuddyNote({ text }: { text: string }) {
  return (
    <View className="mt-2 flex-row items-end gap-2">
      <StarBuddy size={58} mood="wave" />
      <View className="mb-6 flex-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3">
        <AppText className="font-body-heavy text-[15px]">{text}</AppText>
      </View>
    </View>
  );
}

/**
 * Dropping a quest costs a key. On confirm the key lifts off the row and the
 * quest rises out of the backpack, so the cost is seen, not just read.
 */
function UnclaimSheet({
  claim,
  allowance,
  onKeep,
  onUnclaim,
  onDone,
}: {
  claim: ClaimedQuest;
  allowance: Allowance;
  onKeep: () => void;
  onUnclaim: () => Promise<string | null>;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keysAfter = Math.max(0, allowance.remainingUnclaims - 1);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(doneTimer.current), []);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setLeaving(true);
    const started = Date.now();
    const result = await onUnclaim();
    if (result) {
      setLeaving(false);
      setBusy(false);
      setError(result);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Let the key and quest finish leaving before the card closes.
    doneTimer.current = setTimeout(
      onDone,
      Math.max(0, LEAVE_MS - (Date.now() - started)),
    );
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() => {
        if (!busy) onKeep();
      }}
    >
      <ThemeScope mode="quest">
        <View className="flex-1 justify-end bg-scrim">
          <View
            className="rounded-t-sheet bg-surface px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <View className="h-1.5 w-12 self-center rounded-full bg-nightRaised" />
            <View className="mt-4 items-center">
              <Backpack size={120} title={claim.title} leaving={leaving} />
            </View>
            <AppText variant="sectionTitle" className="mt-3 text-center">
              Drop {claim.title}?
            </AppText>
            <AppText
              color="ink-muted"
              className="mt-1.5 text-center font-body-bold"
            >
              It goes back to the bonus quests for someone else to claim. Your
              balance doesn’t change.
            </AppText>

            <View className="mt-5 flex-row items-center justify-between rounded-large bg-canvas px-4 py-3">
              <View>
                <AppText className="font-body-heavy text-[15px]">
                  Costs 1 key
                </AppText>
                <AppText variant="caption" color="ink-muted" className="mt-0.5">
                  You’ll have {keysAfter} of {allowance.allowance} left this
                  week
                </AppText>
              </View>
              <UnclaimKeys
                total={allowance.allowance}
                remaining={allowance.remainingUnclaims}
                spending={leaving}
              />
            </View>

            {error ? (
              <AppText
                variant="bodySmall"
                className="mt-3 text-center font-body-bold"
                style={{ color: tokens.pink }}
              >
                {error}
              </AppText>
            ) : null}

            <ActionButton
              className="mt-5"
              label="Use 1 key"
              tone="destructive"
              leading={<Icon name="key" color={tokens.white} size={18} />}
              loading={busy}
              onPress={() => void confirm()}
            />
            <ActionButton
              className="mt-1"
              label="Keep it"
              tone="quiet"
              disabled={busy}
              onPress={onKeep}
            />
          </View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
