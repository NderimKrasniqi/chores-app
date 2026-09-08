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
  consumeEvidenceUploadIntent,
} from '../evidence/submissionEvidence';

type ChoreKind =
  | 'personal'
  | 'claimable';

async function loadRedoForSubmission(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  childId:
    Id<'children'>,
  expectedKind:
    ChoreKind,
  now: number,
) {
  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Chore occurrence not found.',
    );
  }

  if (
    occurrence.kind !==
    expectedKind
  ) {
    throw new ConvexError(
      `This Redo flow only accepts ${expectedKind} Chores.`,
    );
  }

  if (
    occurrence.state !==
    'redo_required'
  ) {
    throw new ConvexError(
      'This Chore is not awaiting a Redo submission.',
    );
  }

  if (
    occurrence.kind ===
    'personal' &&
    occurrence.personalChildId !==
      childId
  ) {
    throw new ConvexError(
      'This Personal Chore is not assigned to this Child.',
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
   * Redo becomes available when the
   * Parent rejection creates it.
   */
  if (
    now <
    redo.createdAt
  ) {
    throw new ConvexError(
      'This Redo opportunity is not available yet.',
    );
  }

  /*
   * Submission AT the Redo deadline is
   * valid.
   *
   * The original occurrence deadline is
   * intentionally not consulted here.
   */
  if (
    now >
    redo.deadlineAt
  ) {
    throw new ConvexError(
      'The Redo deadline has passed.',
    );
  }

  /*
   * Validate the durable Redo chain.
   */
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
      childId ||
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

  const existingRedoSubmission =
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

  if (
    existingRedoSubmission
  ) {
    throw new ConvexError(
      'This Redo has already been submitted.',
    );
  }

  return {
    occurrence,
    redo,
  };
}

export async function submitPersonalRedo(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  childId:
    Id<'children'>,
  now = Date.now(),
  evidenceUploadIntentId?:
    Id<'submissionEvidenceUploads'>,
) {
  const {
    occurrence,
    redo,
  } =
    await loadRedoForSubmission(
      ctx,
      occurrenceId,
      childId,
      'personal',
      now,
    );

  const evidenceStorageId =
    await consumeEvidenceUploadIntent(
      ctx,
      evidenceUploadIntentId,
      {
        householdId:
          occurrence.householdId,

        childId,

        occurrenceId:
          occurrence._id,

        attemptNumber:
          2,
      },
      now,
    );

  const submissionId =
    await ctx.db.insert(
      'choreSubmissions',
      {
        householdId:
          occurrence.householdId,

        occurrenceId:
          occurrence._id,

        childId,

        attemptNumber:
          2,

        submittedAt:
          now,

        ...(evidenceStorageId !==
        undefined
          ? {
              evidenceStorageId,
            }
          : {}),
      },
    );

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'submitted',
    },
  );

  return {
    submissionId,

    redoId:
      redo._id,

    occurrenceId:
      occurrence._id,

    childId,

    submittedAt:
      now,

    attemptNumber:
      2 as const,

    state:
      'submitted' as const,
  };
}

export async function submitClaimableRedo(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  claimId:
    Id<'choreClaims'>,
  now = Date.now(),
  evidenceUploadIntentId?:
    Id<'submissionEvidenceUploads'>,
) {
  const claim =
    await ctx.db.get(
      claimId,
    );

  if (!claim) {
    throw new ConvexError(
      'Claim not found.',
    );
  }

  if (
    claim.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'This Claim does not belong to this Household.',
    );
  }

  if (
    claim.childId !==
    childId
  ) {
    throw new ConvexError(
      'This Claim belongs to another Child.',
    );
  }

  if (
    claim.state !==
    'redo_required'
  ) {
    throw new ConvexError(
      'This Claim is not awaiting a Redo submission.',
    );
  }

  const {
    occurrence,
    redo,
  } =
    await loadRedoForSubmission(
      ctx,
      claim.occurrenceId,
      childId,
      'claimable',
      now,
    );

  if (
    occurrence.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'This Claimable Chore does not belong to this Household.',
    );
  }

  const evidenceStorageId =
    await consumeEvidenceUploadIntent(
      ctx,
      evidenceUploadIntentId,
      {
        householdId,

        childId,

        occurrenceId:
          occurrence._id,

        attemptNumber:
          2,
      },
      now,
    );

  const submissionId =
    await ctx.db.insert(
      'choreSubmissions',
      {
        householdId,

        occurrenceId:
          occurrence._id,

        childId,

        attemptNumber:
          2,

        submittedAt:
          now,

        ...(evidenceStorageId !==
        undefined
          ? {
              evidenceStorageId,
            }
          : {}),
      },
    );

  /*
   * Redo submission remains unresolved.
   *
   * Claim ownership therefore moves back
   * to submitted rather than releasing
   * the Child's active slot.
   */
  await ctx.db.patch(
    claim._id,
    {
      state:
        'submitted',
    },
  );

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'submitted',
    },
  );

  return {
    submissionId,

    redoId:
      redo._id,

    claimId:
      claim._id,

    occurrenceId:
      occurrence._id,

    childId,

    submittedAt:
      now,

    attemptNumber:
      2 as const,

    state:
      'submitted' as const,
  };
}
