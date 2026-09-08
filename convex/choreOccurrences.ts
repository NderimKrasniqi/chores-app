import {
  v,
} from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import {
  generateOccurrencesForWindow,
} from './lib/occurrences/generation';

export const generateForWindow =
  mutation({
    args: {
      householdId:
        v.id(
          'households',
        ),

      fromLocalDate:
        v.string(),

      throughLocalDate:
        v.string(),
    },

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      return await generateOccurrencesForWindow(
        ctx,
        args.householdId,
        args.fromLocalDate,
        args.throughLocalDate,
      );
    },
  });

export const listForHousehold =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

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
