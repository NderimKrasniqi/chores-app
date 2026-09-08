import {
  internalMutation,
} from '../../_generated/server';
import {
  maintainPayoutPeriods,
} from '../../lib/finance/payoutPeriods';

export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      return await maintainPayoutPeriods(
        ctx,
      );
    },
  });
