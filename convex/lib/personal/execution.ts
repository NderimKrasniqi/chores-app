import { ConvexError } from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  consumeEvidenceUploadIntent,
} from '../evidence/submissionEvidence';

const currentPersonalStates = [
  'available',
  'submitted',
  'redo_required',
] as const;

const recentPersonalStates = [
  'approved',
  'missed',
  'failed',
  'cancelled',
] as const;

/*
 * Operational Child projection.
 *
 * Do not rescan lifetime occurrence history.
 *
 * Return only:
 *
 * - unresolved current work;
 * - the next scheduled occurrence for
 *   each Chore Definition;
 * - the three most recent terminal
 *   outcomes across the Child.
 *
 * Full durable occurrence history remains
 * stored and can be exposed separately
 * through a paginated history surface.
 */
export async function listPersonalOccurrencesForChild(
  ctx:
    | MutationCtx
    | QueryCtx,
  childId:
    Id<'children'>,
) {
  const currentGroups =
    await Promise.all(
      currentPersonalStates.map(
        (state) =>
          ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_personal_child_state_availability',
              (q) =>
                q
                  .eq(
                    'personalChildId',
                    childId,
                  )
                  .eq(
                    'state',
                    state,
                  ),
            )
            .collect(),
      ),
    );

  /*
   * Scheduled occurrences are generated
   * only through the bounded occurrence
   * generation horizon.
   *
   * Reduce that short future window to
   * one next occurrence per definition.
   */
  const scheduled =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_personal_child_state_availability',
        (q) =>
          q
            .eq(
              'personalChildId',
              childId,
            )
            .eq(
              'state',
              'scheduled',
            ),
      )
      .collect();

  const nextScheduledByDefinition =
    new Map<
      Id<'choreDefinitions'>,
      (typeof scheduled)[number]
    >();

  for (
    const occurrence of
    scheduled
  ) {
    if (
      occurrence.kind !==
        'personal' ||
      occurrence.personalChildId !==
        childId ||
      nextScheduledByDefinition.has(
        occurrence.choreDefinitionId,
      )
    ) {
      continue;
    }

    nextScheduledByDefinition.set(
      occurrence.choreDefinitionId,
      occurrence,
    );
  }

  /*
   * Each terminal-state query is capped
   * at the number ultimately needed by
   * the current presentation.
   */
  const recentGroups =
    await Promise.all(
      recentPersonalStates.map(
        (state) =>
          ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_personal_child_state_availability',
              (q) =>
                q
                  .eq(
                    'personalChildId',
                    childId,
                  )
                  .eq(
                    'state',
                    state,
                  ),
            )
            .order(
              'desc',
            )
            .take(
              3,
            ),
      ),
    );

  const recent =
    recentGroups
      .flat()
      .filter(
        (occurrence) =>
          occurrence.kind ===
            'personal' &&
          occurrence.personalChildId ===
            childId,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.availabilityStartsAt -
          left.availabilityStartsAt,
      )
      .slice(
        0,
        3,
      );

  return [
    ...currentGroups.flat(),
    ...nextScheduledByDefinition.values(),
    ...recent,
  ]
    .filter(
      (occurrence) =>
        occurrence.kind ===
          'personal' &&
        occurrence.personalChildId ===
          childId,
    )
    .sort(
      (
        left,
        right,
      ) =>
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
  evidenceUploadIntentId?:
    Id<'submissionEvidenceUploads'>,
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
          1,
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

        attemptNumber: 1,

        /*
         * Server-authoritative time.
         * No client timestamp is accepted.
         */
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

    occurrenceId:
      occurrence._id,

    submittedAt:
      now,

    state:
      'submitted' as const,
  };
}
