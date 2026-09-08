import type {
  Id,
} from '../../_generated/dataModel';
import type {
  QueryCtx,
} from '../../_generated/server';
import {
  findSubmittedClaimForSubmission,
} from '../claims/submittedClaim';

export type PendingRedoReview = {
  submissionId:
    Id<'choreSubmissions'>;

  occurrenceId:
    Id<'choreOccurrences'>;

  childId:
    Id<'children'>;

  kind:
    'personal' |
    'claimable';

  childDisplayName:
    string;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  submittedAt:
    number;

  redoDeadlineAt:
    number;

  timezone:
    string;

  isUnlockChore:
    boolean;

  hasEvidence:
    boolean;
};

export async function listPendingRedoReviews(
  ctx: QueryCtx,
  householdId:
    Id<'households'>,
) {
  const occurrences =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_household_state_availability',
        (q) =>
          q
            .eq(
              'householdId',
              householdId,
            )
            .eq(
              'state',
              'submitted',
            ),
      )
      .collect();

  const pending:
    PendingRedoReview[] =
    [];

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
                2,
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

    if (
      !redo ||
      submission.submittedAt >
        redo.deadlineAt
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
      continue;
    }

    if (
      occurrence.kind ===
      'claimable'
    ) {
      const claim =
        await findSubmittedClaimForSubmission(
          ctx,
          occurrence._id,
          child._id,
        );

      if (!claim) {
        continue;
      }
    }

    pending.push({
      submissionId:
        submission._id,

      occurrenceId:
        occurrence._id,

      childId:
        child._id,

      kind:
        occurrence.kind,

      childDisplayName:
        child.displayName,

      title:
        occurrence.title,

      description:
        occurrence.description,

      valueSek:
        occurrence.valueSek,

      submittedAt:
        submission.submittedAt,

      redoDeadlineAt:
        redo.deadlineAt,

      timezone:
        occurrence.timezone,

      isUnlockChore:
        occurrence.isUnlockChore,

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
