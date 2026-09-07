import {
  ConvexError,
} from 'convex/values';

import {
  internal,
} from '../_generated/api';
import type {
  Doc,
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';

export type ReconcileRedoDeadlineFailureResult = {
  found:
    boolean;

  changed:
    boolean;

  previousState?:
    Doc<'choreOccurrences'>['state'];

  nextState?:
    Doc<'choreOccurrences'>['state'];

  occurrenceId?:
    Id<'choreOccurrences'>;

  claimId?:
    Id<'choreClaims'>;
};

/*
 * Production Parent rejection schedules
 * one exact callback immediately after
 * the Redo deadline.
 *
 * Redo submission AT deadlineAt remains
 * valid, so failure begins at +1 ms.
 */
export async function scheduleRedoDeadlineFailure(
  ctx:
    MutationCtx,
  redoId:
    Id<'choreRedos'>,
  deadlineAt:
    number,
) {
  if (
    !Number.isFinite(
      deadlineAt,
    )
  ) {
    throw new ConvexError(
      'Redo deadline must be a finite timestamp.',
    );
  }

  await ctx.scheduler.runAt(
    deadlineAt + 1,

    internal
      .redoDeadlineTransitions
      .reconcile,

    {
      redoId,
    },
  );
}

/*
 * Resolve a Redo that reached its active
 * deadline without attempt 2.
 *
 * This function intentionally creates no
 * financial effect.
 *
 * TASK-14 later owns the Claimable
 * full-value failure penalty.
 */
export async function reconcileRedoDeadlineFailure(
  ctx:
    MutationCtx,
  redoId:
    Id<'choreRedos'>,
  now =
    Date.now(),
): Promise<ReconcileRedoDeadlineFailureResult> {
  const redo =
    await ctx.db.get(
      redoId,
    );

  /*
   * Scheduled callbacks may outlive
   * development/test cleanup.
   */
  if (!redo) {
    return {
      found:
        false,

      changed:
        false,
    };
  }

  const occurrence =
    await ctx.db.get(
      redo.occurrenceId,
    );

  if (!occurrence) {
    return {
      found:
        false,

      changed:
        false,
    };
  }

  const previousState =
    occurrence.state;

  /*
   * Parent cancellation, submission,
   * approval, or another terminal outcome
   * must make a later scheduled deadline
   * callback harmless.
   */
  if (
    previousState !==
    'redo_required'
  ) {
    return {
      found:
        true,

      changed:
        false,

      previousState,

      nextState:
        previousState,

      occurrenceId:
        occurrence._id,
    };
  }

  /*
   * Submission AT deadlineAt is valid.
   */
  if (
    now <=
    redo.deadlineAt
  ) {
    return {
      found:
        true,

      changed:
        false,

      previousState,

      nextState:
        previousState,

      occurrenceId:
        occurrence._id,
    };
  }

  /*
   * Defensive protection:
   *
   * Normal attempt-2 submission changes
   * occurrence state to submitted in the
   * same Convex transaction.
   *
   * If historical data somehow contains
   * attempt 2 while state still says
   * redo_required, never convert that work
   * into a missed Redo.
   */
  const attemptTwo =
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

  if (attemptTwo) {
    return {
      found:
        true,

      changed:
        false,

      previousState,

      nextState:
        previousState,

      occurrenceId:
        occurrence._id,
    };
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
    initialSubmission.attemptNumber !==
      1
  ) {
    throw new ConvexError(
      'Redo initial Submission history is invalid.',
    );
  }

  let claimId:
    Id<'choreClaims'> |
    undefined;

  if (
    occurrence.kind ===
    'claimable'
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
              occurrence._id,
            ),
        )
        .collect();

    const claim =
      claims.find(
        (candidate) =>
          candidate.childId ===
            initialSubmission
              .childId &&
          candidate.state ===
            'redo_required',
      );

    if (!claim) {
      throw new ConvexError(
        'Redo Claim ownership could not be verified.',
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

    claimId =
      claim._id;

    await ctx.db.patch(
      claim._id,
      {
        state:
          'failed',
      },
    );
  } else {
    if (
      occurrence.personalChildId !==
      initialSubmission.childId
    ) {
      throw new ConvexError(
        'Redo Child does not match the Personal Chore assignment.',
      );
    }
  }

  await ctx.db.patch(
    occurrence._id,
    {
      state:
        'failed',
    },
  );

  return {
    found:
      true,

    changed:
      true,

    previousState,

    nextState:
      'failed',

    occurrenceId:
      occurrence._id,

    ...(claimId
      ? {
          claimId,
        }
      : {}),
  };
}
