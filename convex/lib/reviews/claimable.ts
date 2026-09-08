import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

async function findSubmittedClaimForSubmission(
  ctx: DatabaseCtx,
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

export async function listPendingClaimableReviews(
  ctx: DatabaseCtx,
  householdId:
    Id<'households'>,
) {
  const submissions =
    await ctx.db
      .query(
        'choreSubmissions',
      )
      .withIndex(
        'by_household_submitted_at',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .collect();

  const pending = [];

  for (
    const submission of
    submissions
  ) {
    if (
      submission.attemptNumber !==
      1
    ) {
      continue;
    }

    const occurrence =
      await ctx.db.get(
        submission.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.householdId !==
        householdId ||
      occurrence.kind !==
        'claimable' ||
      occurrence.state !==
        'submitted'
    ) {
      continue;
    }

    /*
     * Only an on-time submission is
     * reviewable.
     *
     * Normal execution already prevents
     * late persistence; this remains a
     * defensive domain check.
     */
    if (
      submission.submittedAt >
      occurrence.deadlineAt
    ) {
      continue;
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
      continue;
    }

    const claim =
      await findSubmittedClaimForSubmission(
        ctx,
        occurrence._id,
        submission.childId,
      );

    if (
      !claim ||
      claim.householdId !==
        householdId
    ) {
      continue;
    }

    const child =
      await ctx.db.get(
        submission.childId,
      );

    if (
      !child ||
      child.householdId !==
        householdId
    ) {
      throw new ConvexError(
        'Submission Child profile no longer exists.',
      );
    }

    pending.push({
      submissionId:
        submission._id,

      claimId:
        claim._id,

      occurrenceId:
        occurrence._id,

      childId:
        child._id,

      childDisplayName:
        child.displayName,

      title:
        occurrence.title,

      description:
        occurrence.description,

      valueSek:
        occurrence.valueSek,

      scheduledLocalDate:
        occurrence
          .scheduledLocalDate,

      submittedAt:
        submission.submittedAt,

      deadlineAt:
        occurrence.deadlineAt,

      timezone:
        occurrence.timezone,
    });
  }

  return pending.sort(
    (left, right) =>
      left.submittedAt -
      right.submittedAt,
  );
}

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
