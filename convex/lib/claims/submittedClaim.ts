import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

export async function findSubmittedClaimForSubmission(
  ctx: DatabaseCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  childId:
    Id<'children'>,
) {
  const claim =
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
              'submitted',
            ),
      )
      .unique();

  if (
    !claim ||
    claim.occurrenceId !==
      occurrenceId
  ) {
    return null;
  }

  return claim;
}
