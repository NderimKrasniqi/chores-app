import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ChoreIcon,
  Floating,
  PopIn,
  PulseRings,
  Scene,
  StarBuddy,
  Starfield,
  Airlock,
  useLoop,
} from "@/components/art";
import { Easings } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { AppText, HoldButton, ThemeScope } from "@/design-system";
import { questTokens as tokens } from "@/design-system/theme";
import { useHoldCelebrations } from "@/lib/celebration-gate";

import type { Id } from "../../../convex/_generated/dataModel";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";
import type {
  ChildHomeChoreOccurrence,
  ChildHomeRedo,
} from "./child-home-chore-list";
import { formatTime, relativeDayLabel, statusLabel } from "./chore-format";
import {
  Chip,
  FlippingHourglass,
  Panel,
  SentOverlay,
  StatePill,
} from "./quest-card-parts";

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
  useHoldCelebrations(occurrence !== undefined);
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
        <StatePill state={occurrence.state} />
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
              borderColor: tokens.nightRaised,
            },
            ringStyle,
          ]}
        />
        {active ? (
          <View className="absolute">
            <PulseRings
              size={112}
              color={
                occurrence.state === "redo_required"
                  ? tokens.pink
                  : tokens.accent
              }
              duration={2600}
            >
              <View className="absolute h-[112px] w-[112px] rounded-full bg-surface" />
            </PulseRings>
          </View>
        ) : (
          <View className="absolute h-[112px] w-[112px] rounded-full bg-surface" />
        )}
        <Floating distance={4} duration={3600}>
          <ChoreIcon title={occurrence.title} size={84} />
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

function UnlockNote({ occurrence }: { occurrence: ChildHomeChoreOccurrence }) {
  const approved = occurrence.state === "approved";
  const missed = occurrence.state === "missed" || occurrence.state === "failed";
  return (
    <View className="flex-row items-center gap-2 overflow-hidden rounded-large bg-surface py-2 pl-1 pr-4">
      <Airlock size={88} open={approved} />
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
            ? "The Extras airlock is open!"
            : missed
              ? "This one didn’t open Extras. Only approval of your current Unlock Chore can."
              : "When a Parent approves this, the Extras airlock opens."}
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
