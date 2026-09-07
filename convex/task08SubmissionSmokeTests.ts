import {
  ConvexError,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import {
  listPersonalOccurrencesForChild,
  submitPersonalOccurrence,
} from './lib/personalChoreExecution';

type SmokeTestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

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

async function expectReject(
  operation:
    () => Promise<unknown>,
) {
  try {
    await operation();

    return false;
  } catch {
    return true;
  }
}

export const run =
  mutation({
    args: {},

    handler:
      async (
        ctx,
      ): Promise<
        SmokeTestResult[]
      > => {
        if (
          process.env
            .APP_ENV ===
          'production'
        ) {
          throw new ConvexError(
            'Developer smoke tests are disabled in production.',
          );
        }

        const results:
          SmokeTestResult[] =
          [];

        const testNow =
          Date.UTC(
            2030,
            0,
            15,
            12,
            0,
            0,
            0,
          );

        const householdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-08 Smoke Household',

              timezone:
                'Europe/Stockholm',

              payoutWeekday:
                'friday',

              weeklyUnclaimAllowance:
                1,

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const childA =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-08 Child A',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const childB =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-08 Child B',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const personalDefinition =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'personal',

              title:
                'TASK-08 Personal',

              valueSek: 20,

              recurrence: {
                kind:
                  'daily',

                startDate:
                  '2030-01-15',

                interval: 1,
              },

              availabilityLocalTime:
                '08:00',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              personalChildId:
                childA,

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task08-smoke',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const claimableDefinition =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'claimable',

              title:
                'TASK-08 Claimable',

              valueSek: 30,

              recurrence: {
                kind:
                  'one_off',

                scheduledDate:
                  '2030-01-15',
              },

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task08-smoke',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        async function insertPersonalOccurrence(
          scheduledLocalDate:
            string,

          availabilityStartsAt:
            number,

          deadlineAt:
            number,

          personalChildId =
            childA,
        ) {
          return await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                personalDefinition,

              kind:
                'personal',

              title:
                `Personal ${scheduledLocalDate}`,

              valueSek: 20,

              scheduledLocalDate,

              timezone:
                'Europe/Stockholm',

              availabilityLocalTime:
                '08:00',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt,

              deadlineAt,

              personalChildId,

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                testNow,
            },
          );
        }

        const onTimeOccurrence =
          await insertPersonalOccurrence(
            '2030-01-15',
            testNow -
              60 * 60 * 1000,
            testNow +
              60 * 60 * 1000,
          );

        const beforeAvailabilityOccurrence =
          await insertPersonalOccurrence(
            '2030-01-16',
            testNow +
              60 * 60 * 1000,
            testNow +
              2 * 60 * 60 * 1000,
          );

        const lateOccurrence =
          await insertPersonalOccurrence(
            '2030-01-17',
            testNow -
              2 * 60 * 60 * 1000,
            testNow - 1,
          );

        const boundaryOccurrence =
          await insertPersonalOccurrence(
            '2030-01-18',
            testNow -
              60 * 60 * 1000,
            testNow,
          );

        const otherChildOccurrence =
          await insertPersonalOccurrence(
            '2030-01-19',
            testNow -
              60 * 60 * 1000,
            testNow +
              60 * 60 * 1000,
            childB,
          );

        const claimableOccurrence =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                claimableDefinition,

              kind:
                'claimable',

              title:
                'TASK-08 Claimable',

              valueSek: 30,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                testNow -
                60 * 60 * 1000,

              deadlineAt:
                testNow +
                60 * 60 * 1000,

              eligibleChildIds: [
                childA,
              ],

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                testNow,
            },
          );

        /*
         * 1. Child view contains only
         * that Child's Personal Chores.
         */
        const childAOccurrences =
          await listPersonalOccurrencesForChild(
            ctx,
            childA,
          );

        results.push(
          result(
            'Child view contains only assigned Personal Chores',
            childAOccurrences
              .length ===
              4 &&
              childAOccurrences.every(
                (occurrence) =>
                  occurrence.kind ===
                    'personal' &&
                  occurrence.personalChildId ===
                    childA,
              ),
            `${childAOccurrences.length} occurrence(s)`,
          ),
        );

        /*
         * 2. Normal on-time submission.
         */
        const submission =
          await submitPersonalOccurrence(
            ctx,
            onTimeOccurrence,
            childA,
            testNow,
          );

        const submittedOccurrence =
          await ctx.db.get(
            onTimeOccurrence,
          );

        results.push(
          result(
            'On-time Personal Chore submission succeeds',
            submission.submittedAt ===
              testNow &&
              submittedOccurrence
                ?.state ===
                'submitted',
            `${submission.submittedAt}`,
          ),
        );

        /*
         * 3. Duplicate attempt 1 is
         * rejected.
         */
        const duplicateRejected =
          await expectReject(
            () =>
              submitPersonalOccurrence(
                ctx,
                onTimeOccurrence,
                childA,
                testNow,
              ),
          );

        results.push(
          result(
            'Duplicate submission is rejected',
            duplicateRejected,
          ),
        );

        /*
         * 4. Before availability.
         */
        results.push(
          result(
            'Submission before availability is rejected',
            await expectReject(
              () =>
                submitPersonalOccurrence(
                  ctx,
                  beforeAvailabilityOccurrence,
                  childA,
                  testNow,
                ),
            ),
          ),
        );

        /*
         * 5. Strictly after deadline.
         */
        results.push(
          result(
            'Late submission is rejected',
            await expectReject(
              () =>
                submitPersonalOccurrence(
                  ctx,
                  lateOccurrence,
                  childA,
                  testNow,
                ),
            ),
          ),
        );

        /*
         * 6. Exactly at deadline is
         * valid per D-04.
         */
        const boundarySubmission =
          await submitPersonalOccurrence(
            ctx,
            boundaryOccurrence,
            childA,
            testNow,
          );

        results.push(
          result(
            'Submission exactly at deadline succeeds',
            boundarySubmission
              .submittedAt ===
              testNow,
          ),
        );

        /*
         * 7. A sibling cannot submit
         * another Child's Personal
         * occurrence.
         */
        results.push(
          result(
            'Wrong Child cannot submit Personal Chore',
            await expectReject(
              () =>
                submitPersonalOccurrence(
                  ctx,
                  otherChildOccurrence,
                  childA,
                  testNow,
                ),
            ),
          ),
        );

        /*
         * 8. Claimable Chores cannot
         * enter the Personal flow.
         */
        results.push(
          result(
            'Claimable Chore is rejected by Personal submission flow',
            await expectReject(
              () =>
                submitPersonalOccurrence(
                  ctx,
                  claimableOccurrence,
                  childA,
                  testNow,
                ),
            ),
          ),
        );

        /*
         * Cleanup.
         */
        const submissions =
          await ctx.db
            .query(
              'choreSubmissions',
            )
            .withIndex(
              'by_household_submitted_at',
              (q) =>
                q.eq(
                  'householdId',
                  householdId,
                ),
            )
            .collect();

        for (
          const submissionDoc of
          submissions
        ) {
          await ctx.db.delete(
            submissionDoc._id,
          );
        }

        const occurrences =
          await ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_household',
              (q) =>
                q.eq(
                  'householdId',
                  householdId,
                ),
            )
            .collect();

        for (
          const occurrence of
          occurrences
        ) {
          await ctx.db.delete(
            occurrence._id,
          );
        }

        await ctx.db.delete(
          personalDefinition,
        );

        await ctx.db.delete(
          claimableDefinition,
        );

        await ctx.db.delete(
          childA,
        );

        await ctx.db.delete(
          childB,
        );

        await ctx.db.delete(
          householdId,
        );

        results.push(
          result(
            'Test data cleanup',
            true,
          ),
        );

        return results;
      },
  });
