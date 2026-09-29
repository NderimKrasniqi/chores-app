import { amountFontSize } from "@/lib/amount-size";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { ChoreIcon } from "@/components/art";
import { SubmissionEvidenceViewer } from "@/components/evidence/submission-evidence-viewer";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useMinuteNow } from "@/lib/use-hour-now";

import type { Id } from "../../../convex/_generated/dataModel";

export type DeckItem = {
  submissionId: Id<"choreSubmissions">;
  source: "personal" | "claimable" | "redo";
  kind: "personal" | "claimable";
  childDisplayName: string;
  title: string;
  description?: string;
  valueSek: number;
  submittedAt: number;
  /** The deadline the work was sent against (the redo deadline for a redo). */
  deadlineAt?: number;
  isUnlockChore: boolean;
  hasEvidence: boolean;
};

export type Verdict = "approve" | "redo";

const SWIPE_DISTANCE = 0.32; // of screen width
const SWIPE_VELOCITY = 800; // pt/s — a flick is enough

/**
 * Reviewing as a deck: the oldest submission is on top with the next two
 * peeking behind. Swipe right to approve, left for a redo — or use the
 * buttons (same actions, and the accessible path). The card follows the
 * finger, flies off with the gesture's velocity, and one haptic marks the
 * commit.
 */
export function ReviewDeck({
  items,
  submittedLabel,
  busy,
  onVerdict,
}: {
  items: DeckItem[];
  submittedLabel: (timestamp: number) => string;
  busy: boolean;
  /** Resolves true when the card should leave the deck. */
  onVerdict: (item: DeckItem, verdict: Verdict) => Promise<boolean>;
}) {
  const top = items[0];
  if (!top) return null;

  return (
    <View>
      <View>
        {/* Back cards sit behind; the top card and its buttons flow below. */}
        {items
          .slice(1, 3)
          .reverse()
          .map((item, reversedIndex, shown) => (
            <BackCard
              key={item.submissionId}
              item={item}
              depth={shown.length - reversedIndex}
            />
          ))}
        <TopCard
          key={top.submissionId}
          item={top}
          submittedLabel={submittedLabel}
          busy={busy}
          onVerdict={onVerdict}
        />
      </View>
    </View>
  );
}

function BackCard({ item, depth }: { item: DeckItem; depth: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        transform: [{ translateY: depth * 14 }, { scale: 1 - depth * 0.05 }],
        opacity: 1 - depth * 0.25,
      }}
    >
      <CardFace item={item} submittedLabel={() => ""} compact />
    </View>
  );
}

function TopCard({
  item,
  submittedLabel,
  busy,
  onVerdict,
}: {
  item: DeckItem;
  submittedLabel: (timestamp: number) => string;
  busy: boolean;
  onVerdict: (item: DeckItem, verdict: Verdict) => Promise<boolean>;
}) {
  const { width } = useWindowDimensions();
  const { tokens } = useTheme();
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(0);
  const [committing, setCommitting] = useState(false);

  async function commit(verdict: Verdict, velocity = 0) {
    if (committing || busy) return;
    setCommitting(true);
    void Haptics.impactAsync(
      verdict === "approve"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
    const direction = verdict === "approve" ? 1 : -1;
    // Redo opens a sheet first; only approvals fly off before the result.
    if (verdict === "approve") {
      x.set(
        reducedMotion
          ? withTiming(direction * width * 1.4, { duration: 1 })
          : withSpring(direction * width * 1.4, {
              duration: 300,
              dampingRatio: 1,
              velocity,
            }),
      );
    }
    const leaves = await onVerdict(item, verdict);
    if (!leaves) {
      x.set(withSpring(0, { duration: 400, dampingRatio: 0.8 }));
    }
    setCommitting(false);
  }

  const pan = Gesture.Pan()
    .enabled(!busy && !committing)
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onUpdate((event) => {
      x.set(event.translationX);
    })
    .onEnd((event) => {
      const dx = event.translationX;
      const far = Math.abs(dx) > width * SWIPE_DISTANCE;
      // A flick counts only if it has travelled a bit and agrees with the
      // drag, so the verdict always matches the stamp the parent saw.
      const flick =
        Math.abs(dx) > 48 &&
        Math.abs(event.velocityX) > SWIPE_VELOCITY &&
        Math.sign(event.velocityX) === Math.sign(dx);
      if (far || flick) {
        const verdict: Verdict = dx > 0 ? "approve" : "redo";
        scheduleOnRN(commit, verdict, event.velocityX);
      } else {
        x.set(
          withSpring(0, {
            duration: 400,
            dampingRatio: 0.8,
            velocity: event.velocityX,
          }),
        );
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      {
        rotate: `${interpolate(x.get(), [-width, 0, width], [-9, 0, 9])}deg`,
      },
    ],
  }));
  const approveStamp = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [0, width * 0.25], [0, 1], "clamp"),
  }));
  const redoStamp = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-width * 0.25, 0], [1, 0], "clamp"),
  }));

  return (
    <View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ transformOrigin: "center bottom" }, cardStyle]}
          accessible
          accessibilityLabel={`${item.childDisplayName}: ${item.title}, ${item.valueSek} kronor. ${submittedLabel(item.submittedAt)}.`}
          accessibilityHint="Swipe right to approve, left to ask for a redo, or use the buttons below."
        >
          <CardFace item={item} submittedLabel={submittedLabel} />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 22,
                left: 20,
                transform: [{ rotate: "-12deg" }],
              },
              approveStamp,
            ]}
          >
            <Stamp label="Approve" color={tokens.action} />
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                top: 22,
                right: 20,
                transform: [{ rotate: "12deg" }],
              },
              redoStamp,
            ]}
          >
            <Stamp label="Redo" color={tokens.urgency} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      <View className="flex-row gap-3" style={{ marginTop: 44 }}>
        <ActionButton
          className="flex-1"
          tone="secondary"
          label={item.source === "redo" ? "Not done" : "Redo"}
          leading={<Icon name="redo" color={tokens.ink} size={18} />}
          disabled={busy || committing}
          onPress={() => void commit("redo")}
        />
        <ActionButton
          className="flex-1"
          label={`Approve +${item.valueSek} kr`}
          leading={<Icon name="check" color={tokens.onAction} size={18} />}
          loading={busy}
          disabled={committing}
          onPress={() => void commit("approve")}
        />
      </View>
    </View>
  );
}

function Stamp({ label, color }: { label: string; color: string }) {
  return (
    <View
      className="rounded-[10px] px-3 py-1"
      style={{ borderWidth: 3, borderColor: color }}
    >
      <AppText
        className="font-display text-[22px] uppercase tracking-[1.5px]"
        style={{ color }}
      >
        {label}
      </AppText>
    </View>
  );
}

function CardFace({
  item,
  submittedLabel,
  compact = false,
}: {
  item: DeckItem;
  submittedLabel: (timestamp: number) => string;
  compact?: boolean;
}) {
  const { tokens } = useTheme();
  const now = useMinuteNow();
  const reviewedLate = item.deadlineAt !== undefined && now > item.deadlineAt;
  const badge =
    item.source === "redo"
      ? { label: "Redo check", color: tokens.urgency }
      : item.isUnlockChore
        ? { label: "Unlocks Extras", color: tokens.reward }
        : item.kind === "claimable"
          ? { label: "Extra", color: tokens.info }
          : { label: "Chore", color: tokens.inkMuted };

  return (
    <View
      className="overflow-hidden rounded-[28px] bg-surface"
      style={{
        height: 350,
        shadowColor: "#2B1B4A",
        shadowOpacity: compact ? 0.05 : 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: compact ? 1 : 4,
      }}
    >
      <View
        className="items-center justify-center"
        style={{ height: 150, backgroundColor: tokens.surfaceMuted }}
      >
        <ChoreIcon title={item.title} size={104} animated={!compact} />
        <View className="absolute right-4 top-4 h-14 w-14 items-center justify-center rounded-full border-b-4 border-goldShade bg-gold">
          <AppText
            numberOfLines={1}
            className="font-display text-night"
            style={{ fontSize: amountFontSize(item.valueSek, 17, 3) }}
          >
            +{item.valueSek}{" "}
            <AppText className="font-body-heavy text-[10px] leading-[12px] text-night">
              kr
            </AppText>
          </AppText>
        </View>
      </View>
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center gap-2">
          <Avatar
            tone={childAvatarTone(item.childDisplayName)}
            className="rounded-full"
            fallbackLabel={item.childDisplayName}
            size={30}
          />
          <AppText className="flex-1 font-body-heavy text-[15px]">
            {item.childDisplayName}
          </AppText>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${badge.color}22` }}
          >
            <AppText
              className="font-body-heavy text-[11px] uppercase tracking-[1px]"
              style={{ color: badge.color }}
            >
              {badge.label}
            </AppText>
          </View>
        </View>
        <AppText
          className="mt-2 font-display text-[24px] leading-[29px]"
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        {!compact ? (
          <>
            <AppText variant="caption" color="ink-muted" className="mt-1">
              Sent {submittedLabel(item.submittedAt)}
              {item.hasEvidence ? " · photo attached" : ""}
            </AppText>
            {item.deadlineAt !== undefined &&
            item.submittedAt <= item.deadlineAt &&
            reviewedLate ? (
              // Past the deadline now, but it was sent in time: a late
              // review never costs the kid (D-04).
              <View
                accessible
                accessibilityLabel={`Sent on time, before ${submittedLabel(item.deadlineAt)}. Reviewing it now still counts.`}
                className="mt-2 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
                style={{ backgroundColor: tokens.actionSoft }}
              >
                <Icon name="check" color={tokens.action} size={13} />
                <AppText
                  className="font-body-heavy text-[12px]"
                  style={{ color: tokens.action }}
                >
                  On time · still counts
                </AppText>
              </View>
            ) : null}
            {item.description ? (
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="mt-2"
                numberOfLines={2}
              >
                {item.description}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
}

/** Shown under the deck: the photo the child attached, if any. */
export function DeckEvidence({ item }: { item: DeckItem }) {
  if (!item.hasEvidence) return null;
  return <SubmissionEvidenceViewer submissionId={item.submissionId} />;
}
