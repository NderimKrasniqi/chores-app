import type {
  Id,
} from '../../_generated/dataModel';
import type {
  QueryCtx,
} from '../../_generated/server';

export async function listActiveRedosForChild(
  ctx: QueryCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  now = Date.now(),
) {
  const personal =
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
              'redo_required',
            ),
      )
      .collect();

  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_child_state',
        (q) =>
          q
            .eq(
              'childId',
              childId,
            )
            .eq(
              'state',
              'redo_required',
            ),
      )
      .collect();

  const occurrenceIds =
    new Set<
      Id<'choreOccurrences'>
    >();

  for (
    const occurrence of
    personal
  ) {
    if (
      occurrence.householdId ===
        householdId &&
      occurrence.kind ===
        'personal'
    ) {
      occurrenceIds.add(
        occurrence._id,
      );
    }
  }

  for (
    const claim of
    claims
  ) {
    if (
      claim.householdId ===
      householdId
    ) {
      occurrenceIds.add(
        claim.occurrenceId,
      );
    }
  }

  const result = [];

  for (
    const occurrenceId of
    occurrenceIds
  ) {
    const occurrence =
      await ctx.db.get(
        occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.householdId !==
        householdId ||
      occurrence.state !==
        'redo_required'
    ) {
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

    if (!redo) {
      continue;
    }

    const initialSubmission =
      await ctx.db.get(
        redo.initialSubmissionId,
      );

    if (
      !initialSubmission ||
      initialSubmission.childId !==
        childId
    ) {
      continue;
    }

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

    result.push({
      redoId:
        redo._id,

      occurrenceId:
        occurrence._id,

      kind:
        occurrence.kind,

      deadlineAt:
        redo.deadlineAt,

      deadlineLocalDate:
        redo.deadlineLocalDate,

      deadlineLocalTime:
        redo.deadlineLocalTime,

      timezone:
        occurrence.timezone,

      occurrenceState:
        occurrence.state,

      canSubmitRedo:
        attemptTwo ===
          null &&
        now >=
          redo.createdAt &&
        now <=
          redo.deadlineAt,
    });
  }

  return result.sort(
    (
      left,
      right,
    ) =>
      left.deadlineAt -
      right.deadlineAt,
  );
}
