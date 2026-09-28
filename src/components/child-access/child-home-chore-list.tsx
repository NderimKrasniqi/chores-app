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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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

  // Today's route, then only the next few upcoming days' planets.
  const mapStops = useMemo(() => {
    const scheduledKeys = new Set(
      visibleOccurrences
        .filter((occurrence) => occurrence.state === "scheduled")
        .map((occurrence) => occurrence.occurrenceId as string),
    );
    const today = stops.filter((stop) => !scheduledKeys.has(stop.key));
    const later = stops.filter((stop) => scheduledKeys.has(stop.key));
    const shownLater = later.slice(0, UPCOMING_PLANETS);
    return {
      route: [...today, ...shownLater],
      moreLater: later.length - shownLater.length,
    };
  }, [stops, visibleOccurrences]);

  const toDoCount = visibleOccurrences.filter(
    (o) => o.state === "available" || o.state === "redo_required",
  ).length;
  const earnedToday = recentHistory
    .filter(
      (occurrence) =>
        occurrence.state === "approved" &&
        relativeDayLabel(occurrence.deadlineAt, occurrence.timezone) ===
          "today",
    )
    .reduce((sum, occurrence) => sum + occurrence.valueSek, 0);

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

  // Open where the rocket is, and follow it when it flies on.
  const scrollRef = useRef<ScrollView>(null);
  const mapTop = useRef(0);
  const scrolledOnce = useRef(false);
  const scrollToRocket = useCallback((rocketY: number) => {
    const y = Math.max(0, mapTop.current + rocketY - 220);
    scrollRef.current?.scrollTo({ y, animated: scrolledOnce.current });
    scrolledOnce.current = true;
  }, []);

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
          <AppText variant="screenTitle">Today’s quest</AppText>
          <AppText variant="label" color="ink-muted" className="mt-0.5">
            {toDoCount === 0 ? "All done for now" : `${toDoCount} to do`}
            {earnedToday > 0 ? (
              <AppText variant="label" color="gold">
                {` · +${earnedToday} kr today`}
              </AppText>
            ) : null}
          </AppText>
        </View>

        <View
          className="-mx-5"
          onLayout={(event) => {
            mapTop.current = event.nativeEvent.layout.y;
          }}
        >
          <StarMap
            stops={mapStops.route}
            moreLater={mapStops.moreLater}
            onRocketY={scrollToRocket}
          />
        </View>

        {onOpenExtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unlockApproved
                ? "Extras chest open. Open Extras"
                : "Extras chest locked. Open Extras"
            }
            onPress={onOpenExtras}
            className="mt-8 flex-row items-center gap-3 rounded-full bg-surface py-2 pl-2 pr-4"
          >
            <TreasureChest
              state={unlockApproved ? "open" : "locked"}
              size={44}
              quiet
            />
            <View className="flex-1">
              <AppText variant="label" color="gold">
                {unlockApproved ? "Extras are open" : "Extras chest"}
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
        ref={scrollRef}
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
