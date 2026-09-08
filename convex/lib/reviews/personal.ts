import { ConvexError } from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

export async function listPendingPersonalReviews(
  ctx:
    | MutationCtx
    | QueryCtx,
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
    const occurrence =
      await ctx.db.get(
        submission.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.householdId !==
        householdId ||
      occurrence.kind !==
        'personal' ||
      occurrence.state !==
        'submitted'
    ) {
      continue;
    }

    const review =
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

    if (review) {
      continue;
    }

    const child =
      await ctx.db.get(
        submission.childId,
      );

    if (!child) {
      throw new ConvexError(
        'Submission Child profile no longer exists.',
      );
    }

    pending.push({
      submissionId:
        submission._id,

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

      isUnlockChore:
        occurrence
          .isUnlockChore,
    });
  }

  return pending.sort(
    (left, right) =>
      left.submittedAt -
      right.submittedAt,
  );
}

export async function approvePersonalSubmission(
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
    occurrence.kind !==
    'personal'
  ) {
    throw new ConvexError(
      'Only Personal Chores can be approved through this flow.',
    );
  }

  if (
    occurrence.state !==
    'submitted'
  ) {
    throw new ConvexError(
      'This Personal Chore is not awaiting review.',
    );
  }

  if (
    !occurrence.personalChildId ||
    occurrence.personalChildId !==
      submission.childId
  ) {
    throw new ConvexError(
      'Submission Child does not match the Personal Chore assignment.',
    );
  }

  if (
    submission.attemptNumber !==
    1
  ) {
    throw new ConvexError(
      'TASK-08 only supports initial Personal Chore submissions.',
    );
  }

  /*
   * Review delay must never turn an
   * on-time submission into a miss.
   *
   * We compare the persisted server
   * submission timestamp, not review
   * time.
   */
  if (
    submission.submittedAt >
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'Late Personal Chore submissions cannot be approved.',
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
