import { ConvexError } from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';

export async function listPersonalOccurrencesForChild(
  ctx:
    | MutationCtx
    | QueryCtx,
  childId:
    Id<'children'>,
) {
  const occurrences =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_personal_child_availability',
        (q) =>
          q.eq(
            'personalChildId',
            childId,
          ),
      )
      .collect();

  return occurrences
    .filter(
      (occurrence) =>
        occurrence.kind ===
          'personal' &&
        occurrence.personalChildId ===
          childId,
    )
    .sort(
      (left, right) =>
        left.availabilityStartsAt -
        right.availabilityStartsAt,
    );
}

export async function submitPersonalOccurrence(
  ctx: MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  childId:
    Id<'children'>,
  now = Date.now(),
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
    'personal'
  ) {
    throw new ConvexError(
      'Only Personal Chores can be submitted through this flow.',
    );
  }

  if (
    occurrence.personalChildId !==
    childId
  ) {
    throw new ConvexError(
      'This Personal Chore is not assigned to this Child.',
    );
  }

  if (
    occurrence.state !==
    'available'
  ) {
    throw new ConvexError(
      'This Personal Chore is not available for submission.',
    );
  }

  if (
    now <
    occurrence
      .availabilityStartsAt
  ) {
    throw new ConvexError(
      'This Personal Chore is not available yet.',
    );
  }

  /*
   * Submission AT the deadline is valid.
   *
   * Only timestamps strictly later than
   * deadlineAt are rejected.
   */
  if (
    now >
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'The Personal Chore deadline has passed.',
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
              occurrenceId,
            )
            .eq(
              'attemptNumber',
              1,
            ),
      )
      .unique();

  if (existingSubmission) {
    throw new ConvexError(
      'This Personal Chore has already been submitted.',
    );
  }

  const submissionId =
    await ctx.db.insert(
      'choreSubmissions',
      {
        householdId:
          occurrence.householdId,

        occurrenceId:
          occurrence._id,

        childId,

        attemptNumber: 1,

        /*
         * Server-authoritative time.
         * No client timestamp is accepted.
         */
        submittedAt:
          now,
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

    occurrenceId:
      occurrence._id,

    submittedAt:
      now,

    state:
      'submitted' as const,
  };
}
