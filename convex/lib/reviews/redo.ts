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
  insertFinancialLedgerEntry,
} from '../finance/financialProjection';
import {
  ensureClaimableFailurePenalty,
} from '../finance/failurePenalty';

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

async function loadRedoReviewContext(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  expectedKind:
    ChoreKind,
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
    2
  ) {
    throw new ConvexError(
      'Only a Redo Submission can be reviewed through this flow.',
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
      `This Redo review flow only accepts ${expectedKind} Chores.`,
    );
  }

  if (
    occurrence.state !==
    'submitted'
  ) {
    throw new ConvexError(
      'This Redo is not awaiting Parent review.',
    );
  }

  const redo =
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

  if (!redo) {
    throw new ConvexError(
      'Redo opportunity not found.',
    );
  }

  if (
    redo.householdId !==
    occurrence.householdId
  ) {
    throw new ConvexError(
      'Redo Household does not match its Chore Occurrence.',
    );
  }

  /*
   * Parent review may occur after the
   * Redo deadline.
   *
   * Persisted server-authoritative
   * submittedAt decides whether attempt 2
   * was on time.
   */
  if (
    submission.submittedAt >
    redo.deadlineAt
  ) {
    throw new ConvexError(
      'Late Redo Submissions cannot be reviewed.',
    );
  }

  const initialSubmission =
    await ctx.db.get(
      redo.initialSubmissionId,
    );

  if (
    !initialSubmission ||
    initialSubmission.occurrenceId !==
      occurrence._id ||
    initialSubmission.householdId !==
      occurrence.householdId ||
    initialSubmission.childId !==
      submission.childId ||
    initialSubmission.attemptNumber !==
      1
  ) {
    throw new ConvexError(
      'Redo initial Submission history is invalid.',
    );
  }

  const rejectionReview =
    await ctx.db.get(
      redo.rejectionReviewId,
    );

  if (
    !rejectionReview ||
    rejectionReview.householdId !==
      occurrence.householdId ||
    rejectionReview.occurrenceId !==
      occurrence._id ||
    rejectionReview.submissionId !==
      initialSubmission._id ||
    rejectionReview.decision !==
      'rejected'
  ) {
    throw new ConvexError(
      'Redo rejection Review history is invalid.',
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
      'This Submission has already been reviewed.',
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

  return {
    submission,
    occurrence,
    redo,
    claim,
  };
}

export async function approveRedoSubmission(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  reviewedByAuthUserId:
    string,
  expectedKind:
    ChoreKind,
  now = Date.now(),
) {
  const {
    submission,
    occurrence,
    redo,
    claim,
  } =
    await loadRedoReviewContext(
      ctx,
      submissionId,
      expectedKind,
    );

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

  const ledgerEntryId =
    await insertFinancialLedgerEntry(
      ctx,
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

  if (claim) {
    await ctx.db.patch(
      claim._id,
      {
        state:
          'approved',
      },
    );
  }

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

    redoId:
      redo._id,

    submissionId:
      submission._id,

    claimId:
      claim?._id,

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

export async function rejectRedoSubmission(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  reviewedByAuthUserId:
    string,
  expectedKind:
    ChoreKind,
  now = Date.now(),
) {
  const {
    submission,
    occurrence,
    redo,
    claim,
  } =
    await loadRedoReviewContext(
      ctx,
      submissionId,
      expectedKind,
    );

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

  /*
   * A rejected attempt 2 is terminal.
   *
   * Personal:
   * failed, earns 0, no penalty.
   *
   * Claimable:
   * failed and incurs the immutable
   * full-value TASK-14 penalty.
   *
   * Review, terminal lifecycle, and money
   * all happen in this same mutation.
   */
  if (claim) {
    await ctx.db.patch(
      claim._id,
      {
        state:
          'failed',
      },
    );
  }

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'failed',
    },
  );

  if (claim) {
    await ensureClaimableFailurePenalty(
      ctx,
      claim._id,
      now,
    );
  }

  return {
    reviewId,

    redoId:
      redo._id,

    submissionId:
      submission._id,

    claimId:
      claim?._id,

    occurrenceId:
      occurrence._id,

    childId:
      submission.childId,

    reviewedAt:
      now,

    state:
      'failed' as const,
  };
}
