import {
  ConvexError,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import {
  runOccurrenceMaintenance,
} from './lib/choreOccurrenceMaintenance';

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

        /*
         * Synthetic future clock used by
         * the scoped maintenance run.
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

        const results:
          SmokeTestResult[] =
          [];

        /*
         * Household A is the only
         * Household maintenance is
         * explicitly allowed to touch.
         */
        const scopedHouseholdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-07 Scoped Maintenance',

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

        /*
         * Household B simulates unrelated
         * real development/application
         * data.
         */
        const victimHouseholdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-07 Isolation Victim',

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

        const victimChildId =
          await ctx.db.insert(
            'children',
            {
              householdId:
                victimHouseholdId,

              displayName:
                'Isolation Victim Child',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        const victimDefinitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId:
                victimHouseholdId,

              kind:
                'personal',

              title:
                'Victim Future Chore',

              valueSek:
                10,

              recurrence: {
                kind:
                  'one_off',

                scheduledDate:
                  '2026-09-08',
              },

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              personalChildId:
                victimChildId,

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task07-isolation-smoke',

              createdAt:
                testNow,

              updatedAt:
                testNow,
            },
          );

        /*
         * This occurrence looks massively
         * overdue relative to the synthetic
         * 2030 clock.
         *
         * A buggy global reconciliation
         * would turn it from scheduled into
         * missed even though maintenance is
         * scoped to another Household.
         */
        const victimOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId:
                victimHouseholdId,

              choreDefinitionId:
                victimDefinitionId,

              kind:
                'personal',

              title:
                'Victim Future Chore',

              valueSek:
                10,

              scheduledLocalDate:
                '2026-09-08',

              timezone:
                'UTC',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                Date.UTC(
                  2026,
                  8,
                  8,
                  0,
                  0,
                  0,
                  0,
                ),

              deadlineAt:
                Date.UTC(
                  2026,
                  8,
                  8,
                  18,
                  0,
                  0,
                  0,
                ),

              personalChildId:
                victimChildId,

              isUnlockChore:
                false,

              state:
                'scheduled',

              createdAt:
                testNow,
            },
          );

        /*
         * Run maintenance ONLY for
         * Household A using the synthetic
         * future clock.
         */
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
                scopedHouseholdId,
              ],
            },
          );

        results.push(
          result(
            'Scoped maintenance processes only requested Household',
            maintenance
              .householdCount ===
              1,
            JSON.stringify(
              maintenance,
            ),
          ),
        );

        const victimAfter =
          await ctx.db.get(
            victimOccurrenceId,
          );

        results.push(
          result(
            'Scoped maintenance cannot mutate another Household occurrence',
            victimAfter
              ?.state ===
              'scheduled',
            victimAfter
              ?.state,
          ),
        );

        /*
         * Cleanup.
         */
        await ctx.db.delete(
          victimOccurrenceId,
        );

        await ctx.db.delete(
          victimDefinitionId,
        );

        await ctx.db.delete(
          victimChildId,
        );

        await ctx.db.delete(
          victimHouseholdId,
        );

        /*
         * A scoped Household with no
         * definitions creates no occurrence
         * data, so it is safe to delete
         * directly.
         */
        await ctx.db.delete(
          scopedHouseholdId,
        );

        results.push(
          result(
            'Isolation smoke test cleanup',
            true,
          ),
        );

        return results;
      },
  });
