import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import {
  findSubmittedClaimForSubmission,
} from '../claims/submittedClaim';

export async function approveClaimableSubmission(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  reviewedByAuthUserId:
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
      'TASK-12 only supports initial Claimable Chore submissions.',
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
    'claimable'
  ) {
    throw new ConvexError(
      'Only Claimable Chores can be approved through this flow.',
    );
  }

  if (
    occurrence.state !==
    'submitted'
  ) {
    throw new ConvexError(
      'This Claimable Chore is not awaiting review.',
    );
  }

  /*
   * D-04:
   *
   * Review time may be after deadline.
   * The persisted authoritative
   * submittedAt timestamp determines
   * whether the Child was on time.
   */
  if (
    submission.submittedAt >
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'Late Claimable Chore submissions cannot be approved.',
    );
  }

  const claim =
    await findSubmittedClaimForSubmission(
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
      'This submission has already been reviewed.',
    );
  }

  const existingEarnings =
    await ctx.db
      .query(
        'ledgerEntries',
      )
      .withIndex(
        'by_occurrence_kind',
        (q) =>
          q
            .eq(
              'occurrenceId',
              occurrence._id,
            )
            .eq(
              'kind',
              'earning',
            ),
      )
      .collect();

  if (
    existingEarnings.length >
    0
  ) {
    throw new ConvexError(
      'This Chore Occurrence already has an earning.',
    );
  }

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
          'approved',

        reviewedByAuthUserId,

        reviewedAt:
          now,
      },
    );

  /*
   * Approval — not submission — creates
   * the financial effect.
   *
   * Value comes from the immutable
   * Chore Occurrence snapshot.
   */
  const ledgerEntryId =
    await ctx.db.insert(
      'ledgerEntries',
      {
        householdId:
          occurrence.householdId,

        childId:
          submission.childId,

        occurrenceId:
          occurrence._id,

        reviewId,

        kind:
          'earning',

        amountSek:
          occurrence.valueSek,

        createdAt:
          now,
      },
    );

  /*
   * Approval is terminal for both the
   * Claimable occurrence and ownership.
   *
   * Changing the Claim from submitted to
   * approved releases the Child's
   * one-active-Claim slot.
   */
  await ctx.db.patch(
    claim._id,
    {
      state:
        'approved',
    },
  );

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'approved',
    },
  );

  return {
    reviewId,

    ledgerEntryId,

    submissionId:
      submission._id,

    claimId:
      claim._id,

    occurrenceId:
      occurrence._id,

    childId:
      submission.childId,

    amountSek:
      occurrence.valueSek,

    reviewedAt:
      now,

    state:
      'approved' as const,
  };
}
