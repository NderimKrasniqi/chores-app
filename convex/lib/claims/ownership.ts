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

/*
 * Only a successful Child unclaim returns
 * the occurrence to the Claimable pool.
 *
 * Other Claim outcomes continue to prevent
 * that occurrence from being claimed again.
 *
 * In particular:
 *
 * - claimed / submitted / redo_required
 *   represent unresolved ownership;
 *
 * - approved / failed are terminal outcomes
 *   that must never reopen;
 *
 * - cancelled belongs to Parent
 *   cancellation and the occurrence itself
 *   will become cancelled;
 *
 * - unclaimed explicitly releases the
 *   occurrence for another eligible Claim.
 */
export function claimPreventsReclaim(
  state:
    | 'claimed'
    | 'submitted'
    | 'redo_required'
    | 'approved'
    | 'unclaimed'
    | 'cancelled'
    | 'failed',
) {
  return (
    state !==
    'unclaimed'
  );
}

export async function findClaimPreventingReclaim(
  ctx: DatabaseCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
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
            occurrenceId,
          ),
      )
      .collect();

  return (
    claims.find(
      (claim) =>
        claimPreventsReclaim(
          claim.state,
        ),
    ) ??
    null
  );
}
