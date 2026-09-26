import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ChoreIcon,
  Floating,
  PopIn,
  PulseRings,
  Scene,
  StarBuddy,
  Starfield,
  TreasureChest,
  useEntrance,
  useLoop,
} from "@/components/art";
import { Easings } from "@/components/art/motion";
import { Icon, type IconName } from "@/components/ui/icon";
import { AppText, HoldButton, ThemeScope } from "@/design-system";
import { questTokens as tokens } from "@/design-system/theme";

import type { Id } from "../../../convex/_generated/dataModel";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";
import type {
  ChildHomeChoreOccurrence,
  ChildHomeRedo,
} from "./child-home-chore-list";
import { formatTime, relativeDayLabel, statusLabel } from "./chore-format";

type Props = {
  occurrence: ChildHomeChoreOccurrence | undefined;
  redo: ChildHomeRedo | undefined;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (
    attempt: 1 | 2,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<boolean>;
};

/**
 * A chore as a full-screen quest card: the picture is the hero, the state is
 * told visually, and sending work is a deliberate hold-to-complete.
 */
export function ChildQuestCard({
  occurrence,
  redo,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Modal
      visible={occurrence !== undefined}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {occurrence ? (
        <ThemeScope mode="quest">
          <QuestCardBody
            occurrence={occurrence}
            redo={redo}
            submitting={submitting}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </ThemeScope>
      ) : null}
    </Modal>
  );
}

function QuestCardBody({
  occurrence,
  redo,
  submitting,
  onClose,
  onSubmit,
}: Props & { occurrence: ChildHomeChoreOccurrence }) {
  const insets = useSafeAreaInsets();
  const [evidenceId, setEvidenceId] =
    useState<Id<"submissionEvidenceUploads">>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const isRedo = occurrence.state === "redo_required";
  const canSend =
    occurrence.canSubmit || (isRedo && Boolean(redo?.canSubmitRedo));
  const attempt: 1 | 2 = isRedo ? 2 : 1;
  const { tz } = { tz: occurrence.timezone };

  async function send() {
    const ok = await onSubmit(attempt, evidenceId);
    if (ok) setSent(true);
  }

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <Starfield seed={occurrence.title.length + 13} />

      <View className="flex-row items-center justify-between px-5 pb-1 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close chore"
          onPress={onClose}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" color={tokens.ink} size={18} />
        </Pressable>
        <StatePill occurrence={occurrence} />
        <View className="h-11 w-11" />
      </View>

      <ScrollView
        contentContainerClassName="px-5"
        contentContainerStyle={{ paddingBottom: canSend ? 150 : 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Hero occurrence={occurrence} />

        <AppText variant="display" className="mt-5 text-center">
          {occurrence.title}
        </AppText>

        <View className="mt-3 flex-row flex-wrap items-center justify-center gap-2">
          <Chip icon="star" tone="gold" label={`+${occurrence.valueSek} kr`} />
          <Chip
            icon={
              isRedo
                ? "redo"
                : occurrence.state === "scheduled"
                  ? "calendar"
                  : "clock"
            }
            tone={isRedo ? "pink" : "muted"}
            label={
              isRedo && redo
                ? statusLabel(occurrence, redo)
                : statusLabel(occurrence, undefined)
            }
          />
        </View>

        <View className="mt-6 gap-3">
          <StatePanel occurrence={occurrence} redo={redo} tz={tz} />

          {occurrence.description ? (
            <View className="rounded-large bg-surface p-4">
              <AppText
                variant="label"
                color="ink-muted"
                className="uppercase tracking-[1.2px]"
              >
                Your mission
              </AppText>
              <AppText className="mt-1.5 font-body-bold text-[16px] leading-[23px]">
                {occurrence.description}
              </AppText>
            </View>
          ) : null}

          {occurrence.isUnlockChore ? (
            <UnlockNote occurrence={occurrence} />
          ) : null}

          {canSend ? (
            <ChildSubmissionActions
              occurrenceId={occurrence.occurrenceId}
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
              onSubmit={async (id) => {
                await onSubmit(attempt, id);
              }}
            />
          ) : null}

          <BuddyNote occurrence={occurrence} />
        </View>
      </ScrollView>

      {canSend ? (
        <View
          className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <HoldButton
            testID={`${isRedo ? "personal-redo-submit" : "personal-submit"}-${occurrence.occurrenceId}`}
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
            {occurrence.valueSek} kr is added after a Parent approves.
          </AppText>
        </View>
      ) : null}

      {sent ? <SentOverlay onDone={onClose} /> : null}
    </View>
  );
}

function StatePill({ occurrence }: { occurrence: ChildHomeChoreOccurrence }) {
  const map: Record<string, { label: string; className: string }> = {
    available: { label: "Quest", className: "bg-accent" },
    redo_required: { label: "Redo", className: "bg-pink" },
    submitted: { label: "Checking", className: "bg-nightDash" },
    approved: { label: "Done", className: "bg-primary" },
    missed: { label: "Missed", className: "bg-nightRaised" },
    failed: { label: "Missed", className: "bg-nightRaised" },
    scheduled: { label: "Coming up", className: "bg-gold" },
  };
  const state = map[occurrence.state] ?? {
    label: "Chore",
    className: "bg-nightRaised",
  };
  return (
    <View className={`rounded-full px-3.5 py-1.5 ${state.className}`}>
      <AppText className="font-body-heavy text-[13px] uppercase tracking-[1.2px] text-night">
        {state.label}
      </AppText>
    </View>
  );
}

function Chip({
  icon,
  label,
  tone,
}: {
  icon: IconName;
  label: string;
  tone: "gold" | "pink" | "muted";
}) {
  const color =
    tone === "gold"
      ? tokens.gold
      : tone === "pink"
        ? tokens.pink
        : tokens.inkMuted;
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-3 py-2">
      <Icon name={icon} color={color} size={14} />
      <AppText className="font-body-heavy text-[14px]" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

/** The chore picture on a glowing, slowly turning disc. */
function Hero({ occurrence }: { occurrence: ChildHomeChoreOccurrence }) {
  const spin = useLoop({ duration: 24000, easing: Easings.linear });
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
  const active =
    occurrence.state === "available" || occurrence.state === "redo_required";

  return (
    <View className="mt-3 items-center">
      <View className="h-[230px] w-[230px] items-center justify-center">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: 230,
              height: 230,
              borderRadius: 115,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: tokens.nightRaised,
            },
            ringStyle,
          ]}
        />
        {active ? (
          <PulseRings
            size={176}
            color={
              occurrence.state === "redo_required" ? tokens.pink : tokens.accent
            }
            duration={2600}
          >
            <View className="absolute h-[176px] w-[176px] rounded-full bg-surface" />
          </PulseRings>
        ) : (
          <View className="absolute h-[176px] w-[176px] rounded-full bg-surface" />
        )}
        <Floating distance={6} duration={3600}>
          <ChoreIcon title={occurrence.title} size={132} />
        </Floating>
      </View>
    </View>
  );
}

function StatePanel({
  occurrence,
  redo,
  tz,
}: {
  occurrence: ChildHomeChoreOccurrence;
  redo: ChildHomeRedo | undefined;
  tz: string;
}) {
  switch (occurrence.state) {
    case "submitted":
      return (
        <Panel art={<FlippingHourglass />} title="A Parent is checking">
          Sit tight! You can’t send it again while it’s waiting — and a slow
          check never counts against you.
        </Panel>
      );
    case "approved":
      return (
        <Panel
          art={
            <PopIn>
              <View className="h-16 w-16 items-center justify-center rounded-full border-b-4 border-primaryShade bg-primary">
                <Icon name="check" color={tokens.night} size={30} />
              </View>
            </PopIn>
          }
          title={`+${occurrence.valueSek} kr in your jar`}
        >
          Approved! It’s part of your running balance now.
        </Panel>
      );
    case "missed":
    case "failed":
      return (
        <Panel art={<Scene name="moon" size={70} />} title="0 kr this time">
          Missing a Personal Chore never takes money away. Fresh start next
          time!
        </Panel>
      );
    case "redo_required":
      return (
        <Panel
          art={
            <View className="h-16 w-16 items-center justify-center rounded-full bg-pink">
              <Icon name="redo" color={tokens.night} size={28} />
            </View>
          }
          title="One redo"
          tone="pink"
        >
          {redo
            ? `Fix it and send it again by ${relativeDayLabel(redo.deadlineAt, tz)}, ${formatTime(redo.deadlineAt, tz)}. There’s no second redo.`
            : "Fix it and send it again. There’s no second redo."}
        </Panel>
      );
    case "scheduled":
      return (
        <Panel
          art={<Scene name="calendar" size={70} />}
          title={`Opens ${relativeDayLabel(occurrence.availabilityStartsAt, tz)}`}
        >
          {`Come back after ${formatTime(occurrence.availabilityStartsAt, tz)} to do this quest.`}
        </Panel>
      );
    default:
      return null;
  }
}

function Panel({
  art,
  title,
  children,
  tone,
}: {
  art: ReactNode;
  title: string;
  children: ReactNode;
  tone?: "pink";
}) {
  return (
    <View
      className={`flex-row items-center gap-4 rounded-large p-4 ${tone === "pink" ? "bg-urgencySoft" : "bg-surface"}`}
    >
      {art}
      <View className="flex-1">
        <AppText variant="cardTitle" className="font-display">
          {title}
        </AppText>
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-1 font-body-bold"
        >
          {children}
        </AppText>
      </View>
    </View>
  );
}

function FlippingHourglass() {
  const progress = useLoop({ duration: 3000, easing: Easings.linear });
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.get(), [0, 0.42, 0.58, 1], [0, 0, 180, 180])}deg`,
      },
    ],
  }));
  return (
    <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-inkMuted bg-nightRaised">
      <Animated.View style={style}>
        <Icon name="hourglass" color={tokens.star} size={28} />
      </Animated.View>
    </View>
  );
}

function UnlockNote({ occurrence }: { occurrence: ChildHomeChoreOccurrence }) {
  const approved = occurrence.state === "approved";
  const missed = occurrence.state === "missed" || occurrence.state === "failed";
  return (
    <View className="flex-row items-center gap-2 overflow-hidden rounded-large bg-surface py-2 pl-1 pr-4">
      <TreasureChest state={approved ? "open" : "locked"} size={88} />
      <View className="flex-1">
        <AppText
          variant="label"
          color="gold"
          className="uppercase tracking-[1.2px]"
        >
          Unlock chore
        </AppText>
        <AppText className="mt-0.5 font-body-heavy text-[15px] leading-[20px]">
          {approved
            ? "The Extras chest is open!"
            : missed
              ? "This one didn’t open Extras. Only approval of your current Unlock Chore can."
              : "When a Parent approves this, the Extras chest opens."}
        </AppText>
      </View>
    </View>
  );
}

function BuddyNote({ occurrence }: { occurrence: ChildHomeChoreOccurrence }) {
  const text =
    occurrence.state === "scheduled"
      ? "See you soon!"
      : occurrence.state === "missed" || occurrence.state === "failed"
        ? "Fresh start next time!"
        : occurrence.state === "redo_required"
          ? "You can fix this. I believe in you!"
          : occurrence.state === "approved"
            ? "Woohoo, nice work!"
            : occurrence.state === "submitted"
              ? "Fingers crossed!"
              : "You’ve got this!";
  return (
    <View className="mt-2 flex-row items-end gap-2">
      <StarBuddy
        size={58}
        mood={occurrence.state === "approved" ? "dance" : "wave"}
      />
      <View className="mb-6 flex-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3">
        <AppText className="font-body-heavy text-[15px]">{text}</AppText>
      </View>
    </View>
  );
}

/** After sending: the buddy flies the work off to a Parent, then we close. */
function SentOverlay({ onDone }: { onDone: () => void }) {
  const progress = useEntrance({ duration: 900 });
  const flight = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [60, -30]) },
      { rotate: `${interpolate(progress.get(), [0, 1], [-8, 6])}deg` },
    ],
    opacity: interpolate(progress.get(), [0, 0.2, 1], [0, 1, 1]),
  }));

  useEffect(() => {
    const timer = setTimeout(onDone, 1700);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel="Sent to a Parent for review"
      className="absolute inset-0 items-center justify-center bg-canvas"
    >
      <Starfield seed={77} />
      <Animated.View style={flight} className="items-center">
        <StarBuddy size={96} mood="hop" />
        <View
          className="-mt-2 h-14 w-12 rounded-[5px] bg-white"
          style={{ transform: [{ rotate: "8deg" }] }}
        />
      </Animated.View>
      <AppText variant="screenTitle" className="mt-8">
        Sent!
      </AppText>
      <AppText color="ink-muted" className="mt-1 font-body-bold">
        A Parent will check it soon.
      </AppText>
    </View>
  );
}
