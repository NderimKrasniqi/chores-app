import {
  v,
} from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import {
  approveClaimableSubmission,
} from './lib/reviews/claimable';
import {
  listPendingClaimableReviews,
} from './lib/reviews/pendingClaimable';
import {
  rejectInitialSubmission,
} from './lib/reviews/initialRejection';
import { requireCurrentParentForHousehold } from './lib/auth/parentAuthorization';
import {
  approveRedoSubmission,
  rejectRedoSubmission,
} from './lib/reviews/redo';
import {
  scheduleRedoDeadlineFailure,
} from './lib/redos/deadlineFailure';
import {
  notifyChildOfApproval,
  notifyChildRedoRequired,
} from './lib/notifications/orchestration';
import {
  claimableApprovalResultValidator,
  initialRejectionResultValidator,
  pendingClaimableReviewsValidator,
  redoApprovalResultValidator,
  redoRejectionResultValidator,
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
      pendingClaimableReviewsValidator,

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

    returns:
      claimableApprovalResultValidator,

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

      const result =
        await approveClaimableSubmission(
          ctx,
          submission._id,
          authUser._id,
        );

      await notifyChildOfApproval(
        ctx,
        result.reviewId,
      );

      return result;
    },
  });

export const reject =
  mutation({
    args: {
      submissionId:
        v.id(
          'choreSubmissions',
        ),

      redoDeadlineLocalDate:
        v.string(),

      redoDeadlineLocalTime:
        v.string(),
    },

    returns:
      initialRejectionResultValidator,

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

      const result =
        await rejectInitialSubmission(
          ctx,
          submission._id,
          authUser._id,
          'claimable',
          args.redoDeadlineLocalDate,
          args.redoDeadlineLocalTime,
        );

      await scheduleRedoDeadlineFailure(
        ctx,
        result.redoId,
        result.redoDeadlineAt,
      );

      await notifyChildRedoRequired(
        ctx,
        result.redoId,
      );

      return result;
    },
  });

export const approveRedo =
  mutation({
    args: {
      submissionId:
        v.id(
          'choreSubmissions',
        ),
    },

    returns:
      redoApprovalResultValidator,

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

      const result =
        await approveRedoSubmission(
          ctx,
          submission._id,
          authUser._id,
          'claimable',
        );

      await notifyChildOfApproval(
        ctx,
        result.reviewId,
      );

      return result;
    },
  });

export const rejectRedo =
  mutation({
    args: {
      submissionId:
        v.id(
          'choreSubmissions',
        ),
    },

    returns:
      redoRejectionResultValidator,

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

      return await rejectRedoSubmission(
        ctx,
        submission._id,
        authUser._id,
        'claimable',
      );
    },
  });
