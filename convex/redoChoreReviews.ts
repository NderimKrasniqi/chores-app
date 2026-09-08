import {
  v,
} from 'convex/values';

import {
  query,
} from './_generated/server';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import {
  listPendingRedoReviews,
} from './lib/reviews/pendingRedo';
import {
  pendingRedoReviewsValidator,
} from './lib/api/choreContracts';

export const listPending =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      pendingRedoReviewsValidator,

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      return await listPendingRedoReviews(
        ctx,
        args.householdId,
      );
    },
  });
