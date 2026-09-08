import { v } from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import {
  rejectInitialSubmission,
} from './lib/reviews/initialRejection';
import { requireCurrentParentForHousehold } from './lib/auth/parentAuthorization';
import {
  approvePersonalSubmission,
  listPendingPersonalReviews,
} from './lib/reviews/personal';
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

      return await listPendingPersonalReviews(
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

      const result =
        await approvePersonalSubmission(
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
          'personal',
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
          'personal',
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
        'personal',
      );
    },
  });
