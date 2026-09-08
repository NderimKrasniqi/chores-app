import { internalQuery } from '../../../_generated/server';

import {
  getScheduledLocalDates,
  resolveOccurrenceSchedule,
} from '../../../lib/choreScheduling';

type SmokeTestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

function arraysEqual(
  actual: string[],
  expected: string[],
) {
  return (
    actual.length ===
      expected.length &&
    actual.every(
      (value, index) =>
        value ===
        expected[index],
    )
  );
}

function iso(
  timestamp: number,
) {
  return new Date(
    timestamp,
  ).toISOString();
}

function result(
  label: string,
  passed: boolean,
  detail?: string,
): SmokeTestResult {
  return {
    label,
    passed,

    ...(detail
      ? {
          detail,
        }
      : {}),
  };
}

export const run =
  internalQuery({
    args: {},

    handler:
      async (): Promise<
        SmokeTestResult[]
      > => {
        const results:
          SmokeTestResult[] =
          [];

        /*
         * 1. One-off recurrence.
         */
        {
          const actual =
            getScheduledLocalDates(
              {
                kind:
                  'one_off',

                scheduledDate:
                  '2030-01-15',
              },

              '2030-01-01',
              '2030-01-31',
            );

          const expected = [
            '2030-01-15',
          ];

          results.push(
            result(
              'One-off recurrence',
              arraysEqual(
                actual,
                expected,
              ),
              JSON.stringify(
                actual,
              ),
            ),
          );
        }

        /*
         * 2. Daily interval.
         */
        {
          const actual =
            getScheduledLocalDates(
              {
                kind:
                  'daily',

                startDate:
                  '2030-01-01',

                interval: 2,
              },

              '2030-01-01',
              '2030-01-07',
            );

          const expected = [
            '2030-01-01',
            '2030-01-03',
            '2030-01-05',
            '2030-01-07',
          ];

          results.push(
            result(
              'Daily interval',
              arraysEqual(
                actual,
                expected,
              ),
              JSON.stringify(
                actual,
              ),
            ),
          );
        }

        /*
         * 3. Weekly interval and
         * multiple weekdays.
         *
         * 2026-09-07 is Monday.
         */
        {
          const actual =
            getScheduledLocalDates(
              {
                kind:
                  'weekly',

                startDate:
                  '2026-09-07',

                interval: 2,

                weekdays: [
                  'monday',
                  'thursday',
                ],
              },

              '2026-09-07',
              '2026-09-27',
            );

          const expected = [
            '2026-09-07',
            '2026-09-10',
            '2026-09-21',
            '2026-09-24',
          ];

          results.push(
            result(
              'Weekly interval',
              arraysEqual(
                actual,
                expected,
              ),
              JSON.stringify(
                actual,
              ),
            ),
          );
        }

        /*
         * 4. Monthly day 31 skips
         * months without day 31.
         */
        {
          const actual =
            getScheduledLocalDates(
              {
                kind:
                  'monthly',

                startDate:
                  '2026-01-01',

                interval: 1,

                dayOfMonth:
                  31,
              },

              '2026-01-01',
              '2026-04-30',
            );

          const expected = [
            '2026-01-31',
            '2026-03-31',
          ];

          results.push(
            result(
              'Monthly invalid dates skipped',
              arraysEqual(
                actual,
                expected,
              ),
              JSON.stringify(
                actual,
              ),
            ),
          );
        }

        /*
         * 5. Stockholm winter uses
         * UTC+1.
         */
        {
          const schedule =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-01-15',

                timezone:
                  'Europe/Stockholm',

                availabilityLocalTime:
                  '08:00',

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,
              },
            );

          const availability =
            iso(
              schedule
                .availabilityStartsAt,
            );

          const deadline =
            iso(
              schedule
                .deadlineAt,
            );

          const passed =
            availability ===
              '2026-01-15T07:00:00.000Z' &&
            deadline ===
              '2026-01-15T17:00:00.000Z';

          results.push(
            result(
              'Stockholm winter timezone',
              passed,
              `${availability} / ${deadline}`,
            ),
          );
        }

        /*
         * 6. Stockholm summer uses
         * UTC+2.
         */
        {
          const schedule =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-07-15',

                timezone:
                  'Europe/Stockholm',

                availabilityLocalTime:
                  '08:00',

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,
              },
            );

          const availability =
            iso(
              schedule
                .availabilityStartsAt,
            );

          const deadline =
            iso(
              schedule
                .deadlineAt,
            );

          const passed =
            availability ===
              '2026-07-15T06:00:00.000Z' &&
            deadline ===
              '2026-07-15T16:00:00.000Z';

          results.push(
            result(
              'Stockholm summer timezone',
              passed,
              `${availability} / ${deadline}`,
            ),
          );
        }

        /*
         * 7. Deadline offsets are
         * local calendar days, not
         * fixed 24-hour arithmetic.
         */
        {
          const schedule =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-09-07',

                timezone:
                  'Europe/Stockholm',

                deadlineLocalTime:
                  '07:30',

                deadlineDayOffset:
                  1,
              },
            );

          const availability =
            iso(
              schedule
                .availabilityStartsAt,
            );

          const deadline =
            iso(
              schedule
                .deadlineAt,
            );

          const passed =
            availability ===
              '2026-09-06T22:00:00.000Z' &&
            deadline ===
              '2026-09-08T05:30:00.000Z';

          results.push(
            result(
              'Deadline local-day offset',
              passed,
              `${availability} / ${deadline}`,
            ),
          );
        }

        /*
         * 8. Same wall-clock schedule
         * resolves differently in
         * different IANA zones.
         */
        {
          const stockholm =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-01-15',

                timezone:
                  'Europe/Stockholm',

                availabilityLocalTime:
                  '08:00',

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,
              },
            );

          const newYork =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-01-15',

                timezone:
                  'America/New_York',

                availabilityLocalTime:
                  '08:00',

                deadlineLocalTime:
                  '18:00',

                deadlineDayOffset:
                  0,
              },
            );

          results.push(
            result(
              'IANA timezone changes absolute instant',
              stockholm
                .availabilityStartsAt !==
                newYork
                  .availabilityStartsAt,

              `${iso(
                stockholm
                  .availabilityStartsAt,
              )} / ${iso(
                newYork
                  .availabilityStartsAt,
              )}`,
            ),
          );
        }

        /*
         * 9. DST spring-forward:
         *
         * Stockholm jumps from
         * 01:59:59 CET to
         * 03:00:00 CEST.
         *
         * 01:30 -> 03:30 is therefore
         * only one real elapsed hour.
         */
        {
          const schedule =
            resolveOccurrenceSchedule(
              {
                scheduledLocalDate:
                  '2026-03-29',

                timezone:
                  'Europe/Stockholm',

                availabilityLocalTime:
                  '01:30',

                deadlineLocalTime:
                  '03:30',

                deadlineDayOffset:
                  0,
              },
            );

          const elapsed =
            schedule
              .deadlineAt -
            schedule
              .availabilityStartsAt;

          results.push(
            result(
              'DST spring-forward resolution',
              elapsed ===
                60 *
                  60 *
                  1000,

              `${iso(
                schedule
                  .availabilityStartsAt,
              )} / ${iso(
                schedule
                  .deadlineAt,
              )}`,
            ),
          );
        }

        return results;
      },
  });
