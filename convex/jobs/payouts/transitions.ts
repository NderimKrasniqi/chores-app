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
