import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";

type OccurrenceState =
  | "scheduled"
  | "available"
  | "submitted"
  | "redo_required"
  | "approved"
  | "missed"
  | "failed"
  | "cancelled"
  | "expired_unclaimed";

type ChildHomeChoreOccurrence = {
  occurrenceId: Id<"choreOccurrences">;
  choreDefinitionId: Id<"choreDefinitions">;
  title: string;
  description?: string;
  valueSek: number;
  scheduledLocalDate: string;
  timezone: string;
  availabilityStartsAt: number;
  deadlineAt: number;
  state: OccurrenceState;
  isUnlockChore: boolean;
  canSubmit: boolean;
};

type ChildHomeRedo = {
  occurrenceId: Id<"choreOccurrences">;
  deadlineAt: number;
  canSubmitRedo: boolean;
};

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};

function artworkForTitle(title: string) {
  const normalized = title.toLocaleLowerCase();

  if (normalized.includes("car") || normalized.includes("wash")) {
    return artwork.carWash;
  }

  if (normalized.includes("walk") && normalized.includes("dog")) {
    return artwork.dogWalk;
  }

  if (normalized.includes("room") || normalized.includes("bed")) {
    return artwork.bedroom;
  }

  if (
    normalized.includes("dog") ||
    normalized.includes("pet") ||
    normalized.includes("feed")
  ) {
    return artwork.dog;
  }

  if (
    normalized.includes("recycl") ||
    normalized.includes("trash") ||
    normalized.includes("rubbish")
  ) {
    return artwork.recycling;
  }

  return null;
}

function statePriority(state: OccurrenceState) {
  if (state === "redo_required") return 0;
  if (state === "available") return 1;
  if (state === "submitted") return 2;
  if (state === "scheduled") return 3;
  return 4;
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

function formatDate(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

function currentLocalDate(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

function statusLabel(
  occurrence: ChildHomeChoreOccurrence,
  redo: ChildHomeRedo | undefined,
) {
  if (occurrence.state === "submitted") return "Waiting for parent";

  if (occurrence.state === "redo_required") {
    return redo
      ? `Redo due ${formatDate(redo.deadlineAt, occurrence.timezone)}, ${formatTime(redo.deadlineAt, occurrence.timezone)}`
      : "Redo required";
  }

  if (occurrence.state === "scheduled") {
    return `Available ${formatDate(occurrence.availabilityStartsAt, occurrence.timezone)}`;
  }

  const dateLabel =
    occurrence.scheduledLocalDate === currentLocalDate(occurrence.timezone)
      ? "today"
      : formatDate(occurrence.deadlineAt, occurrence.timezone);

  return `Due ${dateLabel}, ${formatTime(occurrence.deadlineAt, occurrence.timezone)}`;
}

function ChoreArtwork({
  title,
  large = false,
}: {
  title: string;
  large?: boolean;
}) {
  const source = artworkForTitle(title);
  const frameClass = large ? "h-[210px] w-full" : "h-[96px] w-[96px]";
  const imageClass = large ? "h-[190px] w-[250px]" : "h-[90px] w-[90px]";

  return (
    <View
      className={`${frameClass} items-center justify-center overflow-hidden rounded-control bg-[#F7EDDF]`}
    >
      {source ? (
        <Image
          source={source}
          className={imageClass}
          contentFit="contain"
          accessible={false}
        />
      ) : (
        <DirectionCIcon
          name="checklist"
          color={DirectionC.color.greenDeep}
          size={large ? 52 : 40}
        />
      )}
    </View>
  );
}

export function ChildHomeChoreList() {
  const occurrences = useQuery(api.personalChores.listMine);
  const redos = useQuery(api.childRedos.listMine);
  const submit = useServerConfirmedMutation(api.personalChores.submit);
  const submitRedo = useServerConfirmedMutation(api.personalChores.submitRedo);

  const [selectedId, setSelectedId] = useState<Id<"choreOccurrences"> | null>(
    null,
  );
  const [submittingId, setSubmittingId] =
    useState<Id<"choreOccurrences"> | null>(null);
  const [submissionAttempt, setSubmissionAttempt] = useState<1 | 2 | null>(
    null,
  );

  const redoByOccurrence = useMemo(
    () =>
      new Map(
        ((redos ?? []) as ChildHomeRedo[]).map((redo) => [
          redo.occurrenceId,
          redo,
        ]),
      ),
    [redos],
  );

  const visibleOccurrences = useMemo(() => {
    if (!occurrences || !redos) return undefined;

    const groups = new Map<
      Id<"choreDefinitions">,
      ChildHomeChoreOccurrence[]
    >();

    for (const occurrence of occurrences as ChildHomeChoreOccurrence[]) {
      const group = groups.get(occurrence.choreDefinitionId) ?? [];
      group.push(occurrence);
      groups.set(occurrence.choreDefinitionId, group);
    }

    const result: ChildHomeChoreOccurrence[] = [];

    for (const group of groups.values()) {
      const ordered = [...group].sort(
        (left, right) => left.availabilityStartsAt - right.availabilityStartsAt,
      );
      const unresolved = ordered.filter(
        (occurrence) =>
          occurrence.state === "available" ||
          occurrence.state === "submitted" ||
          occurrence.state === "redo_required",
      );

      if (unresolved.length > 0) {
        result.push(...unresolved);
      } else {
        const next = ordered.find(
          (occurrence) => occurrence.state === "scheduled",
        );
        if (next) result.push(next);
      }
    }

    return result.sort((left, right) => {
      const priority = statePriority(left.state) - statePriority(right.state);
      return priority || left.deadlineAt - right.deadlineAt;
    });
  }, [occurrences, redos]);

  const selectedOccurrence = visibleOccurrences?.find(
    (occurrence) => occurrence.occurrenceId === selectedId,
  );
  const selectedRedo = selectedOccurrence
    ? redoByOccurrence.get(selectedOccurrence.occurrenceId)
    : undefined;

  async function handleSubmit(
    occurrence: ChildHomeChoreOccurrence,
    attemptNumber: 1 | 2,
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) {
    setSubmittingId(occurrence.occurrenceId);

    try {
      if (attemptNumber === 2) {
        await submitRedo({
          occurrenceId: occurrence.occurrenceId,
          evidenceUploadIntentId,
        });
      } else {
        await submit({
          occurrenceId: occurrence.occurrenceId,
          evidenceUploadIntentId,
        });
      }

      setSubmissionAttempt(null);
      setSelectedId(null);
      Alert.alert(
        attemptNumber === 2 ? "Redo submitted" : "Submitted",
        `${occurrence.title} was sent to your Parent for review.`,
      );
    } catch (error) {
      Alert.alert(
        attemptNumber === 2 ? "Could not submit Redo" : "Could not submit",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmittingId(null);
    }
  }

  if (visibleOccurrences === undefined) {
    return (
      <Surface className="mx-1 p-5">
        <AppText variant="label" color="ink-muted">
          Loading your chores…
        </AppText>
      </Surface>
    );
  }

  if (visibleOccurrences.length === 0) {
    return (
      <Surface className="mx-1 p-5">
        <AppText variant="cardTitle">Nothing coming up</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          You have no active or upcoming Personal Chores.
        </AppText>
      </Surface>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-2.5 px-1 pb-2"
        showsVerticalScrollIndicator
      >
        {visibleOccurrences.map((occurrence) => {
          const redo = redoByOccurrence.get(occurrence.occurrenceId);
          const waiting = occurrence.state === "submitted";
          const urgent =
            occurrence.state === "available" ||
            occurrence.state === "redo_required";

          return (
            <Pressable
              key={occurrence.occurrenceId}
              accessibilityRole="button"
              accessibilityLabel={`Open ${occurrence.title}`}
              onPress={() => setSelectedId(occurrence.occurrenceId)}
              className="min-h-[112px] flex-row items-center rounded-large bg-surface p-2.5 shadow-md"
            >
              <ChoreArtwork title={occurrence.title} />

              <View className="flex-1 px-3.5">
                <AppText variant="cardTitle" numberOfLines={2}>
                  {occurrence.title}
                </AppText>

                {occurrence.isUnlockChore ? (
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
                ) : null}

                <AppText className="mt-1 text-xl font-black">
                  {occurrence.valueSek} kr
                </AppText>

                <View className="mt-1 flex-row items-center">
                  <DirectionCIcon
                    name={waiting ? "waiting" : "clock"}
                    color={
                      waiting
                        ? DirectionC.color.disabled
                        : urgent
                          ? DirectionC.color.coral
                          : DirectionC.color.inkMuted
                    }
                    size={16}
                  />
                  <AppText
                    variant="caption"
                    color={
                      waiting ? "ink-faint" : urgent ? "urgency" : "ink-muted"
                    }
                    className="ml-1 flex-1"
                    numberOfLines={1}
                  >
                    {statusLabel(occurrence, redo)}
                  </AppText>
                </View>
              </View>

              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.ink}
                size={20}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={selectedOccurrence !== undefined}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setSubmissionAttempt(null);
          setSelectedId(null);
        }}
      >
        {selectedOccurrence ? (
          <SafeAreaView className="flex-1 bg-canvas">
            <View className="px-3">
              <TopBar
                title="Chore details"
                onBack={() => setSelectedId(null)}
              />
            </View>

            <ScrollView
              contentContainerClassName={`px-5 ${selectedOccurrence.canSubmit || (selectedOccurrence.state === "redo_required" && selectedRedo?.canSubmitRedo) ? "pb-32" : "pb-10"}`}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <ChoreArtwork title={selectedOccurrence.title} large />
                {selectedOccurrence.isUnlockChore ? (
                  <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-surfaceRaised px-3 py-2 shadow-md">
                    <DirectionCIcon
                      name="key"
                      color={DirectionC.color.coral}
                      size={20}
                    />
                    <AppText color="urgency" className="ml-1.5 font-black">
                      Unlock chore
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText variant="screenTitle" className="mt-[18px]">
                {selectedOccurrence.title}
              </AppText>

              <View className="mt-2.5 flex-row flex-wrap items-center gap-2.5">
                <StatusChip
                  label={`${selectedOccurrence.valueSek} kr`}
                  tone="urgent"
                  icon={
                    <DirectionCIcon
                      name="tag"
                      color={DirectionC.color.coral}
                      size={15}
                    />
                  }
                />
                {selectedOccurrence.state === "scheduled" ? (
                  <StatusChip
                    label="Upcoming"
                    tone="info"
                    icon={
                      <DirectionCIcon
                        name="calendar"
                        color={DirectionC.color.ink}
                        size={15}
                      />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "submitted" ? (
                  <StatusChip
                    label="Waiting for parent"
                    tone="success"
                    icon={
                      <DirectionCIcon
                        name="waiting"
                        color={DirectionC.color.greenDeep}
                        size={15}
                      />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "approved" ? (
                  <StatusChip
                    label="Approved"
                    tone="success"
                    icon={
                      <DirectionCIcon
                        name="check"
                        color={DirectionC.color.greenDeep}
                        size={15}
                      />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "missed" ||
                selectedOccurrence.state === "failed" ? (
                  <StatusChip
                    label="Missed"
                    tone="urgent"
                    icon={
                      <DirectionCIcon
                        name="missed"
                        color={DirectionC.color.coral}
                        size={15}
                      />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "redo_required" ? (
                  <StatusChip
                    label="Redo required"
                    tone="urgent"
                    icon={
                      <DirectionCIcon
                        name="redo"
                        color={DirectionC.color.coral}
                        size={15}
                      />
                    }
                  />
                ) : null}
              </View>

              {selectedOccurrence.state === "scheduled" ? (
                <View className="mt-3 gap-1.5">
                  <View className="flex-row items-center">
                    <DirectionCIcon
                      name="calendar"
                      color={DirectionC.color.greenDeep}
                      size={18}
                    />
                    <AppText color="action" className="ml-2 font-bold">
                      Available{" "}
                      {formatDate(
                        selectedOccurrence.availabilityStartsAt,
                        selectedOccurrence.timezone,
                      )}
                      ,{" "}
                      {formatTime(
                        selectedOccurrence.availabilityStartsAt,
                        selectedOccurrence.timezone,
                      )}
                    </AppText>
                  </View>
                  <View className="flex-row items-center">
                    <DirectionCIcon
                      name="clock"
                      color={DirectionC.color.coral}
                      size={18}
                    />
                    <AppText color="urgency" className="ml-2 font-bold">
                      Due{" "}
                      {formatDate(
                        selectedOccurrence.deadlineAt,
                        selectedOccurrence.timezone,
                      )}
                      ,{" "}
                      {formatTime(
                        selectedOccurrence.deadlineAt,
                        selectedOccurrence.timezone,
                      )}
                    </AppText>
                  </View>
                </View>
              ) : (
                <View className="mt-3 flex-row items-center">
                  <DirectionCIcon
                    name={
                      selectedOccurrence.state === "redo_required"
                        ? "clock"
                        : "clock"
                    }
                    color={
                      selectedOccurrence.state === "approved" ||
                      selectedOccurrence.state === "missed" ||
                      selectedOccurrence.state === "failed"
                        ? DirectionC.color.inkMuted
                        : DirectionC.color.coral
                    }
                    size={18}
                  />
                  <AppText
                    color={
                      selectedOccurrence.state === "approved" ||
                      selectedOccurrence.state === "missed" ||
                      selectedOccurrence.state === "failed"
                        ? "ink-muted"
                        : "urgency"
                    }
                    className="ml-2 font-bold"
                  >
                    {selectedOccurrence.state === "redo_required" &&
                    selectedRedo
                      ? `Redo due ${formatDate(selectedRedo.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedRedo.deadlineAt, selectedOccurrence.timezone)}`
                      : selectedOccurrence.state === "available"
                        ? statusLabel(selectedOccurrence, selectedRedo)
                        : `Original deadline ${formatDate(selectedOccurrence.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedOccurrence.deadlineAt, selectedOccurrence.timezone)}`}
                  </AppText>
                </View>
              )}

              {selectedOccurrence.description ? (
                <Surface className="mt-5 p-[18px]">
                  <AppText variant="cardTitle">Instructions</AppText>
                  <AppText className="mt-2">
                    {selectedOccurrence.description}
                  </AppText>
                </Surface>
              ) : null}

              {selectedOccurrence.state === "scheduled" ? (
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-4 flex-row items-center p-[18px]"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-surfaceRaised">
                    <DirectionCIcon
                      name="calendar"
                      color={DirectionC.color.ink}
                      size={25}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">Starts soon</AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Come back after the available time to submit your work.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.state === "submitted" ? (
                <Surface
                  tone="mint"
                  elevated={false}
                  className="mt-4 flex-row items-center p-[18px]"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-actionSoftStrong">
                    <DirectionCIcon
                      name="clock"
                      color={DirectionC.color.greenDeep}
                      size={26}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">Sent for review</AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      A Parent will check your work. You can’t submit it again
                      while it is waiting.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.state === "approved" ? (
                <Surface
                  tone="mint"
                  elevated={false}
                  className="mt-4 flex-row items-center p-[18px]"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-action">
                    <DirectionCIcon
                      name="check"
                      color={DirectionC.color.white}
                      size={26}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">
                      {selectedOccurrence.valueSek} kr added
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      This reward is now included in your Running Balance.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.state === "missed" ||
              selectedOccurrence.state === "failed" ? (
                <Surface
                  tone="coral"
                  elevated={false}
                  className="mt-4 flex-row items-center p-[18px]"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-surfaceRaised">
                    <DirectionCIcon
                      name="money"
                      color={DirectionC.color.inkMuted}
                      size={26}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">0 kr earned</AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Missing a Personal Chore does not subtract money from your
                      balance.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.state === "redo_required" ? (
                <Surface
                  tone="coral"
                  elevated={false}
                  className="mt-4 flex-row items-center p-[18px]"
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-surfaceRaised">
                    <DirectionCIcon
                      name="redo"
                      color={DirectionC.color.coral}
                      size={26}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">One redo</AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Submit your corrected work by the new deadline. There is
                      no second redo for this chore.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.isUnlockChore ? (
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-4 p-[18px]"
                >
                  <View className="flex-row items-center">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-surfaceRaised">
                      <DirectionCIcon
                        name="key"
                        color={DirectionC.color.greenDeep}
                        size={26}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle">
                        {selectedOccurrence.state === "approved"
                          ? "Extras are open"
                          : selectedOccurrence.state === "missed" ||
                              selectedOccurrence.state === "failed"
                            ? "Extras stay locked"
                            : selectedOccurrence.state === "redo_required"
                              ? `${selectedOccurrence.valueSek} kr still available`
                              : "Why this chore matters"}
                      </AppText>
                      <AppText
                        variant="bodySmall"
                        color="ink-muted"
                        className="mt-1"
                      >
                        {selectedOccurrence.state === "approved"
                          ? "This current Unlock Chore was approved. Extras stay open until the next Unlock Chore becomes current."
                          : selectedOccurrence.state === "missed" ||
                              selectedOccurrence.state === "failed"
                            ? "This missed Unlock Chore did not open Extras. Only approval of the current Unlock Chore can open them."
                            : selectedOccurrence.state === "redo_required"
                              ? `Parent approval of this redo earns ${selectedOccurrence.valueSek} kr and opens Extras. If it fails, you earn 0 kr with no penalty.`
                              : `Parent approval opens Extras. Your ${selectedOccurrence.valueSek} kr is added after approval.`}
                      </AppText>
                    </View>
                  </View>
                </Surface>
              ) : null}

              <View className="mt-4 -rotate-2 self-start rounded-small bg-rewardSoft px-4 py-2 shadow-md">
                <AppText className="font-bold italic">
                  {selectedOccurrence.state === "scheduled"
                    ? "See you soon! ♡"
                    : selectedOccurrence.state === "missed" ||
                        selectedOccurrence.state === "failed"
                      ? "Fresh start next time. ♡"
                      : selectedOccurrence.state === "redo_required"
                        ? "You can fix this. ♡"
                        : "You’ve got this. ♡"}
                </AppText>
              </View>
            </ScrollView>

            {selectedOccurrence.canSubmit ? (
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

            {selectedOccurrence.state === "redo_required" &&
            selectedRedo?.canSubmitRedo ? (
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
              <SafeAreaView className="flex-1 bg-canvas">
                <View className="px-3">
                  <TopBar
                    title={
                      submissionAttempt === 2 ? "Submit redo" : "Submit work"
                    }
                    onBack={() => setSubmissionAttempt(null)}
                  />
                </View>

                <ScrollView
                  contentContainerClassName="flex-grow px-5 pb-7"
                  keyboardShouldPersistTaps="handled"
                >
                  <Surface
                    elevated={false}
                    className="flex-row items-center overflow-hidden bg-[#F7EDDF] p-3"
                  >
                    <ChoreArtwork title={selectedOccurrence.title} />
                    <View className="ml-4 flex-1">
                      <AppText variant="sectionTitle" numberOfLines={2}>
                        {selectedOccurrence.title}
                      </AppText>
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        <StatusChip
                          label={`${selectedOccurrence.valueSek} kr`}
                          tone="urgent"
                          icon={
                            <DirectionCIcon
                              name="tag"
                              color={DirectionC.color.coral}
                              size={14}
                            />
                          }
                        />
                        {selectedOccurrence.isUnlockChore ? (
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
                        ) : null}
                      </View>
                      <AppText
                        variant="caption"
                        color="urgency"
                        className="mt-2 font-bold"
                      >
                        {submissionAttempt === 2 && selectedRedo
                          ? `Redo due ${formatDate(selectedRedo.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedRedo.deadlineAt, selectedOccurrence.timezone)}`
                          : statusLabel(selectedOccurrence, selectedRedo)}
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
                    occurrenceId={selectedOccurrence.occurrenceId}
                    attemptNumber={submissionAttempt ?? 1}
                    disabled={submittingId !== null}
                    submitting={
                      submittingId === selectedOccurrence.occurrenceId
                    }
                    submitTestID={`${submissionAttempt === 2 ? "personal-redo-submit" : "personal-submit"}-${selectedOccurrence.occurrenceId}`}
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
                        className="mt-4 flex-row items-center p-[18px]"
                      >
                        <View className="h-14 w-14 items-center justify-center rounded-full bg-action">
                          <DirectionCIcon
                            name="checkShield"
                            color={DirectionC.color.white}
                            size={29}
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
                            {selectedOccurrence.isUnlockChore
                              ? `${selectedOccurrence.valueSek} kr and Extras unlock after approval.`
                              : `${selectedOccurrence.valueSek} kr is added after approval.`}
                          </AppText>
                        </View>
                      </Surface>
                    }
                    onSubmit={async (evidenceUploadIntentId) => {
                      await handleSubmit(
                        selectedOccurrence,
                        submissionAttempt ?? 1,
                        evidenceUploadIntentId,
                      );
                    }}
                  />
                </ScrollView>
              </SafeAreaView>
            </Modal>
          </SafeAreaView>
        ) : null}
      </Modal>
    </>
  );
}
