import {
  v,
} from 'convex/values';

import {
  query,
} from './_generated/server';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import schema from './schema';
export const listForHousehold =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      v.array(
        schema.doc(
          'choreOccurrences',
        ),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
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
                args.householdId,
              ),
          )
          .collect();

      return occurrences.sort(
        (
          left,
          right,
        ) =>
          left.availabilityStartsAt -
          right.availabilityStartsAt,
      );
    },
  });
