import { StarBuddy } from "@/components/art";
import { ActionButton, AppText, SheetBody } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { formatTimestampDateTime } from "@/lib/dates";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { Alert, Modal, Pressable, TextInput, View } from "react-native";
import { userErrorMessage } from "@/lib/errors";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DeckEvidence, ReviewDeck, type DeckItem } from "./review-deck";

function formatTime(timestamp: number, timezone?: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      ...(timezone ? { timeZone: timezone } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

function submittedLabel(timestamp: number, timezone?: string) {
  try {
    const dateTime = formatTimestampDateTime(timestamp, timezone);
    const date = dateTime.split(" at ")[0];
    const today = formatTimestampDateTime(Date.now(), timezone).split(
      " at ",
    )[0];
    return `${date === today ? "Today" : date}, ${formatTime(timestamp, timezone)}`;
  } catch {
    return formatTime(timestamp, timezone);
  }
}

function tomorrowDate(timezone: string) {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [year, month, day] = today.split("-").map(Number);
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 12));
    return [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
      String(tomorrow.getUTCDate()).padStart(2, "0"),
    ].join("-");
  } catch {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }
}

function dateInDays(timezone: string, days: number) {
  if (days === 1) return tomorrowDate(timezone);
  if (days === 0) {
    const [year, month, day] = tomorrowDate(timezone).split("-").map(Number);
    const today = new Date(Date.UTC(year, month - 1, day - 1, 12));
    return [
      today.getUTCFullYear(),
      String(today.getUTCMonth() + 1).padStart(2, "0"),
      String(today.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }
  const [year, month, day] = tomorrowDate(timezone).split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days - 1, 12));
  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, "0"),
    String(target.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function dayChipLabel(value: string, days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/**
 * Two parents reviewing at once: the first decision wins (D-17), and the
 * second one hears that plainly instead of a server message.
 */
function reviewErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error &&
    /not awaiting (parent |initial )?review|already been reviewed|already has an earning/i.test(
      error.message,
    )
    ? "Another parent already reviewed this one. The deck has moved on."
    : userErrorMessage(error, fallback);
}

/**
 * Reviews as a deck of cards: swipe right to approve, left for a redo.
 * Initial submissions ask for a redo deadline in a quick sheet; a redo that
 * isn't good enough is confirmed first, since it ends at 0 kr (and a penalty
 * for a locked Extra).
 */
export function ParentReviewsContent({
  householdId,
  householdTimezone,
  visualItems,
}: {
  householdId: Id<"households">;
  householdTimezone: string;
  /** Preview only: render these cards and act on them locally. */
  visualItems?: DeckItem[];
}) {
  const queryArgs = visualItems ? "skip" : { householdId };
  const [visualDone, setVisualDone] = useState<string[]>([]);
  const { tokens } = useTheme();
  const personal = useQuery(api.personalChoreReviews.listPending, queryArgs);
  const claimable = useQuery(api.claimableChoreReviews.listPending, queryArgs);
  const redos = useQuery(api.redoChoreReviews.listPending, queryArgs);
  const approvePersonal = useServerConfirmedMutation(
    api.personalChoreReviews.approve,
  );
  const rejectPersonal = useServerConfirmedMutation(
    api.personalChoreReviews.reject,
  );
  const approveClaimable = useServerConfirmedMutation(
    api.claimableChoreReviews.approve,
  );
  const rejectClaimable = useServerConfirmedMutation(
    api.claimableChoreReviews.reject,
  );
  const approvePersonalRedo = useServerConfirmedMutation(
    api.personalChoreReviews.approveRedo,
  );
  const rejectPersonalRedo = useServerConfirmedMutation(
    api.personalChoreReviews.rejectRedo,
  );
  const approveClaimableRedo = useServerConfirmedMutation(
    api.claimableChoreReviews.approveRedo,
  );
  const rejectClaimableRedo = useServerConfirmedMutation(
    api.claimableChoreReviews.rejectRedo,
  );

  const [redoFor, setRedoFor] = useState<DeckItem | null>(null);
  // One review in flight at a time: blocks same-frame double taps/swipes.
  const inFlight = useRef(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queriedItems: DeckItem[] = [
    ...(personal ?? []).map((item) => ({
      ...item,
      source: "personal" as const,
      kind: "personal" as const,
    })),
    ...(claimable ?? []).map((item) => ({
      ...item,
      source: "claimable" as const,
      kind: "claimable" as const,
      isUnlockChore: false,
    })),
    ...(redos ?? []).map((item) => ({
      ...item,
      source: "redo" as const,
      deadlineAt: item.redoDeadlineAt,
    })),
  ].sort((left, right) => left.submittedAt - right.submittedAt);
  const items = visualItems
    ? visualItems.filter((item) => !visualDone.includes(item.submissionId))
    : queriedItems;

  const loading =
    !visualItems &&
    (personal === undefined || claimable === undefined || redos === undefined);

  async function approve(item: DeckItem) {
    setWorking(true);
    setError(null);
    try {
      if (item.source === "personal")
        await approvePersonal({ submissionId: item.submissionId });
      else if (item.source === "claimable")
        await approveClaimable({ submissionId: item.submissionId });
      else if (item.kind === "personal")
        await approvePersonalRedo({ submissionId: item.submissionId });
      else await approveClaimableRedo({ submissionId: item.submissionId });
      return true;
    } catch (approveError) {
      setError(reviewErrorMessage(approveError, "Could not approve this."));
      return false;
    } finally {
      setWorking(false);
    }
  }

  function confirmRedoIncomplete(item: DeckItem) {
    Alert.alert(
      "Mark the redo as not done?",
      item.kind === "claimable"
        ? `${item.childDisplayName} earns 0 kr and the Extra's ${item.valueSek} kr is deducted.`
        : `${item.childDisplayName} earns 0 kr for this chore.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark not done",
          style: "destructive",
          onPress: () => {
            setWorking(true);
            setError(null);
            const mutation =
              item.kind === "personal"
                ? rejectPersonalRedo
                : rejectClaimableRedo;
            void mutation({ submissionId: item.submissionId })
              .catch((rejectError) =>
                setError(
                  reviewErrorMessage(
                    rejectError,
                    "Could not finish the redo review.",
                  ),
                ),
              )
              .finally(() => setWorking(false));
          },
        },
      ],
    );
  }

  async function onVerdict(item: DeckItem, verdict: "approve" | "redo") {
    if (inFlight.current) return false;
    if (visualItems) {
      if (verdict === "redo") {
        setRedoFor(item);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      setVisualDone((done) => [...done, item.submissionId]);
      return true;
    }
    if (verdict === "approve") {
      inFlight.current = true;
      try {
        return await approve(item);
      } finally {
        inFlight.current = false;
      }
    }
    // Redo needs a decision first; the card springs back meanwhile.
    if (item.source === "redo") confirmRedoIncomplete(item);
    else setRedoFor(item);
    return false;
  }

  async function askForRedo(
    item: DeckItem,
    date: string,
    time: string,
    reason: string,
  ) {
    setWorking(true);
    setError(null);
    try {
      const args = {
        submissionId: item.submissionId,
        redoDeadlineLocalDate: date,
        redoDeadlineLocalTime: time,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };
      if (item.source === "personal") await rejectPersonal(args);
      else await rejectClaimable(args);
      setRedoFor(null);
    } catch (rejectError) {
      const message = reviewErrorMessage(
        rejectError,
        "Could not ask for a redo.",
      );
      setError(message);
      // Another parent already decided: that card is gone, so close the
      // sheet and show the message on the deck.
      if (
        message !== userErrorMessage(rejectError, "Could not ask for a redo.")
      )
        setRedoFor(null);
    } finally {
      setWorking(false);
    }
  }

  const names = [...new Set(items.map((item) => item.childDisplayName))];

  return (
    <View className="pb-6">
      <View className="flex-row items-end justify-between">
        <View>
          <AppText className="font-display text-[34px] leading-[38px]">
            {loading ? "…" : items.length}
          </AppText>
          <AppText color="ink-muted" className="font-body-bold">
            {items.length === 1 ? "chore to check" : "chores to check"}
          </AppText>
        </View>
        {items.length > 0 ? (
          <AppText
            variant="caption"
            color="ink-muted"
            className="mb-1 max-w-[55%] text-right"
          >
            From {names.join(", ")}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <View
          className="mt-3 rounded-large px-4 py-3"
          style={{ backgroundColor: tokens.urgencySoft }}
        >
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <View className="mt-10 items-center">
          <StarBuddy size={96} mood="dance" />
          <AppText variant="sectionTitle" className="mt-4 text-center">
            All caught up!
          </AppText>
          <AppText color="ink-muted" className="mt-1 text-center">
            New work from the kids lands here as a card.
          </AppText>
        </View>
      ) : null}

      {!loading && items.length > 0 ? (
        <View className="mt-5">
          <ReviewDeck
            items={items}
            busy={working}
            submittedLabel={(timestamp) =>
              submittedLabel(timestamp, householdTimezone)
            }
            onVerdict={onVerdict}
          />
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-3 text-center"
          >
            Swipe right to approve · left to ask for a redo
          </AppText>
          <DeckEvidence item={items[0]} />
        </View>
      ) : null}

      <RedoSheet
        key={redoFor?.submissionId ?? "none"}
        item={redoFor}
        timezone={householdTimezone}
        working={working}
        error={redoFor ? error : null}
        onClose={() => setRedoFor(null)}
        onConfirm={(date, time, reason) => {
          if (redoFor) void askForRedo(redoFor, date, time, reason);
        }}
      />
    </View>
  );
}

const DAY_OPTIONS = [0, 1, 2, 3];
const TIME_OPTIONS = ["14:00", "16:00", "18:00", "20:00"];

/** Matches the server's cap (convex/lib/reviews/initialRejection.ts). */
const REDO_REASON_MAX = 120;
const REASON_CHIPS = [
  "Missed a spot",
  "Not finished",
  "Tidy it up",
  "Add a photo",
];

function RedoSheet({
  item,
  timezone,
  working,
  error,
  onClose,
  onConfirm,
}: {
  item: DeckItem | null;
  timezone: string;
  working: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (date: string, time: string, reason: string) => void;
}) {
  const { tokens } = useTheme();
  const [days, setDays] = useState(1);
  const [time, setTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const date = dateInDays(timezone, days);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={item !== null}
      onRequestClose={() => {
        if (!working) onClose();
      }}
    >
      <View className="flex-1 justify-end bg-scrim">
        {item ? (
          <SheetBody className="rounded-t-sheet bg-surface px-5 pt-3">
            <View className="h-1.5 w-12 self-center rounded-full bg-line" />
            <AppText variant="sectionTitle" className="mt-4">
              Ask {item.childDisplayName} for a redo
            </AppText>
            <AppText color="ink-muted" className="mt-1">
              {item.title} gets one more try. There’s no second redo.
            </AppText>

            <AppText variant="label" color="ink-muted" className="mt-5">
              Redo by
            </AppText>
            <ChipRow
              options={DAY_OPTIONS.map((option) => ({
                key: String(option),
                label: dayChipLabel(dateInDays(timezone, option), option),
              }))}
              selected={String(days)}
              onSelect={(key) => setDays(Number(key))}
            />
            <ChipRow
              options={TIME_OPTIONS.map((option) => ({
                key: option,
                label: option,
              }))}
              selected={time}
              onSelect={setTime}
            />

            <AppText variant="label" color="ink-muted" className="mt-5">
              What to fix (optional)
            </AppText>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {REASON_CHIPS.map((chip) => {
                const active = reason === chip;
                return (
                  <Pressable
                    key={chip}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setReason(active ? "" : chip)}
                    className="min-h-[36px] justify-center rounded-full px-3.5"
                    style={{
                      backgroundColor: active
                        ? tokens.ink
                        : tokens.surfaceMuted,
                    }}
                  >
                    <AppText
                      variant="label"
                      style={{ color: active ? tokens.surface : tokens.ink }}
                    >
                      {chip}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="What to fix"
              value={reason}
              onChangeText={setReason}
              placeholder={`Tell ${item.childDisplayName} what to fix`}
              placeholderTextColor={tokens.inkFaint}
              maxLength={REDO_REASON_MAX}
              className="mt-2 min-h-[48px] rounded-[16px] px-4 font-body-bold text-ink"
              style={{ backgroundColor: tokens.surfaceMuted }}
            />

            {error ? (
              <AppText variant="bodySmall" color="urgency" className="mt-4">
                {error}
              </AppText>
            ) : null}
            <ActionButton
              className="mt-6"
              tone="destructive"
              label="Ask for a redo"
              loading={working}
              onPress={() => onConfirm(date, time, reason)}
            />
            <ActionButton
              className="mt-1"
              tone="quiet"
              label="Cancel"
              disabled={working}
              onPress={onClose}
            />
          </SheetBody>
        ) : null}
      </View>
    </Modal>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View className="mt-2 flex-row gap-2">
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.key)}
            className="min-h-[44px] flex-1 items-center justify-center rounded-full"
            style={{
              backgroundColor: active ? tokens.ink : tokens.surfaceMuted,
            }}
          >
            <AppText
              className="font-body-heavy text-[15px]"
              style={{ color: active ? tokens.surface : tokens.ink }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
