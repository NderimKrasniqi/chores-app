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

export async function listPendingPersonalReviews(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
) {
  /*
   * Operational queue only:
   * start from currently submitted
   * Personal occurrences rather than
   * lifetime Submission history.
   */
  const occurrences =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_household_kind_state_deadline',
        (q) =>
          q
            .eq(
              'householdId',
              householdId,
            )
            .eq(
              'kind',
              'personal',
            )
            .eq(
              'state',
              'submitted',
            ),
      )
      .collect();

  const pending = [];

  for (
    const occurrence of
    occurrences
  ) {
    const submission =
      await ctx.db
        .query(
          'choreSubmissions',
        )
        .withIndex(
          'by_occurrence_attempt',
          (q) =>
            q
              .eq(
                'occurrenceId',
                occurrence._id,
              )
              .eq(
                'attemptNumber',
                1,
              ),
        )
        .unique();

    if (!submission) {
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

      hasEvidence:
        submission
          .evidenceStorageId !==
        undefined,
    });
  }

  return pending.sort(
    (
      left,
      right,
    ) =>
      left.submittedAt -
      right.submittedAt,
  );
}
