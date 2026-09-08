import {
  internalMutation,
} from '../../_generated/server';
import {
  runOccurrenceMaintenance,
} from '../../lib/occurrences/maintenance';

/*
 * Internal rolling generation and
 * reconciliation job.
 *
 * Clients cannot invoke this directly.
 */
export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      return await runOccurrenceMaintenance(
        ctx,
      );
    },
  });
