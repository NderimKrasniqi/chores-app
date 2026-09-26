import {
  ChoreIcon,
  QuestPath,
  Scene,
  StarBuddy,
  TreasureChest,
  type QuestStop,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import {
  ActionButton,
  AppText,
  DesignTokens,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatTimestampDateTime } from "@/lib/dates";
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
  featured?: boolean;
  waiting?: boolean;
}) {
  if (large) {
    return (
      <View className="h-[210px] w-full items-center justify-center overflow-hidden rounded-large bg-surface">
        <View className="absolute -left-6 -top-10 h-40 w-40 rounded-full bg-nightRaised opacity-60" />
        <View className="absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-nightTrack" />
        <ChoreIcon title={title} size={132} animated />
      </View>
    );
  }
  return (
    <ChoreIcon
      title={title}
      size={compact ? 56 : submission ? 96 : 64}
      animated={submission}
    />
  );
}

/** The star buddy cheering the Child on from a speech bubble. */
function BuddyNote({ children }: { children: ReactNode }) {
  return (
    <View className="mt-5 flex-row items-end gap-2">
      <StarBuddy size={58} mood="wave" />
      <View className="mb-6 flex-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3">
        <AppText className="font-body-heavy text-[15px]">{children}</AppText>
      </View>
    </View>
  );
}

export function ChildHomeChoreList({
  initialOccurrenceId,
  onInitialOccurrenceHandled,
  visualOccurrences,
  visualRedos,
  initialVisualSubmissionState,
  header,
  onOpenExtras,
}: {
  header?: ReactNode;
  onOpenExtras?: () => void;
  initialOccurrenceId?: Id<"choreOccurrences"> | null;
  onInitialOccurrenceHandled?: () => void;
  visualOccurrences?: ChildHomeChoreOccurrence[];
  visualRedos?: ChildHomeRedo[];
  initialVisualSubmissionState?: "empty" | "photo";
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
    initialVisualSubmissionState ? (initialOccurrenceId ?? null) : null,
  );
  const [submittingId, setSubmittingId] =
    useState<Id<"choreOccurrences"> | null>(null);
  const [submissionAttempt, setSubmissionAttempt] = useState<1 | 2 | null>(
    initialVisualSubmissionState ? 1 : null,
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

  const stops = useMemo<QuestStop[]>(() => {
    const history = [...recentHistory].reverse();
    const current = [...visibleOccurrences].sort((left, right) => {
      const order = (state: OccurrenceState) =>
        state === "submitted"
          ? 0
          : state === "redo_required"
            ? 1
            : state === "available"
              ? 2
              : 3;
      return (
        order(left.state) - order(right.state) ||
        left.deadlineAt - right.deadlineAt
      );
    });
    let currentAssigned = false;

    return [...history, ...current].map((occurrence) => {
      const redo = redoByOccurrence.get(occurrence.occurrenceId);
      const open = () => setSelectedId(occurrence.occurrenceId);
      const base = {
        key: occurrence.occurrenceId,
        title: occurrence.title,
        onPress: open,
        accessibilityLabel: `Open ${occurrence.title}`,
      };

      if (occurrence.state === "approved") {
        return {
          ...base,
          status: "done",
          subtitle: `+${occurrence.valueSek} kr earned`,
        } as QuestStop;
      }
      if (occurrence.state === "missed" || occurrence.state === "failed") {
        return {
          ...base,
          status: "missed",
          subtitle: "Missed · 0 kr, no penalty",
        } as QuestStop;
      }
      if (occurrence.state === "submitted") {
        return {
          ...base,
          status: "review",
          subtitle: "A Parent is checking",
        } as QuestStop;
      }
      if (occurrence.state === "redo_required") {
        return {
          ...base,
          status: "redo",
          eyebrow: "Redo",
          subtitle: statusLabel(occurrence, redo),
        } as QuestStop;
      }
      if (occurrence.state === "available" && !currentAssigned) {
        currentAssigned = true;
        return {
          ...base,
          status: "current",
          eyebrow: "Up next",
          reward: occurrence.valueSek,
          subtitle: occurrence.isUnlockChore
            ? `${statusLabel(occurrence, redo)} · opens Extras`
            : statusLabel(occurrence, redo),
        } as QuestStop;
      }
      if (occurrence.isUnlockChore) {
        return {
          ...base,
          status: "unlock",
          reward: occurrence.valueSek,
          subtitle: `+${occurrence.valueSek} kr · opens Extras`,
          eyebrow: statusLabel(occurrence, redo),
        } as QuestStop;
      }
      return {
        ...base,
        status: "todo",
        reward: occurrence.valueSek,
        subtitle: statusLabel(occurrence, redo),
      } as QuestStop;
    });
  }, [recentHistory, redoByOccurrence, visibleOccurrences]);

  const firstRedo = visibleOccurrences.find(
    (occurrence) => occurrence.state === "redo_required",
  );
  const unlockApproved =
    recentHistory.some(
      (occurrence) =>
        occurrence.isUnlockChore && occurrence.state === "approved",
    ) && !visibleOccurrences.some((occurrence) => occurrence.isUnlockChore);

  let body: ReactNode;

  if (presentation === undefined) {
    body = (
      <View className="items-center py-10">
        <StarBuddy size={64} mood="hop" />
        <AppText variant="cardTitle" className="mt-4">
          Loading your quests…
        </AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Today’s chores will appear here.
        </AppText>
      </View>
    );
  } else if (visibleOccurrences.length === 0 && recentHistory.length === 0) {
    body = (
      <View className="items-center rounded-large bg-surface px-5 py-8">
        <Scene name="moon" size={130} buddy="sleepy" />
        <AppText variant="sectionTitle" className="mt-4 text-center">
          Nothing coming up
        </AppText>
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-1 text-center"
        >
          You have no active or upcoming Personal Chores. Enjoy the quiet sky!
        </AppText>
      </View>
    );
  } else {
    body = (
      <>
        {firstRedo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Redo ${firstRedo.title}`}
            onPress={() => setSelectedId(firstRedo.occurrenceId)}
            className="mb-5 flex-row items-center gap-2.5 rounded-full bg-pink py-2.5 pl-2.5 pr-4"
          >
            <View className="h-8 w-8 items-center justify-center rounded-full bg-night">
              <Icon name="redo" color={themeColors.pink} size={16} />
            </View>
            <AppText
              className="flex-1 font-body-heavy text-[15px] text-night"
              numberOfLines={1}
            >
              Redo “{firstRedo.title}” ·{" "}
              {statusLabel(
                firstRedo,
                redoByOccurrence.get(firstRedo.occurrenceId),
              ).replace(/^Redo due /, "by ")}
            </AppText>
            <Icon name="chevron" color={themeColors.night} size={18} />
          </Pressable>
        ) : null}

        <View className="mb-3 flex-row items-baseline justify-between">
          <AppText variant="sectionTitle">Today’s quest</AppText>
          <AppText variant="label" color="ink-muted">
            {
              visibleOccurrences.filter(
                (o) => o.state === "available" || o.state === "redo_required",
              ).length
            }{" "}
            to do
          </AppText>
        </View>

        <View className="-mx-5">
          <QuestPath stops={stops} />
        </View>

        {onOpenExtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Extras"
            onPress={onOpenExtras}
            className="mt-8 flex-row items-center gap-3 rounded-large bg-surface p-3 pr-4"
          >
            <TreasureChest
              state={unlockApproved ? "open" : "locked"}
              size={92}
            />
            <View className="flex-1">
              <AppText
                variant="label"
                color="gold"
                className="uppercase tracking-[1.2px]"
              >
                Extras chest
              </AppText>
              <AppText variant="cardTitle" className="mt-0.5">
                {unlockApproved
                  ? "Bonus quests are open!"
                  : "Bonus quests for extra money"}
              </AppText>
              <AppText variant="caption" color="ink-muted" className="mt-1">
                {unlockApproved
                  ? "Claim one Extra at a time."
                  : "They open when a Parent approves your Unlock Chore."}
              </AppText>
            </View>
            <Icon name="chevron" color={themeColors.inkMuted} size={20} />
          </Pressable>
        ) : null}
      </>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {header}
        {body}
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
              className="-mt-4"
              contentContainerClassName={`-mt-2 px-4 ${selectedOccurrence.canSubmit || (selectedOccurrence.state === "redo_required" && selectedRedo?.canSubmitRedo) ? "pb-32" : "pb-10"}`}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                <ChoreArtwork title={selectedOccurrence.title} large />
                {selectedOccurrence.isUnlockChore ? (
                  <View
                    className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-surfaceRaised px-3 py-2"
                    style={DesignTokens.shadowStyle.floating}
                  >
                    <Icon name="key" color={themeColors.urgency} size={20} />
                    <AppText color="urgency" className="ml-1.5 font-black">
                      Unlock chore
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText variant="display" className="mt-3">
                {selectedOccurrence.title}
              </AppText>

              <View className="mt-2.5 flex-row flex-wrap items-center gap-2.5">
                <StatusChip
                  label={`${selectedOccurrence.valueSek} kr`}
                  tone="urgent"
                  icon={
                    <Icon name="tag" color={themeColors.urgency} size={15} />
                  }
                />
                {selectedOccurrence.state === "available" ? (
                  <StatusChip
                    label={statusLabel(selectedOccurrence, selectedRedo)}
                    tone="urgent"
                    icon={
                      <Icon
                        name="clock"
                        color={themeColors.urgency}
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
                      <Icon
                        name="document"
                        color={themeColors.inkMuted}
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
                      <Icon name="calendar" color={themeColors.ink} size={15} />
                    }
                  />
                ) : null}
                {selectedOccurrence.state === "submitted" ? (
                  <StatusChip
                    label="Waiting for parent"
                    tone="success"
                    icon={
                      <Icon
                        name="clock"
                        color={themeColors.actionPressed}
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
                      <Icon
                        name="check"
                        color={themeColors.actionPressed}
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
                      <Icon
                        name="missed"
                        color={themeColors.urgency}
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
                      <Icon name="redo" color={themeColors.urgency} size={15} />
                    }
                  />
                ) : null}
              </View>

              {selectedOccurrence.state === "scheduled" ? (
                <View className="mt-3 gap-1.5">
                  <View className="flex-row items-center">
                    <Icon
                      name="calendar"
                      color={themeColors.actionPressed}
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
                    <Icon name="clock" color={themeColors.urgency} size={18} />
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
                  <Icon
                    name={
                      selectedOccurrence.state === "redo_required"
                        ? "clock"
                        : "clock"
                    }
                    color={
                      selectedOccurrence.state === "approved" ||
                      selectedOccurrence.state === "missed" ||
                      selectedOccurrence.state === "failed"
                        ? themeColors.inkMuted
                        : themeColors.urgency
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
                <Surface
                  className={
                    selectedOccurrence.state === "available"
                      ? "mt-3 min-h-[96px] p-4"
                      : selectedOccurrence.state === "scheduled"
                        ? "mt-3 px-3 py-4"
                        : "mt-3 p-4"
                  }
                >
                  <AppText variant="cardTitle">Instructions</AppText>
                  <AppText
                    variant="bodySmall"
                    className={
                      selectedOccurrence.state === "scheduled"
                        ? "mt-2 text-[12px] leading-[16px]"
                        : "mt-2"
                    }
                    numberOfLines={1}
                    adjustsFontSizeToFit={
                      selectedOccurrence.state !== "scheduled"
                    }
                    minimumFontScale={0.8}
                  >
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
                  <Scene name="calendar" size={82} />
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
                      className="mt-1 flex-1"
                      numberOfLines={3}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
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
                    <Icon
                      name="clock"
                      color={themeColors.actionPressed}
                      size={26}
                    />
                  </View>
                  <View className="ml-4 flex-1">
                    <AppText variant="cardTitle">Sent for review</AppText>
                    <AppText
                      variant="caption"
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
                  className="mt-3 min-h-[96px] flex-row items-center overflow-hidden p-2"
                >
                  <View className="relative h-20 w-20">
                    <Scene name="wallet" size={80} />
                    <View className="absolute bottom-1 right-0 h-8 w-8 items-center justify-center rounded-full bg-action">
                      <Icon
                        name="check"
                        color={themeColors.onAction}
                        size={18}
                      />
                    </View>
                  </View>
                  <View className="ml-3 flex-1">
                    <AppText variant="cardTitle">
                      {selectedOccurrence.valueSek} kr added
                    </AppText>
                    <AppText
                      variant="caption"
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
                  className="mt-4 min-h-[96px] flex-row items-center overflow-hidden p-3"
                >
                  <Scene name="wallet" size={72} />
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
                  className="mt-4 min-h-[96px] flex-row items-center overflow-hidden p-3"
                >
                  <Scene name="calendar" size={72} />
                  <View className="ml-3 flex-1">
                    <AppText variant="cardTitle">One redo</AppText>
                    <AppText
                      variant="bodySmall"
                      className="mt-1"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      Submit your corrected work by the new deadline.
                    </AppText>
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      className="mt-0.5"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      There is no second redo for this chore.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              {selectedOccurrence.isUnlockChore ? (
                <Surface
                  tone="lavender"
                  elevated={false}
                  className={`relative mt-3 ${selectedOccurrence.state === "redo_required" ? "min-h-[128px]" : "min-h-[112px]"} overflow-hidden px-0 py-2`}
                >
                  <View className="absolute bottom-0 left-1 top-0 justify-center">
                    <TreasureChest
                      state={
                        selectedOccurrence.state === "approved"
                          ? "open"
                          : "locked"
                      }
                      size={96}
                    />
                  </View>
                  <View className="flex-1 justify-center pl-[104px] pr-4">
                    <AppText
                      variant="cardTitle"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {selectedOccurrence.state === "approved"
                        ? "Extras are open"
                        : selectedOccurrence.state === "missed" ||
                            selectedOccurrence.state === "failed"
                          ? "Extras stay locked"
                          : selectedOccurrence.state === "redo_required"
                            ? `${selectedOccurrence.valueSek} kr still available`
                            : "Why this chore matters"}
                    </AppText>
                    {selectedOccurrence.state === "approved" ? (
                      <>
                        <AppText
                          variant="bodySmall"
                          className="mt-1"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          This current Unlock Chore was approved.
                        </AppText>
                        <AppText
                          variant="caption"
                          color="ink-muted"
                          className="mt-0.5"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          Extras stay open until the next Unlock Chore becomes
                          current.
                        </AppText>
                      </>
                    ) : selectedOccurrence.state === "missed" ||
                      selectedOccurrence.state === "failed" ? (
                      <>
                        <AppText
                          variant="bodySmall"
                          className="mt-1"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          This missed Unlock Chore did not open Extras.
                        </AppText>
                        <AppText
                          variant="caption"
                          color="ink-muted"
                          className="mt-0.5"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          Only approval of the current Unlock Chore can open
                          them.
                        </AppText>
                      </>
                    ) : selectedOccurrence.state === "redo_required" ? (
                      <>
                        <AppText
                          variant="bodySmall"
                          className="mt-1"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          Parent approval of this redo earns the reward and
                          opens Extras.
                        </AppText>
                        <AppText
                          variant="caption"
                          color="ink-muted"
                          className="mt-0.5"
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          If this Personal Chore redo fails, you earn 0 kr with
                          no penalty.
                        </AppText>
                      </>
                    ) : (
                      <>
                        <AppText
                          variant="bodySmall"
                          className="mt-1"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          Parent approval opens Extras.
                        </AppText>
                        <AppText
                          variant="caption"
                          color="ink-muted"
                          className="mt-0.5"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          Your {selectedOccurrence.valueSek} kr is added after
                          approval.
                        </AppText>
                      </>
                    )}
                  </View>
                </Surface>
              ) : null}

              <BuddyNote>
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
                    }!`
                  : selectedOccurrence.state === "missed" ||
                      selectedOccurrence.state === "failed"
                    ? "Fresh start next time!"
                    : selectedOccurrence.state === "redo_required"
                      ? "You can fix this. I believe in you!"
                      : selectedOccurrence.state === "approved"
                        ? "Woohoo, nice work!"
                        : "You’ve got this!"}
              </BuddyNote>
            </ScrollView>

            {selectedOccurrence.canSubmit ? (
              <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-10 pt-3">
                <ActionButton
                  label="Submit work"
                  trailing={
                    <Icon
                      name="chevron"
                      color={themeColors.onAction}
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
              <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-10 pt-3">
                <ActionButton
                  label="Submit redo"
                  trailing={
                    <Icon
                      name="chevron"
                      color={themeColors.onAction}
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
              <SafeAreaView
                edges={["bottom"]}
                className="flex-1 bg-canvas"
                style={{ paddingTop: safeAreaInsets.top }}
              >
                <View className="px-3">
                  <TopBar
                    title={
                      submissionAttempt === 2 ? "Submit redo" : "Submit work"
                    }
                    titleStyle={{ fontSize: 22, lineHeight: 27 }}
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
                    className="min-h-[140px] flex-row items-center overflow-hidden p-3"
                  >
                    <View className="relative">
                      <ChoreArtwork
                        title={selectedOccurrence.title}
                        submission
                      />
                      {selectedOccurrence.isUnlockChore ? (
                        <View className="absolute bottom-0 left-0">
                          <StatusChip
                            label="Unlock chore"
                            tone="urgent"
                            icon={
                              <Icon
                                name="key"
                                color={themeColors.urgency}
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
                            <Icon
                              name="tag"
                              color={themeColors.urgency}
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

                  <AppText variant="display" className="mt-5">
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
                        <View className="ml-3 h-16 w-16 items-center justify-center rounded-[20px] bg-primary">
                          <Icon
                            name="checkShield"
                            color={themeColors.night}
                            size={32}
                          />
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
                      <Icon
                        name="chevron"
                        color={themeColors.onAction}
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
