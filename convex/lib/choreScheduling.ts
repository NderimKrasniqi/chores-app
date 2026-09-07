import { TZDate } from '@date-fns/tz';

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ChoreRecurrence =
  | {
      kind: 'one_off';
      scheduledDate: string;
    }
  | {
      kind: 'daily';
      startDate: string;
      interval: number;
    }
  | {
      kind: 'weekly';
      startDate: string;
      interval: number;
      weekdays: Weekday[];
    }
  | {
      kind: 'monthly';
      startDate: string;
      interval: number;
      dayOfMonth: number;
    };

export type ResolveOccurrenceScheduleInput = {
  scheduledLocalDate: string;

  timezone: string;

  availabilityLocalTime?:
    string;

  deadlineLocalTime:
    string;

  deadlineDayOffset:
    number;
};

export type ResolvedOccurrenceSchedule = {
  scheduledLocalDate:
    string;

  timezone:
    string;

  availabilityLocalTime?:
    string;

  deadlineLocalTime:
    string;

  deadlineDayOffset:
    number;

  availabilityStartsAt:
    number;

  deadlineAt:
    number;
};

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const weekdayOrder:
  Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

type LocalTimeParts = {
  hour: number;
  minute: number;
};

function parseLocalDate(
  value: string,
): LocalDateParts {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    throw new Error(
      `Invalid local date "${value}". Expected YYYY-MM-DD.`,
    );
  }

  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    throw new Error(
      `Invalid calendar date "${value}".`,
    );
  }

  return {
    year,
    month,
    day,
  };
}

function parseLocalTime(
  value: string,
): LocalTimeParts {
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value,
    )
  ) {
    throw new Error(
      `Invalid local time "${value}". Expected HH:mm.`,
    );
  }

  const [
    hour,
    minute,
  ] = value
    .split(':')
    .map(Number);

  return {
    hour,
    minute,
  };
}

function formatLocalDate(
  parts:
    LocalDateParts,
) {
  return [
    parts.year
      .toString()
      .padStart(4, '0'),

    parts.month
      .toString()
      .padStart(2, '0'),

    parts.day
      .toString()
      .padStart(2, '0'),
  ].join('-');
}

function localDateDayNumber(
  value: string,
) {
  const {
    year,
    month,
    day,
  } =
    parseLocalDate(
      value,
    );

  return Math.floor(
    Date.UTC(
      year,
      month - 1,
      day,
    ) /
      millisecondsPerDay,
  );
}

function weekdayIndex(
  localDate: string,
) {
  const {
    year,
    month,
    day,
  } =
    parseLocalDate(
      localDate,
    );

  /*
   * getUTCDay:
   * Sunday = 0
   * Monday = 1
   * ...
   *
   * Our domain:
   * Monday = 0
   * ...
   * Sunday = 6
   */
  const utcWeekday =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    ).getUTCDay();

  return (
    utcWeekday + 6
  ) % 7;
}

function monthNumber(
  localDate: string,
) {
  const {
    year,
    month,
  } =
    parseLocalDate(
      localDate,
    );

  return (
    year * 12 +
    (month - 1)
  );
}

function requirePositiveInterval(
  value: number,
) {
  if (
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      'Recurrence interval must be a positive whole number.',
    );
  }
}

function requireValidTimeZone(
  timezone: string,
) {
  try {
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          timezone,
      },
    ).format(
      new Date(),
    );
  } catch {
    throw new Error(
      `Invalid IANA timezone "${timezone}".`,
    );
  }
}

export function addLocalDays(
  localDate: string,
  days: number,
) {
  if (
    !Number.isSafeInteger(
      days,
    )
  ) {
    throw new Error(
      'Calendar day offset must be a whole number.',
    );
  }

  const {
    year,
    month,
    day,
  } =
    parseLocalDate(
      localDate,
    );

  const result =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + days,
      ),
    );

  return formatLocalDate({
    year:
      result.getUTCFullYear(),

    month:
      result.getUTCMonth() +
      1,

    day:
      result.getUTCDate(),
  });
}

export function getWeekday(
  localDate: string,
): Weekday {
  return weekdayOrder[
    weekdayIndex(
      localDate,
    )
  ];
}

export function matchesRecurrenceOnDate(
  recurrence:
    ChoreRecurrence,
  candidateLocalDate:
    string,
) {
  parseLocalDate(
    candidateLocalDate,
  );

  switch (
    recurrence.kind
  ) {
    case 'one_off':
      return (
        candidateLocalDate ===
        recurrence
          .scheduledDate
      );

    case 'daily': {
      requirePositiveInterval(
        recurrence.interval,
      );

      parseLocalDate(
        recurrence.startDate,
      );

      const difference =
        localDateDayNumber(
          candidateLocalDate,
        ) -
        localDateDayNumber(
          recurrence.startDate,
        );

      return (
        difference >= 0 &&
        difference %
          recurrence.interval ===
          0
      );
    }

    case 'weekly': {
      requirePositiveInterval(
        recurrence.interval,
      );

      parseLocalDate(
        recurrence.startDate,
      );

      if (
        candidateLocalDate <
        recurrence.startDate
      ) {
        return false;
      }

      const candidateWeekday =
        getWeekday(
          candidateLocalDate,
        );

      if (
        !recurrence.weekdays.includes(
          candidateWeekday,
        )
      ) {
        return false;
      }

      const startWeekStart =
        localDateDayNumber(
          recurrence.startDate,
        ) -
        weekdayIndex(
          recurrence.startDate,
        );

      const candidateWeekStart =
        localDateDayNumber(
          candidateLocalDate,
        ) -
        weekdayIndex(
          candidateLocalDate,
        );

      const weekDifference =
        Math.floor(
          (
            candidateWeekStart -
            startWeekStart
          ) / 7,
        );

      return (
        weekDifference >= 0 &&
        weekDifference %
          recurrence.interval ===
          0
      );
    }

    case 'monthly': {
      requirePositiveInterval(
        recurrence.interval,
      );

      if (
        !Number.isSafeInteger(
          recurrence.dayOfMonth,
        ) ||
        recurrence.dayOfMonth <
          1 ||
        recurrence.dayOfMonth >
          31
      ) {
        throw new Error(
          'Monthly day must be between 1 and 31.',
        );
      }

      parseLocalDate(
        recurrence.startDate,
      );

      if (
        candidateLocalDate <
        recurrence.startDate
      ) {
        return false;
      }

      const candidate =
        parseLocalDate(
          candidateLocalDate,
        );

      if (
        candidate.day !==
        recurrence.dayOfMonth
      ) {
        return false;
      }

      const difference =
        monthNumber(
          candidateLocalDate,
        ) -
        monthNumber(
          recurrence.startDate,
        );

      /*
       * Months without the configured day are skipped.
       *
       * Example:
       * Monthly on day 31:
       * Jan 31 -> Mar 31 -> May 31.
       *
       * February is not silently clamped to Feb 28.
       */
      return (
        difference >= 0 &&
        difference %
          recurrence.interval ===
          0
      );
    }
  }
}

export function getScheduledLocalDates(
  recurrence:
    ChoreRecurrence,

  fromLocalDate:
    string,

  throughLocalDate:
    string,
) {
  parseLocalDate(
    fromLocalDate,
  );

  parseLocalDate(
    throughLocalDate,
  );

  if (
    throughLocalDate <
    fromLocalDate
  ) {
    return [];
  }

  if (
    recurrence.kind ===
    'one_off'
  ) {
    parseLocalDate(
      recurrence
        .scheduledDate,
    );

    return recurrence
      .scheduledDate >=
        fromLocalDate &&
      recurrence
        .scheduledDate <=
        throughLocalDate
      ? [
          recurrence
            .scheduledDate,
        ]
      : [];
  }

  const dayCount =
    localDateDayNumber(
      throughLocalDate,
    ) -
    localDateDayNumber(
      fromLocalDate,
    );

  /*
   * Guard against accidentally requesting an enormous
   * synchronous recurrence window.
   *
   * Normal occurrence generation will use a much smaller
   * rolling horizon.
   */
  if (
    dayCount > 3660
  ) {
    throw new Error(
      'Recurrence window cannot exceed 3660 days.',
    );
  }

  const dates:
    string[] = [];

  for (
    let offset = 0;
    offset <= dayCount;
    offset += 1
  ) {
    const candidate =
      addLocalDays(
        fromLocalDate,
        offset,
      );

    if (
      matchesRecurrenceOnDate(
        recurrence,
        candidate,
      )
    ) {
      dates.push(
        candidate,
      );
    }
  }

  return dates;
}

export function resolveLocalDateTimeToEpochMs(
  localDate: string,
  localTime: string,
  timezone: string,
) {
  const {
    year,
    month,
    day,
  } =
    parseLocalDate(
      localDate,
    );

  const {
    hour,
    minute,
  } =
    parseLocalTime(
      localTime,
    );

  requireValidTimeZone(
    timezone,
  );

  /*
   * TZDate resolves the supplied wall-clock components
   * in the explicit Household IANA timezone.
   *
   * We never depend on the device timezone or the
   * server's process timezone.
   */
  const resolved =
    new TZDate(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0,
      timezone,
    );

  const timestamp =
    resolved.getTime();

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    throw new Error(
      `Could not resolve ${localDate} ${localTime} in ${timezone}.`,
    );
  }

  return timestamp;
}

export function resolveOccurrenceSchedule(
  input:
    ResolveOccurrenceScheduleInput,
): ResolvedOccurrenceSchedule {
  parseLocalDate(
    input
      .scheduledLocalDate,
  );

  requireValidTimeZone(
    input.timezone,
  );

  if (
    !Number.isSafeInteger(
      input
        .deadlineDayOffset,
    ) ||
    input
      .deadlineDayOffset <
      0
  ) {
    throw new Error(
      'Deadline day offset must be a non-negative whole number.',
    );
  }

  const availabilityLocalTime =
    input
      .availabilityLocalTime ??
    '00:00';

  parseLocalTime(
    availabilityLocalTime,
  );

  parseLocalTime(
    input
      .deadlineLocalTime,
  );

  const deadlineLocalDate =
    addLocalDays(
      input
        .scheduledLocalDate,

      input
        .deadlineDayOffset,
    );

  const availabilityStartsAt =
    resolveLocalDateTimeToEpochMs(
      input
        .scheduledLocalDate,

      availabilityLocalTime,

      input.timezone,
    );

  const deadlineAt =
    resolveLocalDateTimeToEpochMs(
      deadlineLocalDate,

      input
        .deadlineLocalTime,

      input.timezone,
    );

  if (
    deadlineAt <=
    availabilityStartsAt
  ) {
    throw new Error(
      'Resolved deadline must be after availability start.',
    );
  }

  return {
    scheduledLocalDate:
      input
        .scheduledLocalDate,

    timezone:
      input.timezone,

    ...(input
      .availabilityLocalTime
      ? {
          availabilityLocalTime:
            input
              .availabilityLocalTime,
        }
      : {}),

    deadlineLocalTime:
      input
        .deadlineLocalTime,

    deadlineDayOffset:
      input
        .deadlineDayOffset,

    availabilityStartsAt,

    deadlineAt,
  };
}
