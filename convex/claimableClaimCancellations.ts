import { v } from 'convex/values';

import { mutation } from './_generated/server';
import { requireCurrentParentForHousehold } from './lib/auth/parentAuthorization';
import { cancelClaimableClaimForParent } from './lib/claims/cancellation';

export const cancelForParent = mutation({
  args: {
    householdId: v.id('households'),

    claimId: v.id('choreClaims'),
  },

  returns:
    v.object({
      claimId:
        v.id(
          'choreClaims',
        ),

      occurrenceId:
        v.id(
          'choreOccurrences',
        ),

      childId:
        v.id(
          'children',
        ),

      state:
        v.literal(
          'cancelled',
        ),

      cancelledAt:
        v.number(),

      cancelledByAuthUserId:
        v.string(),
    }),

  handler: async (ctx, args) => {
    /*
     * Equal Parent authority is checked
     * from authenticated server state.
     */
    const { authUser } = await requireCurrentParentForHousehold(
      ctx,
      args.householdId,
    );

    return await cancelClaimableClaimForParent(
      ctx,
      args.householdId,
      args.claimId,
      authUser._id,
    );
  },
});
