import {
  StarMap,
  Scene,
  StarBuddy,
  Airlock,
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
  titleAccessory,
  onOpenExtras,
}: {
  header?: ReactNode;
  /** Sits at the end of the "Today’s quest" title row. */
  titleAccessory?: ReactNode;
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
      );

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
    // One fixed route in deadline order: a chore keeps its place on the map
    // as it moves on (to do → sent → done), so nothing reshuffles. Finished
    // chores from earlier days live in Family and Money instead.
    const history = recentHistory.filter(
      (occurrence) =>
        relativeDayLabel(occurrence.deadlineAt, occurrence.timezone) ===
        "today",
    );
    const route = [...history, ...visibleOccurrences].sort(
      (left, right) =>
        left.deadlineAt - right.deadlineAt ||
        left.availabilityStartsAt - right.availabilityStartsAt,
    );
    const upNextId = route.find(
      (occurrence) => occurrence.state === "available",
    )?.occurrenceId;

    return route.map((occurrence) => {
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
      if (occurrence.occurrenceId === upNextId) {
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

  // Keep the map about a screen tall: today's finished and sent quests fold
  // into the belt, the rocket's planet (up next or a redo) stays, and only
  // the next few to-dos get a planet — ones open now before ones that open
  // later. The rest fold behind a "+N more" pill that lists them.
  const mapStops = useMemo(() => {
    const byId = new Map(
      visibleOccurrences.map(
        (occurrence) =>
          [occurrence.occurrenceId as string, occurrence] as const,
      ),
    );
    const isOpenNow = (stop: QuestStop) =>
      byId.get(stop.key)?.state === "available";
    const finished = stops.filter(
      (stop) =>
        stop.status === "done" ||
        stop.status === "missed" ||
        stop.status === "review",
    );
    const waiting = stops.filter(
      (stop) => stop.status === "todo" || stop.status === "unlock",
    );
    const next = new Set(
      [
        ...waiting.filter(isOpenNow),
        ...waiting.filter((stop) => !isOpenNow(stop)),
      ]
        .slice(0, NEXT_PLANETS)
        .map((stop) => stop.key),
    );
    const route = stops.filter(
      (stop) =>
        stop.status === "current" ||
        stop.status === "redo" ||
        next.has(stop.key),
    );
    const more = waiting.filter((stop) => !next.has(stop.key));
    const dueToday = more.filter((stop) => {
      const occurrence = byId.get(stop.key);
      return (
        occurrence !== undefined &&
        relativeDayLabel(occurrence.deadlineAt, occurrence.timezone) === "today"
      );
    }).length;
    const moreLabel = [
      dueToday > 0 ? `+${dueToday} more today` : null,
      more.length - dueToday > 0
        ? `+${more.length - dueToday} later this week`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { finished, route, more, moreLabel };
  }, [stops, visibleOccurrences]);

  const toDoCount = visibleOccurrences.filter(
    (o) => o.state === "available" || o.state === "redo_required",
  ).length;

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

        <View className="mb-4">
          <View className="flex-row items-center">
            <AppText variant="screenTitle" className="flex-1">
              Today’s quest
            </AppText>
            {titleAccessory}
          </View>
          {/* The map shows what's next; words only when it has nothing. */}
          {toDoCount === 0 ? (
            <AppText variant="label" color="ink-muted" className="mt-0.5">
              All done for now
            </AppText>
          ) : null}
        </View>

        <View className="-mx-5">
          <StarMap
            stops={mapStops.route}
            finished={mapStops.finished}
            more={mapStops.more}
            moreLabel={mapStops.moreLabel}
          />
        </View>

        {onOpenExtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unlockApproved
                ? "Extras airlock open. Open Extras"
                : "Extras airlock closed. Open Extras"
            }
            onPress={onOpenExtras}
            className="mt-8 flex-row items-center gap-3 rounded-full bg-surface py-2 pl-2 pr-4"
          >
            <Airlock size={40} open={unlockApproved} />
            <View className="flex-1">
              <AppText variant="label" color="gold">
                {unlockApproved ? "Extras are open" : "Extras airlock"}
              </AppText>
              <AppText variant="caption" color="ink-muted" numberOfLines={1}>
                {unlockApproved
                  ? "Bonus quests for extra money"
                  : "Opens when your Unlock Chore is approved"}
              </AppText>
            </View>
            <Icon name="chevron" color={themeColors.inkMuted} size={18} />
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

/** To-do planets drawn after whatever is waiting now. */
const NEXT_PLANETS = 2;

// History under "Today's quest" says which day it was, unless it was today.
function withPastDay(text: string, occurrence: ChildHomeChoreOccurrence) {
  const day = relativeDayLabel(occurrence.deadlineAt, occurrence.timezone);
  return day === "today" ? text : `${text} · ${capitalize(day)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
