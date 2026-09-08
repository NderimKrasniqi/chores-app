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
import {
  findSubmittedClaimForSubmission,
} from '../claims/submittedClaim';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

export async function listPendingClaimableReviews(
  ctx: DatabaseCtx,
  householdId:
    Id<'households'>,
) {
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
              'claimable',
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

    if (
      !submission ||
      submission.submittedAt >
        occurrence.deadlineAt
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
