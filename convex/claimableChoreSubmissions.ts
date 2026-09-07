import {
  v,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/childAuthorization';
import { submitClaimableClaim } from './lib/claimableChoreExecution';

export const submit =
  mutation({
    args: {
      claimId:
        v.id(
          'choreClaims',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await submitClaimableClaim(
        ctx,
        household._id,
        child._id,
        args.claimId,
      );
    },
  });
