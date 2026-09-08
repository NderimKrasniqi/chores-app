export function getLocalDateForInstant(
  epochMs: number,
  timezone: string,
) {
  if (
    !Number.isFinite(
      epochMs,
    )
  ) {
    throw new Error(
      'Timestamp must be finite.',
    );
  }

  try {
    const formatter =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            timezone,

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(
          epochMs,
        ),
      );

    const year =
      parts.find(
        (part) =>
          part.type ===
          'year',
      )?.value;

    const month =
      parts.find(
        (part) =>
          part.type ===
          'month',
      )?.value;

    const day =
      parts.find(
        (part) =>
          part.type ===
          'day',
      )?.value;

    if (
      !year ||
      !month ||
      !day
    ) {
      throw new Error(
        'Calendar parts were unavailable.',
      );
    }

    return `${year}-${month}-${day}`;
  } catch {
    throw new Error(
      `Invalid IANA timezone "${timezone}".`,
    );
  }
}
