import {
  internalQuery,
} from '../../../_generated/server';
import {
  resolveRedoDeadline,
} from '../../../lib/redoDeadline';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

function expectFailure(
  operation:
    () => unknown,
  message: string,
) {
  try {
    operation();
  } catch {
    return;
  }

  throw new Error(
    message,
  );
}

export const run =
  internalQuery({
    args: {},

    handler: async () => {
      let passed =
        0;

      /*
       * Stockholm is UTC+1 on
       * 2030-01-16.
       *
       * 20:00 household-local therefore
       * resolves to 19:00 UTC.
       */
      const future =
        resolveRedoDeadline({
          deadlineLocalDate:
            '2030-01-16',

          deadlineLocalTime:
            '20:00',

          timezone:
            'Europe/Stockholm',

          reviewedAt:
            Date.UTC(
              2030,
              0,
              16,
              18,
              0,
              0,
            ),
        });

      assert(
        future.deadlineAt ===
          Date.UTC(
            2030,
            0,
            16,
            19,
            0,
            0,
          ),
        'Redo deadline must resolve in the Household IANA timezone.',
      );

      passed += 1;

      console.log(
        '✅ 1/5 Redo deadline resolves in Household timezone',
      );

      const exactReviewTime =
        Date.UTC(
          2030,
          0,
          16,
          19,
          0,
          0,
        );

      expectFailure(
        () =>
          resolveRedoDeadline({
            deadlineLocalDate:
              '2030-01-16',

            deadlineLocalTime:
              '20:00',

            timezone:
              'Europe/Stockholm',

            reviewedAt:
              exactReviewTime,
          }),
        'Redo deadline equal to review time must fail.',
      );

      passed += 1;

      console.log(
        '✅ 2/5 exact review-time Redo deadline is rejected',
      );

      expectFailure(
        () =>
          resolveRedoDeadline({
            deadlineLocalDate:
              '2030-01-16',

            deadlineLocalTime:
              '18:00',

            timezone:
              'Europe/Stockholm',

            reviewedAt:
              exactReviewTime,
          }),
        'Redo deadline before review time must fail.',
      );

      passed += 1;

      console.log(
        '✅ 3/5 past Redo deadline is rejected',
      );

      expectFailure(
        () =>
          resolveRedoDeadline({
            deadlineLocalDate:
              '2030-02-31',

            deadlineLocalTime:
              '20:00',

            timezone:
              'Europe/Stockholm',

            reviewedAt:
              Date.UTC(
                2030,
                0,
                16,
                18,
                0,
                0,
              ),
          }),
        'Invalid local calendar date must fail.',
      );

      passed += 1;

      console.log(
        '✅ 4/5 invalid Redo calendar date is rejected',
      );

      expectFailure(
        () =>
          resolveRedoDeadline({
            deadlineLocalDate:
              '2030-01-16',

            deadlineLocalTime:
              '25:00',

            timezone:
              'Europe/Stockholm',

            reviewedAt:
              Date.UTC(
                2030,
                0,
                16,
                18,
                0,
                0,
              ),
          }),
        'Invalid local clock time must fail.',
      );

      passed += 1;

      console.log(
        '✅ 5/5 invalid Redo clock time is rejected',
      );

      return {
        passed,

        total:
          5,
      };
    },
  });
