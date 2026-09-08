import {
  v,
} from 'convex/values';

import {
  internal,
} from '../../_generated/api';
import {
  internalMutation,
} from '../../_generated/server';
import {
  getNextHouseholdMaintenanceBatch,
} from '../../lib/maintenance/householdDispatch';

const dispatchKey =
  'occurrence_households';

/*
 * Bounded dispatcher.
 *
 * The cron transaction only:
 *
 * - reads one small Household page;
 * - advances one cursor;
 * - schedules at most the configured batch
 *   size of independent Household jobs.
 */
export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        dispatchedCount:
          v.number(),

        completedCycle:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      const batch =
        await getNextHouseholdMaintenanceBatch(
          ctx,
          dispatchKey,
        );

      for (
        const householdId of
        batch.householdIds
      ) {
        await ctx.scheduler.runAfter(
          0,

          internal
            .jobs.occurrences
            .householdMaintenance
            .run,

          {
            householdId,
          },
        );
      }

      return {
        dispatchedCount:
          batch
            .householdIds
            .length,

        completedCycle:
          batch.completedCycle,
      };
    },
  });
