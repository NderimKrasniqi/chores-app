import {
  ConvexError,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import { generateOccurrencesForWindow } from './lib/choreOccurrenceGeneration';
import { reconcileOccurrenceLifecycle } from './lib/choreOccurrenceLifecycle';

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

function sameIds(
  actual: string[],
  expected: string[],
) {
  return (
    [...actual]
      .sort()
      .join('|') ===
    [...expected]
      .sort()
      .join('|')
  );
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

        const now =
          Date.now();

        const householdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-07 Smoke Household',

              timezone:
                'Europe/Stockholm',

              payoutWeekday:
                'friday',

              weeklyUnclaimAllowance:
                1,

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const firstChildId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-07 Child A',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const secondChildId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-07 Child B',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const definitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'claimable',

              title:
                'TASK-07 Original',

              valueSek: 10,

              recurrence: {
                kind:
                  'daily',

                startDate:
                  '2030-01-01',

                interval: 1,
              },

              availabilityLocalTime:
                '08:00',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task07-smoke',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        /*
         * Smoke tests intentionally
         * disable durable scheduling.
         */
        const firstGeneration =
          await generateOccurrencesForWindow(
            ctx,
            householdId,
            '2030-01-01',
            '2030-01-03',
            {
              scheduleTransitions:
                false,
            },
          );

        results.push(
          result(
            'Initial generation creates expected occurrences',
            firstGeneration
              .createdCount ===
              3,
            JSON.stringify(
              firstGeneration,
            ),
          ),
        );

        const secondGeneration =
          await generateOccurrencesForWindow(
            ctx,
            householdId,
            '2030-01-01',
            '2030-01-03',
            {
              scheduleTransitions:
                false,
            },
          );

        results.push(
          result(
            'Generation is idempotent',
            secondGeneration
              .createdCount ===
              0 &&
              secondGeneration
                .skippedExistingCount ===
                3,
            JSON.stringify(
              secondGeneration,
            ),
          ),
        );

        const originalOccurrence =
          await ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_definition_scheduled_date',
              (q) =>
                q
                  .eq(
                    'choreDefinitionId',
                    definitionId,
                  )
                  .eq(
                    'scheduledLocalDate',
                    '2030-01-01',
                  ),
            )
            .unique();

        results.push(
          result(
            'All-Children eligibility is snapshotted',
            !!originalOccurrence &&
              originalOccurrence
                .eligibleChildIds !==
                undefined &&
              sameIds(
                originalOccurrence
                  .eligibleChildIds,
                [
                  firstChildId,
                  secondChildId,
                ],
              ),
            originalOccurrence
              ? JSON.stringify(
                  originalOccurrence
                    .eligibleChildIds,
                )
              : 'Occurrence missing',
          ),
        );

        await ctx.db.patch(
          definitionId,
          {
            title:
              'TASK-07 Edited',

            valueSek: 99,

            updatedAt:
              now + 1,
          },
        );

        await ctx.db.patch(
          householdId,
          {
            timezone:
              'America/New_York',

            updatedAt:
              now + 1,
          },
        );

        const futureGeneration =
          await generateOccurrencesForWindow(
            ctx,
            householdId,
            '2030-01-04',
            '2030-01-04',
            {
              scheduleTransitions:
                false,
            },
          );

        const oldAfterEdit =
          await ctx.db.get(
            originalOccurrence!._id,
          );

        results.push(
          result(
            'Existing occurrence keeps original snapshots',
            !!oldAfterEdit &&
              oldAfterEdit.title ===
                'TASK-07 Original' &&
              oldAfterEdit.valueSek ===
                10 &&
              oldAfterEdit.timezone ===
                'Europe/Stockholm',
            oldAfterEdit
              ? `${oldAfterEdit.title} / ${oldAfterEdit.valueSek} / ${oldAfterEdit.timezone}`
              : 'Occurrence missing',
          ),
        );

        const futureOccurrence =
          await ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_definition_scheduled_date',
              (q) =>
                q
                  .eq(
                    'choreDefinitionId',
                    definitionId,
                  )
                  .eq(
                    'scheduledLocalDate',
                    '2030-01-04',
                  ),
            )
            .unique();

        results.push(
          result(
            'Future occurrence uses current definition and timezone',
            futureGeneration
              .createdCount ===
              1 &&
              !!futureOccurrence &&
              futureOccurrence.title ===
                'TASK-07 Edited' &&
              futureOccurrence.valueSek ===
                99 &&
              futureOccurrence.timezone ===
                'America/New_York',
            futureOccurrence
              ? `${futureOccurrence.title} / ${futureOccurrence.valueSek} / ${futureOccurrence.timezone}`
              : 'Occurrence missing',
          ),
        );

        /*
         * Exact availability boundary.
         */
        const availabilityResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            futureOccurrence!._id,
            futureOccurrence!
              .availabilityStartsAt,
          );

        const availableOccurrence =
          await ctx.db.get(
            futureOccurrence!._id,
          );

        results.push(
          result(
            'Scheduled occurrence becomes available at boundary',
            availabilityResult
              .changed ===
              true &&
              availableOccurrence
                ?.state ===
                'available',
            JSON.stringify(
              availabilityResult,
            ),
          ),
        );

        /*
         * Exact Claimable deadline
         * boundary.
         */
        const expiryResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            futureOccurrence!._id,
            futureOccurrence!
              .deadlineAt,
          );

        const expiredOccurrence =
          await ctx.db.get(
            futureOccurrence!._id,
          );

        results.push(
          result(
            'Unclaimed Claimable expires at deadline boundary',
            expiryResult
              .changed ===
              true &&
              expiredOccurrence
                ?.state ===
                'expired_unclaimed',
            JSON.stringify(
              expiryResult,
            ),
          ),
        );

        /*
         * Re-running the transition is
         * a terminal no-op.
         */
        const repeatedExpiry =
          await reconcileOccurrenceLifecycle(
            ctx,
            futureOccurrence!._id,
            futureOccurrence!
              .deadlineAt +
              1000,
          );

        results.push(
          result(
            'Lifecycle reconciliation is idempotent',
            repeatedExpiry
              .changed ===
              false &&
              repeatedExpiry
                .nextState ===
                'expired_unclaimed',
            JSON.stringify(
              repeatedExpiry,
            ),
          ),
        );

        await ctx.db.patch(
          definitionId,
          {
            archivedAt:
              now + 2,

            archivedByAuthUserId:
              'task07-smoke',

            updatedAt:
              now + 2,
          },
        );

        const archivedGeneration =
          await generateOccurrencesForWindow(
            ctx,
            householdId,
            '2030-01-05',
            '2030-01-05',
            {
              scheduleTransitions:
                false,
            },
          );

        const archivedOccurrence =
          await ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_definition_scheduled_date',
              (q) =>
                q
                  .eq(
                    'choreDefinitionId',
                    definitionId,
                  )
                  .eq(
                    'scheduledLocalDate',
                    '2030-01-05',
                  ),
            )
            .unique();

        results.push(
          result(
            'Archived definition stops future generation',
            archivedGeneration
              .createdCount ===
              0 &&
              archivedOccurrence ===
                null,
            JSON.stringify(
              archivedGeneration,
            ),
          ),
        );

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
          definitionId,
        );

        await ctx.db.delete(
          firstChildId,
        );

        await ctx.db.delete(
          secondChildId,
        );

        await ctx.db.delete(
          householdId,
        );

        const remainingOccurrences =
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

        results.push(
          result(
            'Test data cleanup',
            remainingOccurrences
              .length === 0,
            `${remainingOccurrences.length} occurrence(s) remain`,
          ),
        );

        return results;
      },
  });
