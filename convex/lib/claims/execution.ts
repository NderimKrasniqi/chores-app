import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

export async function submitClaimableClaim(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  claimId:
    Id<'choreClaims'>,
  now = Date.now(),
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

  /*
   * TASK-12 initial submission starts only
   * from actively worked Claim ownership.
   *
   * submitted and redo_required remain
   * unresolved active Claim states, but
   * neither may create another attempt-1
   * submission.
   */
  if (
    claim.state !==
    'claimed'
  ) {
    throw new ConvexError(
      'Only an active unsubmitted Claim can be submitted.',
    );
  }

  const occurrence =
    await ctx.db.get(
      claim.occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Claimable Chore occurrence not found.',
    );
  }

  if (
    occurrence.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'This Claimable Chore does not belong to this Household.',
    );
  }

  if (
    occurrence.kind !==
    'claimable'
  ) {
    throw new ConvexError(
      'Only Claimable Chores can be submitted through this flow.',
    );
  }

  /*
   * Claim ownership is stored separately
   * from occurrence state, so a worked
   * Claimable occurrence remains available
   * until submission.
   */
  if (
    occurrence.state !==
    'available'
  ) {
    throw new ConvexError(
      'This Claimable Chore is not available for submission.',
    );
  }

  /*
   * D-04:
   *
   * submission AT deadlineAt remains valid.
   * Only a timestamp strictly later than
   * the immutable occurrence deadline is
   * rejected.
   */
  if (
    now >
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'The Claimable Chore deadline has passed.',
    );
  }

  const existingSubmission =
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

  if (existingSubmission) {
    throw new ConvexError(
      'This Claimable Chore has already been submitted.',
    );
  }

  const submissionId =
    await ctx.db.insert(
      'choreSubmissions',
      {
        householdId,

        occurrenceId:
          occurrence._id,

        childId,

        attemptNumber:
          1,

        /*
         * Convex server time is
         * authoritative.
         */
        submittedAt:
          now,
      },
    );

  /*
   * Submission keeps the commitment
   * unresolved.
   *
   * Both durable records move together so
   * active-Claim queries continue to
   * occupy the Child's single Claim slot
   * while Parent review is pending.
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

    claimId:
      claim._id,

    occurrenceId:
      occurrence._id,

    childId,

    submittedAt:
      now,

    attemptNumber:
      1 as const,

    state:
      'submitted' as const,
  };
}
