import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  closePayoutPeriod,
} from '../../lib/finance/payoutPeriods';

export const reconcile =
  internalMutation({
    args: {
      payoutPeriodId:
        v.id(
          'payoutPeriods',
        ),
    },

    returns:
      v.object({
        status:
          v.union(
            v.literal(
              'not_due',
            ),
            v.literal(
              'closed',
            ),
          ),

        payoutPeriodId:
          v.id(
            'payoutPeriods',
          ),

        nextPayoutPeriodId:
          v.union(
            v.null(),
            v.id(
              'payoutPeriods',
            ),
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      return await closePayoutPeriod(
        ctx,
        args.payoutPeriodId,
      );
    },
  });
