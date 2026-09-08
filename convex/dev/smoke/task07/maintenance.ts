import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  runOccurrenceMaintenance,
} from '../../../lib/choreOccurrenceMaintenance';

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

        /*
         * 2030-01-15 12:00 UTC =
         * 13:00 Europe/Stockholm.
         *
         * Household-local current
         * calendar date is therefore
         * 2030-01-15.
         */
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
                'TASK-07 Maintenance Smoke',

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

        const childId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-07 Maintenance Child',

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
                'claimable',

              title:
                'TASK-07 Maintenance Chore',

              valueSek: 25,

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

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task07-maintenance-smoke',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        /*
         * Horizon 2 means:
         *
         * Jan 15
         * Jan 16
         * Jan 17
         *
         * Smoke tests disable exact
         * durable scheduling.
         */
        const maintenance =
          await runOccurrenceMaintenance(
            ctx,
            {
              now:
                testNow,

              horizonDays:
                2,

              scheduleTransitions:
                false,

              householdIds: [
                householdId,
              ],
            },
          );

        results.push(
          result(
            'Rolling maintenance generates local-date horizon',
            maintenance
              .createdCount ===
              3,
            JSON.stringify(
              maintenance,
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

        const scheduledDates =
          occurrences
            .map(
              (occurrence) =>
                occurrence
                  .scheduledLocalDate,
            )
            .sort();

        results.push(
          result(
            'Maintenance uses Household-local calendar dates',
            scheduledDates.join(
              '|',
            ) ===
              [
                '2030-01-15',
                '2030-01-16',
                '2030-01-17',
              ].join('|'),
            JSON.stringify(
              scheduledDates,
            ),
          ),
        );

        /*
         * Force the Jan 16 occurrence
         * into an overdue Scheduled
         * state and verify the safety
         * net advances it.
         */
        const scheduledTarget =
          occurrences.find(
            (occurrence) =>
              occurrence
                .scheduledLocalDate ===
              '2030-01-16',
          );

        if (!scheduledTarget) {
          throw new ConvexError(
            'Scheduled smoke occurrence was not generated.',
          );
        }

        await ctx.db.patch(
          scheduledTarget._id,
          {
            state:
              'scheduled',

            availabilityStartsAt:
              testNow - 1000,

            deadlineAt:
              testNow +
              60 * 60 * 1000,
          },
        );

        /*
         * Force Jan 17 into overdue
         * available Claimable state.
         */
        const expiryTarget =
          occurrences.find(
            (occurrence) =>
              occurrence
                .scheduledLocalDate ===
              '2030-01-17',
          );

        if (!expiryTarget) {
          throw new ConvexError(
            'Expiry smoke occurrence was not generated.',
          );
        }

        await ctx.db.patch(
          expiryTarget._id,
          {
            state:
              'available',

            availabilityStartsAt:
              testNow -
              2 * 60 * 60 * 1000,

            deadlineAt:
              testNow - 1000,
          },
        );

        const reconciliation =
          await runOccurrenceMaintenance(
            ctx,
            {
              now:
                testNow,

              horizonDays:
                2,

              scheduleTransitions:
                false,

              householdIds: [
                householdId,
              ],
            },
          );

        const reconciledScheduled =
          await ctx.db.get(
            scheduledTarget._id,
          );

        const reconciledExpiry =
          await ctx.db.get(
            expiryTarget._id,
          );

        results.push(
          result(
            'Safety net reconciles due availability',
            reconciledScheduled
              ?.state ===
              'available' &&
              reconciliation
                .scheduledReconciledCount >=
                1,
            reconciledScheduled
              ?.state,
          ),
        );

        results.push(
          result(
            'Safety net reconciles unclaimed deadline expiry',
            reconciledExpiry
              ?.state ===
              'expired_unclaimed' &&
              reconciliation
                .claimableDeadlineReconciledCount >=
                1,
            reconciledExpiry
              ?.state,
          ),
        );

        /*
         * A third run should create no
         * duplicate occurrences.
         */
        const repeated =
          await runOccurrenceMaintenance(
            ctx,
            {
              now:
                testNow,

              horizonDays:
                2,

              scheduleTransitions:
                false,

              householdIds: [
                householdId,
              ],
            },
          );

        results.push(
          result(
            'Repeated maintenance is idempotent',
            repeated.createdCount ===
              0 &&
              repeated
                .skippedExistingCount ===
                3,
            JSON.stringify(
              repeated,
            ),
          ),
        );

        /*
         * Cleanup.
         */
        const cleanupOccurrences =
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
          cleanupOccurrences
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

        const remaining =
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
            'Maintenance test data cleanup',
            remaining.length ===
              0,
            `${remaining.length} occurrence(s) remain`,
          ),
        );

        return results;
      },
  });
