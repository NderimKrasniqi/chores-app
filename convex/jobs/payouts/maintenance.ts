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
  'payout_households';

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
            .jobs.payouts
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
