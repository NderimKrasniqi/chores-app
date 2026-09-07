import {
  v,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import { cancelClaimableClaimForParent } from './lib/claimableChoreCancellation';
import { requireCurrentParentForHousehold } from './lib/parentAuthorization';

export const cancelForParent =
  mutation({
    args: {
      householdId:
        v.id(
          'households',
        ),

      claimId:
        v.id(
          'choreClaims',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      /*
       * Equal Parent authority is checked
       * from authenticated server state.
       */
      const {
        authUser,
      } =
        await requireCurrentParentForHousehold(
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
