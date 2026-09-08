import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import { reconcileOccurrenceLifecycle } from '../../../lib/occurrences/lifecycle';
import { generateOccurrencesForWindow } from '../../../lib/occurrences/generation';
import { runOccurrenceMaintenance } from '../../../lib/occurrences/maintenance';

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

export const run =
  internalMutation({
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
                'TASK-08 Miss Smoke',

              timezone:
                'UTC',

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

        const childId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-08 Miss Child',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const definitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'personal',

              title:
                'TASK-08 Miss Chore',

              valueSek: 25,

              recurrence: {
                kind:
                  'one_off',

                scheduledDate:
                  '2030-01-14',
              },

              deadlineLocalTime:
                '10:00',

              deadlineDayOffset:
                0,

              personalChildId:
                childId,

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

        /*
         * 1. Generation of an already
         * overdue Personal occurrence
         * begins directly as missed.
         */
        const generation =
          await generateOccurrencesForWindow(
            ctx,
            householdId,
            '2030-01-14',
            '2030-01-14',
            {
              now:
                testNow,

              scheduleTransitions:
                false,
            },
          );

        const generatedOccurrence =
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
                    '2030-01-14',
                  ),
            )
            .unique();

        results.push(
          result(
            'Overdue generated Personal Chore starts missed',
            generation.createdCount ===
              1 &&
              generatedOccurrence
                ?.state ===
                'missed',
            generatedOccurrence
              ?.state,
          ),
        );

        /*
         * 2. A missed Personal Chore
         * creates no financial entry.
         */
        const generatedLedger =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_occurrence_kind',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    generatedOccurrence!._id,
                  )
                  .eq(
                    'kind',
                    'earning',
                  ),
            )
            .collect();

        results.push(
          result(
            'Missed Personal Chore creates no earning',
            generatedLedger.length ===
              0,
            `${generatedLedger.length} earning(s)`,
          ),
        );

        /*
         * Create explicit lifecycle
         * boundary cases.
         */
        const boundaryOccurrence =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Boundary Chore',

              valueSek: 25,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'UTC',

              deadlineLocalTime:
                '12:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                testNow -
                60 * 60 * 1000,

              deadlineAt:
                testNow,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                testNow,
            },
          );

        /*
         * 3. Exactly at the deadline
         * must remain submit-able.
         */
        const atDeadline =
          await reconcileOccurrenceLifecycle(
            ctx,
            boundaryOccurrence,
            testNow,
          );

        const boundaryAtDeadline =
          await ctx.db.get(
            boundaryOccurrence,
          );

        results.push(
          result(
            'Personal Chore is not missed exactly at deadline',
            atDeadline.changed ===
              false &&
              boundaryAtDeadline
                ?.state ===
                'available',
            boundaryAtDeadline
              ?.state,
          ),
        );

        /*
         * 4. One millisecond later it
         * becomes missed.
         */
        const afterDeadline =
          await reconcileOccurrenceLifecycle(
            ctx,
            boundaryOccurrence,
            testNow + 1,
          );

        const boundaryAfter =
          await ctx.db.get(
            boundaryOccurrence,
          );

        results.push(
          result(
            'Personal Chore becomes missed after deadline',
            afterDeadline.changed ===
              true &&
              boundaryAfter
                ?.state ===
                'missed',
            boundaryAfter
              ?.state,
          ),
        );

        /*
         * 5. A submitted occurrence is
         * protected from review delay.
         */
        const submittedOccurrence =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Submitted Chore',

              valueSek: 25,

              scheduledLocalDate:
                '2030-01-16',

              timezone:
                'UTC',

              deadlineLocalTime:
                '12:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                testNow -
                2 * 60 * 60 * 1000,

              deadlineAt:
                testNow -
                60 * 60 * 1000,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'submitted',

              createdAt:
                testNow,
            },
          );

        const submittedReconcile =
          await reconcileOccurrenceLifecycle(
            ctx,
            submittedOccurrence,
            testNow,
          );

        const submittedAfter =
          await ctx.db.get(
            submittedOccurrence,
          );

        results.push(
          result(
            'Submitted Personal Chore is protected from deadline miss',
            submittedReconcile
              .changed ===
              false &&
              submittedAfter
                ?.state ===
                'submitted',
            submittedAfter
              ?.state,
          ),
        );

        /*
         * 6. Maintenance safety net
         * catches an overdue available
         * Personal occurrence.
         */
        const maintenanceOccurrence =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Maintenance Miss Chore',

              valueSek: 25,

              scheduledLocalDate:
                '2030-01-17',

              timezone:
                'UTC',

              deadlineLocalTime:
                '11:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                testNow -
                2 * 60 * 60 * 1000,

              deadlineAt:
                testNow - 1,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                testNow,
            },
          );

        /*
         * Prevent the synthetic
         * definition from generating
         * additional occurrences during
         * maintenance.
         */
        await ctx.db.patch(
          definitionId,
          {
            archivedAt:
              testNow,

            archivedByAuthUserId:
              'task08-smoke',

            updatedAt:
              testNow,
          },
        );

        const maintenance =
          await runOccurrenceMaintenance(
            ctx,
            {
              now:
                testNow,

              horizonDays:
                0,

              scheduleTransitions:
                false,

              householdIds: [
                householdId,
              ],
            },
          );

        const maintenanceAfter =
          await ctx.db.get(
            maintenanceOccurrence,
          );

        results.push(
          result(
            'Maintenance reconciles overdue Personal Chore miss',
            maintenanceAfter
              ?.state ===
              'missed' &&
              maintenance
                .personalMissReconciledCount >=
                1,
            JSON.stringify(
              maintenance,
            ),
          ),
        );

        /*
         * 7. No penalty is created.
         */
        const allLedgerEntries =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_household_created_at',
              (q) =>
                q.eq(
                  'householdId',
                  householdId,
                ),
            )
            .collect();

        results.push(
          result(
            'Missed Personal Chores create no penalty or debt',
            allLedgerEntries
              .length === 0,
            `${allLedgerEntries.length} ledger entry(s)`,
          ),
        );

        /*
         * Cleanup.
         */
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
          childId,
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
