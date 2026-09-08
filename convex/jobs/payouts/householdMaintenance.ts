import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  maintainPayoutPeriodForHousehold,
} from '../../lib/finance/payoutPeriods';

/*
 * One Household's Payout Period lifecycle
 * per transaction.
 */
export const run =
  internalMutation({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      v.null(),

    handler: async (
      ctx,
      args,
    ) => {
      const household =
        await ctx.db.get(
          args.householdId,
        );

      if (!household) {
        return null;
      }

      await maintainPayoutPeriodForHousehold(
        ctx,
        household._id,
      );

      return null;
    },
  });
