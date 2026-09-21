const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function localTimestampParts(timestamp: number, timeZone?: string) {
  const date = new Date(timestamp);
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function localDateParts(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return { year, month, day };
}

function monthLabel(month: number) {
  return MONTHS[month - 1] ?? "";
}

export function formatLocalDate(localDate: string) {
  const { year, month, day } = localDateParts(localDate);
  if (!year || !month || !day || month < 1 || month > 12) return localDate;
  return `${day} ${monthLabel(month)}`;
}

export function formatLocalDateRange(start: string, end: string) {
  const startParts = localDateParts(start);
  const endParts = localDateParts(end);
  if (
    !startParts.year ||
    !startParts.month ||
    !startParts.day ||
    !endParts.year ||
    !endParts.month ||
    !endParts.day
  ) {
    return `${start}–${end}`;
  }

  if (
    startParts.year === endParts.year &&
    startParts.month === endParts.month
  ) {
    return `${startParts.day}–${endParts.day} ${monthLabel(endParts.month)}`;
  }

  return `${formatLocalDate(start)} – ${formatLocalDate(end)}`;
}

export function formatTimestampDateTime(timestamp: number, timeZone?: string) {
  const { month, day } = localTimestampParts(timestamp, timeZone);
  const time = new Intl.DateTimeFormat("en-SE", {
    ...(timeZone ? { timeZone } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));

  return `${day} ${monthLabel(month)} at ${time}`;
}
