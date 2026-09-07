import {
  v,
} from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import {
  approveClaimableSubmission,
  listPendingClaimableReviews,
} from './lib/claimableChoreReview';
import { requireCurrentParentForHousehold } from './lib/parentAuthorization';

export const listPending =
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

      return await listPendingClaimableReviews(
        ctx,
        args.householdId,
      );
    },
  });

export const approve =
  mutation({
    args: {
      submissionId:
        v.id(
          'choreSubmissions',
        ),
    },

    handler: async (
      ctx,
      args,
    ) => {
      const submission =
        await ctx.db.get(
          args.submissionId,
        );

      if (!submission) {
        throw new Error(
          'Submission not found.',
        );
      }

      const {
        authUser,
      } =
        await requireCurrentParentForHousehold(
          ctx,
          submission.householdId,
        );

      return await approveClaimableSubmission(
        ctx,
        submission._id,
        authUser._id,
      );
    },
  });
