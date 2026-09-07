import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';
import {
  resolveRedoDeadline,
} from './redoDeadline';

type ChoreKind =
  | 'personal'
  | 'claimable';

async function findSubmittedClaim(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  childId:
    Id<'children'>,
) {
  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_occurrence',
        (q) =>
          q.eq(
            'occurrenceId',
            occurrenceId,
          ),
      )
      .collect();

  return (
    claims.find(
      (claim) =>
        claim.childId ===
          childId &&
        claim.state ===
          'submitted',
    ) ??
    null
  );
}

export async function rejectInitialSubmission(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  reviewedByAuthUserId:
    string,
  expectedKind:
    ChoreKind,
  redoDeadlineLocalDate:
    string,
  redoDeadlineLocalTime:
    string,
  now = Date.now(),
) {
  const submission =
    await ctx.db.get(
      submissionId,
    );

  if (!submission) {
    throw new ConvexError(
      'Submission not found.',
    );
  }

  if (
    submission.attemptNumber !==
    1
  ) {
    throw new ConvexError(
      'Only an initial Submission can create a Redo.',
    );
  }

  const occurrence =
    await ctx.db.get(
      submission.occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Chore occurrence not found.',
    );
  }

  if (
    occurrence.householdId !==
    submission.householdId
  ) {
    throw new ConvexError(
      'Submission Household does not match its Chore Occurrence.',
    );
  }

  if (
    occurrence.kind !==
    expectedKind
  ) {
    throw new ConvexError(
      `This review flow only accepts ${expectedKind} Chores.`,
    );
  }

  if (
    occurrence.state !==
    'submitted'
  ) {
    throw new ConvexError(
      'This Chore is not awaiting initial review.',
    );
  }

  /*
   * D-04:
   *
   * Parent review time is irrelevant to
   * initial deadline compliance.
   *
   * Only the authoritative persisted
   * submission timestamp determines
   * whether attempt 1 was on time.
   */
  if (
    submission.submittedAt >
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'A late initial Submission cannot receive a Redo.',
    );
  }

  let claim:
    Awaited<
      ReturnType<
        typeof findSubmittedClaim
      >
    > =
    null;

  if (
    occurrence.kind ===
    'personal'
  ) {
    if (
      !occurrence.personalChildId ||
      occurrence.personalChildId !==
        submission.childId
    ) {
      throw new ConvexError(
        'Submission Child does not match the Personal Chore assignment.',
      );
    }
  } else {
    claim =
      await findSubmittedClaim(
        ctx,
        occurrence._id,
        submission.childId,
      );

    if (!claim) {
      throw new ConvexError(
        'Submitted Claim ownership could not be verified.',
      );
    }

    if (
      claim.householdId !==
      occurrence.householdId
    ) {
      throw new ConvexError(
        'Claim Household does not match its Chore Occurrence.',
      );
    }
  }

  const existingReview =
    await ctx.db
      .query(
        'choreReviews',
      )
      .withIndex(
        'by_submission',
        (q) =>
          q.eq(
            'submissionId',
            submission._id,
          ),
      )
      .unique();

  if (existingReview) {
    throw new ConvexError(
      'This Submission has already been reviewed.',
    );
  }

  const existingRedo =
    await ctx.db
      .query(
        'choreRedos',
      )
      .withIndex(
        'by_occurrence',
        (q) =>
          q.eq(
            'occurrenceId',
            occurrence._id,
          ),
      )
      .unique();

  if (existingRedo) {
    throw new ConvexError(
      'This Chore Occurrence already has its Redo opportunity.',
    );
  }

  /*
   * Resolve and validate the new deadline
   * before any durable writes.
   *
   * The Chore Occurrence timezone is the
   * immutable schedule authority.
   */
  const redoDeadline =
    resolveRedoDeadline({
      deadlineLocalDate:
        redoDeadlineLocalDate,

      deadlineLocalTime:
        redoDeadlineLocalTime,

      timezone:
        occurrence.timezone,

      reviewedAt:
        now,
    });

  const reviewId =
    await ctx.db.insert(
      'choreReviews',
      {
        householdId:
          occurrence.householdId,

        occurrenceId:
          occurrence._id,

        submissionId:
          submission._id,

        decision:
          'rejected',

        reviewedByAuthUserId,

        reviewedAt:
          now,
      },
    );

  const redoId =
    await ctx.db.insert(
      'choreRedos',
      {
        householdId:
          occurrence.householdId,

        occurrenceId:
          occurrence._id,

        initialSubmissionId:
          submission._id,

        rejectionReviewId:
          reviewId,

        deadlineLocalDate:
          redoDeadline
            .deadlineLocalDate,

        deadlineLocalTime:
          redoDeadline
            .deadlineLocalTime,

        deadlineAt:
          redoDeadline
            .deadlineAt,

        createdAt:
          now,
      },
    );

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'redo_required',
    },
  );

  /*
   * Claimable rejection does not release
   * active ownership.
   *
   * The same Claim remains unresolved
   * through its single Redo opportunity.
   */
  if (claim) {
    await ctx.db.patch(
      claim._id,
      {
        state:
          'redo_required',
      },
    );
  }

  return {
    reviewId,

    redoId,

    occurrenceId:
      occurrence._id,

    submissionId:
      submission._id,

    claimId:
      claim?._id,

    childId:
      submission.childId,

    redoDeadlineAt:
      redoDeadline
        .deadlineAt,

    state:
      'redo_required' as const,
  };
}
