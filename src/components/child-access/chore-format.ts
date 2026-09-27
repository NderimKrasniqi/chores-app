import { formatTimestampDateTime } from "@/lib/dates";

import type {
  ChildHomeChoreOccurrence,
  ChildHomeRedo,
} from "./child-home-chore-list";

export function formatTime(timestamp: number, timezone: string) {
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

export function relativeDayLabel(timestamp: number, timezone: string) {
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

export function statusLabel(
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
    const day = relativeDayLabel(
      occurrence.availabilityStartsAt,
      occurrence.timezone,
    );
    const time = formatTime(
      occurrence.availabilityStartsAt,
      occurrence.timezone,
    );
    // A chore that opens at the start of the day just "opens tomorrow".
    return time === "00:00" ? `Opens ${day}` : `Opens ${day}, ${time}`;
  }

  const dateLabel = relativeDayLabel(
    occurrence.deadlineAt,
    occurrence.timezone,
  );

  return `Due ${dateLabel}, ${formatTime(occurrence.deadlineAt, occurrence.timezone)}`;
}
