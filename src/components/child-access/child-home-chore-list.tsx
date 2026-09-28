import {
  StarMap,
  Scene,
  StarBuddy,
  TreasureChest,
  type QuestStop,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { AppText } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { userErrorMessage } from "@/lib/errors";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { relativeDayLabel, statusLabel } from "./chore-format";
import { ChildQuestCard } from "./child-quest-card";

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
  const queriedOccurrences = useQuery(
    api.personalChores.listMine,
    visualOccurrences ? "skip" : {},
  );
  const queriedRedos = useQuery(
    api.childRedos.listMine,
    visualRedos ? "skip" : {},
  );
  // Same server gate the Extras tab uses (shared subscription).
  const extras = useQuery(
    api.claimableChores.listMine,
    visualOccurrences ? "skip" : {},
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

  const visibleOccurrences = useMemo(
    () => presentation?.currentAndNext ?? [],
    [presentation],
  );
  const recentHistory = useMemo(
    () => presentation?.recentHistory ?? [],
    [presentation],
  );
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
  ): Promise<boolean> {
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

      // The quest card plays its "sent" moment, then closes itself.
      return true;
    } catch (error) {
      Alert.alert(
        attemptNumber === 2 ? "Could not submit Redo" : "Could not submit",
        userErrorMessage(error, "Please try again."),
      );
      return false;
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
          subtitle: withPastDay(
            `+${occurrence.valueSek} kr earned`,
            occurrence,
          ),
        } as QuestStop;
      }
      if (occurrence.state === "missed" || occurrence.state === "failed") {
        return {
          ...base,
          status: "missed",
          subtitle: withPastDay("Missed · 0 kr, no penalty", occurrence),
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

  // The map starts at the rocket: today's finished chores fold into the
  // moon cluster (older ones live in Family and Money), and only the next
  // few upcoming planets are drawn.
  const mapStops = useMemo(() => {
    const finishedToday = new Set(
      recentHistory
        .filter(
          (occurrence) =>
            relativeDayLabel(occurrence.deadlineAt, occurrence.timezone) ===
            "today",
        )
        .map((occurrence) => occurrence.occurrenceId as string),
    );
    const doneToday = stops.filter(
      (stop) =>
        (stop.status === "done" || stop.status === "missed") &&
        finishedToday.has(stop.key),
    );
    const live = stops.filter(
      (stop) => stop.status !== "done" && stop.status !== "missed",
    );
    const scheduledKeys = new Set(
      visibleOccurrences
        .filter((occurrence) => occurrence.state === "scheduled")
        .map((occurrence) => occurrence.occurrenceId as string),
    );
    const now = live.filter((stop) => !scheduledKeys.has(stop.key));
    const later = live.filter((stop) => scheduledKeys.has(stop.key));
    const shownLater = later.slice(0, UPCOMING_PLANETS);
    return {
      doneToday,
      ahead: [...now, ...shownLater],
      moreLater: later.length - shownLater.length,
    };
  }, [recentHistory, stops, visibleOccurrences]);

  const firstRedo = visibleOccurrences.find(
    (occurrence) => occurrence.state === "redo_required",
  );
  const unlockApproved =
    extras !== undefined
      ? extras.gate.canAccessClaimables
      : recentHistory.some(
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
          <StarMap
            stops={mapStops.ahead}
            done={mapStops.doneToday}
            moreLater={mapStops.moreLater}
          />
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

      <ChildQuestCard
        occurrence={selectedOccurrence}
        redo={selectedRedo}
        submitting={
          selectedOccurrence !== undefined &&
          submittingId === selectedOccurrence.occurrenceId
        }
        onClose={() => setSelectedId(null)}
        onSubmit={(attempt, evidenceUploadIntentId) =>
          selectedOccurrence
            ? handleSubmit(selectedOccurrence, attempt, evidenceUploadIntentId)
            : Promise.resolve(false)
        }
      />
    </>
  );
}

const UPCOMING_PLANETS = 3;

// History under "Today's quest" says which day it was, unless it was today.
function withPastDay(text: string, occurrence: ChildHomeChoreOccurrence) {
  const day = relativeDayLabel(occurrence.deadlineAt, occurrence.timezone);
  return day === "today" ? text : `${text} · ${capitalize(day)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
