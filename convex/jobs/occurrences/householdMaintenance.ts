import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  runOccurrenceMaintenance,
} from '../../lib/occurrences/maintenance';

/*
 * One Household per transaction.
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
      await runOccurrenceMaintenance(
        ctx,
        {
          householdIds: [
            args.householdId,
          ],
        },
      );

      return null;
    },
  });
