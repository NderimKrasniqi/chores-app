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
import { AppImage as Image } from "@/components/ui/app-image";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatTimestampDateTime } from "@/lib/direction-c/dates";
import { ChildSubmissionActions } from "../evidence/child-submission-actions";

export type OccurrenceState =
  | "scheduled"
  | "available"
  | "submitted"
  | "redo_required"
  | "approved"
  | "missed"
  | "failed"
  | "cancelled"
  | "expired_unclaimed";

export type ChildHomeChoreOccurrence = {
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

export type ChildHomeRedo = {
  occurrenceId: Id<"choreOccurrences">;
  deadlineAt: number;
  canSubmitRedo: boolean;
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
const detailNoteArtwork = require("../../../assets/images/direction-c/chore-detail-note.png");
const startsCalendarArtwork = require("../../../assets/images/direction-c/chore-starts-calendar.png");
const extrasArtwork = require("../../../assets/images/direction-c/extras-unlocked.png");
const parentAvatarArtwork = require("../../../assets/images/direction-c/sam-avatar.png");
const youveGotThisArtwork = require("../../../assets/images/direction-c/youve-got-this-note.png");
const scheduledNoteArtwork = require("../../../assets/images/direction-c/child-chore-note-scheduled.png");
const missedNoteArtwork = require("../../../assets/images/direction-c/child-chore-note-missed.png");
const redoNoteArtwork = require("../../../assets/images/direction-c/child-chore-note-redo.png");
const moneyWalletArtwork = require("../../../assets/images/direction-c/money-wallet.png");
const redoDeadlineArtwork = require("../../../assets/images/direction-c/redo-deadline.png");

function artworkForTitle(title: string) {
  const normalized = title.toLocaleLowerCase();

  if (normalized.includes("dishwasher") || normalized.includes("dishes")) {
    return artwork.dishwasher;
  }

  if (normalized.includes("table")) return artwork.table;

  if (normalized.includes("laundry") || normalized.includes("fold")) {
    return artwork.laundry;
  }

  if (normalized.includes("plant") || normalized.includes("water")) {
    return artwork.plants;
  }

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
    return formatTimestampDateTime(timestamp, timezone).split(" at ")[0];
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

function localDateAt(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function currentLocalDate(timezone: string) {
  return localDateAt(Date.now(), timezone);
}

function relativeDayLabel(timestamp: number, timezone: string) {
  const targetDate = localDateAt(timestamp, timezone);
  const today = currentLocalDate(timezone);

  if (!targetDate || !today) return formatDate(timestamp, timezone);

  const toDayNumber = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86_400_000;
  };

  const dayDelta = toDayNumber(targetDate) - toDayNumber(today);

  if (dayDelta === 0) return "today";
  if (dayDelta === 1) return "tomorrow";
  if (dayDelta === -1) return "yesterday";

  return formatDate(timestamp, timezone);
}

function statusLabel(
  occurrence: ChildHomeChoreOccurrence,
  redo: ChildHomeRedo | undefined,
) {
  if (occurrence.state === "submitted") return "Waiting for parent";

  if (occurrence.state === "redo_required") {
    return redo
      ? `Redo due ${relativeDayLabel(redo.deadlineAt, occurrence.timezone)}, ${formatTime(redo.deadlineAt, occurrence.timezone)}`
      : "Redo required";
  }

  if (occurrence.state === "scheduled") {
    return `Available ${relativeDayLabel(occurrence.availabilityStartsAt, occurrence.timezone)}, ${formatTime(occurrence.availabilityStartsAt, occurrence.timezone)}`;
  }

  const dateLabel = relativeDayLabel(
    occurrence.deadlineAt,
    occurrence.timezone,
  );

  return `Due ${dateLabel}, ${formatTime(occurrence.deadlineAt, occurrence.timezone)}`;
}

function ChoreArtwork({
  title,
  large = false,
  compact = false,
  submission = false,
}: {
  title: string;
  large?: boolean;
  compact?: boolean;
  submission?: boolean;
}) {
  const source = artworkForTitle(title);
  const frameClass = large
    ? "h-[220px] w-full"
    : compact
      ? "h-[64px] w-[64px]"
      : submission
        ? "h-[118px] w-[142px]"
        : "h-[96px] w-[96px]";
  const imageClass = large
    ? "h-[215px] w-[310px]"
    : compact
      ? "h-[60px] w-[60px]"
      : submission
        ? "h-[116px] w-[145px]"
        : "h-[90px] w-[90px]";

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

export function ChildHomeChoreList({
  initialOccurrenceId,
  onInitialOccurrenceHandled,
  visualOccurrences,
  visualRedos,
}: {
  initialOccurrenceId?: Id<"choreOccurrences"> | null;
  onInitialOccurrenceHandled?: () => void;
  visualOccurrences?: ChildHomeChoreOccurrence[];
  visualRedos?: ChildHomeRedo[];
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const queriedOccurrences = useQuery(
    api.personalChores.listMine,
    visualOccurrences ? "skip" : {},
  );
  const queriedRedos = useQuery(
    api.childRedos.listMine,
    visualRedos ? "skip" : {},
  );
  const occurrences = visualOccurrences ?? queriedOccurrences;
  const redos = visualRedos ?? queriedRedos;
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
  const [submissionControlState, setSubmissionControlState] = useState<{
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">;
    busy: boolean;
  }>({ busy: false });

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

  const presentation = useMemo(() => {
    if (!occurrences || !redos) return undefined;

    const typedOccurrences = occurrences as ChildHomeChoreOccurrence[];

    const groups = new Map<
      Id<"choreDefinitions">,
      ChildHomeChoreOccurrence[]
    >();

    for (const occurrence of typedOccurrences) {
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

    const currentAndNext = result.sort((left, right) => {
      const priority = statePriority(left.state) - statePriority(right.state);
      return priority || left.deadlineAt - right.deadlineAt;
    });

    const recentHistory = typedOccurrences
      .filter(
        (occurrence) =>
          occurrence.state === "approved" ||
          occurrence.state === "missed" ||
          occurrence.state === "failed",
      )
      .sort(
        (left, right) => right.availabilityStartsAt - left.availabilityStartsAt,
      )
      .slice(0, 3);

    return { currentAndNext, recentHistory };
  }, [occurrences, redos]);

  const visibleOccurrences = presentation?.currentAndNext ?? [];
  const recentHistory = presentation?.recentHistory ?? [];
  const allVisibleOccurrences = useMemo(
    () =>
      presentation
        ? [...presentation.currentAndNext, ...presentation.recentHistory]
        : undefined,
    [presentation],
  );

  const selectedOccurrence = allVisibleOccurrences?.find(
    (occurrence) => occurrence.occurrenceId === selectedId,
  );
  const selectedRedo = selectedOccurrence
    ? redoByOccurrence.get(selectedOccurrence.occurrenceId)
    : undefined;

  const selectedNoteArtwork = selectedOccurrence
    ? selectedOccurrence.state === "scheduled" &&
      relativeDayLabel(
        selectedOccurrence.availabilityStartsAt,
        selectedOccurrence.timezone,
      ) === "tomorrow"
      ? scheduledNoteArtwork
      : selectedOccurrence.state === "missed" ||
          selectedOccurrence.state === "failed"
        ? missedNoteArtwork
        : selectedOccurrence.state === "redo_required"
          ? redoNoteArtwork
          : selectedOccurrence.state === "available" ||
              selectedOccurrence.state === "submitted" ||
              selectedOccurrence.state === "approved"
            ? youveGotThisArtwork
            : null
    : null;

  useEffect(() => {
    if (!initialOccurrenceId || !allVisibleOccurrences) return;

    const occurrence = allVisibleOccurrences.find(
      (item) => item.occurrenceId === initialOccurrenceId,
    );

    if (!occurrence) return;

    const frame = requestAnimationFrame(() => {
      setSelectedId(occurrence.occurrenceId);
      onInitialOccurrenceHandled?.();
    });

    return () => cancelAnimationFrame(frame);
  }, [allVisibleOccurrences, initialOccurrenceId, onInitialOccurrenceHandled]);

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

  if (presentation === undefined) {
    return (
      <Surface className="mx-1 p-5">
        <AppText variant="cardTitle">Loading your chores…</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Today’s responsibilities will appear here.
        </AppText>
      </Surface>
    );
  }

  if (visibleOccurrences.length === 0 && recentHistory.length === 0) {
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
        contentContainerClassName="gap-2 px-1 pb-2"
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
              className="min-h-[116px] flex-row items-center rounded-large bg-surface p-2 shadow-md"
            >
              <ChoreArtwork title={occurrence.title} />

              <View className="flex-1 px-3">
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
                    size={18}
                  />
                  <AppText
                    variant="label"
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

        {recentHistory.length > 0 ? (
          <View className="mt-1 gap-2">
            <View className="px-1 pt-1">
              <AppText variant="label" color="ink-muted">
                Recent
              </AppText>
              <AppText variant="bodySmall" color="ink-muted" className="mt-0.5">
                Your latest chore outcomes.
              </AppText>
            </View>

            {recentHistory.map((occurrence) => {
              const approved = occurrence.state === "approved";
              const missed =
                occurrence.state === "missed" || occurrence.state === "failed";
              const status = approved
                ? `${occurrence.valueSek} kr earned`
                : "0 kr earned";

              return (
                <Pressable
                  key={occurrence.occurrenceId}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${occurrence.title}`}
                  onPress={() => setSelectedId(occurrence.occurrenceId)}
                  className="min-h-[80px] flex-row items-center rounded-large bg-surface p-2 shadow-md"
                >
                  <ChoreArtwork title={occurrence.title} compact />

                  <View className="flex-1 px-3">
                    <AppText variant="cardTitle" numberOfLines={1}>
                      {occurrence.title}
                    </AppText>
                    <View className="mt-1 flex-row items-center">
                      <DirectionCIcon
                        name={approved ? "check" : "missed"}
                        color={
                          approved
                            ? DirectionC.color.greenDeep
                            : missed
                              ? DirectionC.color.coral
                              : DirectionC.color.inkMuted
                        }
                        size={16}
                      />
                      <AppText
                        variant="bodySmall"
                        color={approved ? "action" : "urgency"}
                        className="ml-1"
                      >
                        {status}
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
          </View>
        ) : null}
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
          <SafeAreaView
            edges={["bottom"]}
            className="flex-1 bg-canvas"
            style={{ paddingTop: safeAreaInsets.top }}
          >
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
                <Image
                  source={detailNoteArtwork}
                  className="absolute right-0 top-2 h-[142px] w-[132px]"
                  contentFit="contain"
                  accessible={false}
                />
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
                {selectedOccurrence.state === "available" ? (
                  <StatusChip
                    label={statusLabel(selectedOccurrence, selectedRedo)}
                    tone="urgent"
                    icon={
                      <DirectionCIcon
                        name="clock"
                        color={DirectionC.color.coral}
                        size={15}
                      />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "available" ? (
                  <StatusChip
                    label="Not submitted"
                    tone="neutral"
                    icon={
                      <DirectionCIcon
                        name="document"
                        color={DirectionC.color.inkMuted}
                        size={15}
                      />
                    }
                  />
                ) : null}
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
                        name="clock"
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
                      {relativeDayLabel(
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
                      {relativeDayLabel(
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
              ) : selectedOccurrence.state !== "available" ? (
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
                      ? `Redo due ${relativeDayLabel(selectedRedo.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedRedo.deadlineAt, selectedOccurrence.timezone)}`
                      : `Original deadline ${relativeDayLabel(selectedOccurrence.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedOccurrence.deadlineAt, selectedOccurrence.timezone)}`}
                  </AppText>
                </View>
              ) : null}

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
                  className="mt-4 min-h-[112px] flex-row items-center p-[14px]"
                >
                  <Image
                    source={startsCalendarArtwork}
                    className="h-[82px] w-[82px]"
                    contentFit="contain"
                    accessible={false}
                  />
                  <View className="ml-3 flex-1">
                    <AppText variant="cardTitle">
                      Starts{" "}
                      {relativeDayLabel(
                        selectedOccurrence.availabilityStartsAt,
                        selectedOccurrence.timezone,
                      )}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Come back after{" "}
                      {formatTime(
                        selectedOccurrence.availabilityStartsAt,
                        selectedOccurrence.timezone,
                      )}{" "}
                      to submit your work.
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
                  className="mt-4 min-h-[112px] flex-row items-center overflow-hidden p-3"
                >
                  <View className="relative h-20 w-20">
                    <Image
                      source={moneyWalletArtwork}
                      className="h-20 w-20"
                      contentFit="contain"
                      accessible={false}
                    />
                    <View className="absolute bottom-1 right-0 h-8 w-8 items-center justify-center rounded-full bg-action">
                      <DirectionCIcon
                        name="check"
                        color={DirectionC.color.white}
                        size={18}
                      />
                    </View>
                  </View>
                  <View className="ml-3 flex-1">
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
                  className="mt-4 min-h-[112px] flex-row items-center overflow-hidden p-3"
                >
                  <Image
                    source={moneyWalletArtwork}
                    tintColor={DirectionC.color.disabled}
                    className="h-20 w-20"
                    contentFit="contain"
                    accessible={false}
                  />
                  <View className="ml-3 flex-1">
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
                  className="mt-4 min-h-[112px] flex-row items-center overflow-hidden p-3"
                >
                  <Image
                    source={redoDeadlineArtwork}
                    className="h-20 w-20"
                    contentFit="contain"
                    accessible={false}
                  />
                  <View className="ml-3 flex-1">
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
                  className="mt-4 min-h-[112px] flex-row items-center overflow-hidden px-0 py-3"
                >
                  <View className="h-24 w-[54px] overflow-hidden">
                    <Image
                      source={extrasArtwork}
                      className="absolute -left-9 h-24 w-[204px]"
                      contentFit="contain"
                      accessible={false}
                    />
                  </View>
                  <View className="flex-1 px-2">
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
                  <View className="h-24 w-[54px] overflow-hidden">
                    <Image
                      source={extrasArtwork}
                      className="absolute -right-1 h-24 w-[204px]"
                      contentFit="contain"
                      accessible={false}
                    />
                  </View>
                </Surface>
              ) : null}

              {selectedNoteArtwork ? (
                <Image
                  source={selectedNoteArtwork}
                  className="mt-1 h-[72px] w-[250px]"
                  contentFit="contain"
                  accessible={false}
                />
              ) : (
                <View className="mt-4 -rotate-2 self-start rounded-small bg-rewardSoft px-4 py-2 shadow-md">
                  <AppText className="font-bold italic">
                    {selectedOccurrence.state === "scheduled"
                      ? `See you ${
                          relativeDayLabel(
                            selectedOccurrence.availabilityStartsAt,
                            selectedOccurrence.timezone,
                          ) === "today"
                            ? "soon"
                            : relativeDayLabel(
                                selectedOccurrence.availabilityStartsAt,
                                selectedOccurrence.timezone,
                              )
                        }! ♡`
                      : selectedOccurrence.state === "missed" ||
                          selectedOccurrence.state === "failed"
                        ? "Fresh start next time. ♡"
                        : selectedOccurrence.state === "redo_required"
                          ? "You can fix this. ♡"
                          : "You’ve got this. ♡"}
                  </AppText>
                </View>
              )}
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
                  onPress={() => {
                    setSubmissionControlState({ busy: false });
                    setSubmissionAttempt(1);
                  }}
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
                  onPress={() => {
                    setSubmissionControlState({ busy: false });
                    setSubmissionAttempt(2);
                  }}
                />
              </View>
            ) : null}

            <Modal
              visible={submissionAttempt !== null}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => {
                setSubmissionControlState({ busy: false });
                setSubmissionAttempt(null);
              }}
            >
              <SafeAreaView className="flex-1 bg-canvas">
                <View className="px-3 pt-9">
                  <TopBar
                    title={
                      submissionAttempt === 2 ? "Submit redo" : "Submit work"
                    }
                    onBack={() => {
                      setSubmissionControlState({ busy: false });
                      setSubmissionAttempt(null);
                    }}
                  />
                </View>

                <ScrollView
                  contentContainerClassName="flex-grow px-5 pb-32"
                  keyboardShouldPersistTaps="handled"
                >
                  <Surface
                    elevated={false}
                    className="min-h-[140px] flex-row items-center overflow-hidden bg-[#F7EDDF] p-3"
                  >
                    <View className="relative">
                      <ChoreArtwork
                        title={selectedOccurrence.title}
                        submission
                      />
                      <Image
                        source={detailNoteArtwork}
                        className="absolute right-0 top-0 h-[78px] w-[72px]"
                        contentFit="contain"
                        accessible={false}
                      />
                      {selectedOccurrence.isUnlockChore ? (
                        <View className="absolute bottom-0 left-0">
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
                        </View>
                      ) : null}
                    </View>
                    <View className="ml-3 flex-1">
                      <AppText variant="cardTitle" numberOfLines={1}>
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
                      </View>
                      <AppText
                        variant="caption"
                        color="urgency"
                        className="mt-2 font-bold"
                      >
                        {submissionAttempt === 2 && selectedRedo
                          ? `Redo due ${relativeDayLabel(selectedRedo.deadlineAt, selectedOccurrence.timezone)}, ${formatTime(selectedRedo.deadlineAt, selectedOccurrence.timezone)}`
                          : statusLabel(selectedOccurrence, selectedRedo)}
                      </AppText>
                    </View>
                  </Surface>

                  <AppText variant="display" className="mt-7">
                    Ready for review?
                  </AppText>
                  <AppText variant="body" className="mb-5 mt-1 font-semibold">
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

                <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
                  <ActionButton
                    testID={`${submissionAttempt === 2 ? "personal-redo-submit" : "personal-submit"}-${selectedOccurrence.occurrenceId}`}
                    accessibilityLabel={
                      submissionAttempt === 2
                        ? "Submit redo"
                        : "Submit for review"
                    }
                    disabled={submissionControlState.busy}
                    loading={submittingId === selectedOccurrence.occurrenceId}
                    label={
                      submittingId === selectedOccurrence.occurrenceId
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
                    onPress={() =>
                      void handleSubmit(
                        selectedOccurrence,
                        submissionAttempt ?? 1,
                        submissionControlState.evidenceUploadIntentId,
                      )
                    }
                  />
                </View>
              </SafeAreaView>
            </Modal>
          </SafeAreaView>
        ) : null}
      </Modal>
    </>
  );
}
