import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  getClaimableAccessGateForChild,
} from './accessGate';
import {
  findClaimPreventingReclaim,
} from './ownership';

const visibleClaimStates = [
  'claimed',
  'submitted',
  'redo_required',
] as const;

export async function listVisibleClaimableOccurrencesForChild(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  now = Date.now(),
) {
  const gate =
    await getClaimableAccessGateForChild(
      ctx,
      childId,
      now,
    );

  if (
    !gate.canAccessClaimables
  ) {
    return {
      gate,
      occurrences: [],
    };
  }

  /*
   * Operational pool only.
   *
   * Query currently unresolved Claimable
   * occurrences whose deadlines are still
   * in the future.
   *
   * Future scheduled work is excluded by
   * state and stale overdue work is
   * excluded by the deadline range.
   */
  const candidates =
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
              'available',
            )
            .gt(
              'deadlineAt',
              now,
            ),
      )
      .collect();

  const visible = [];

  for (
    const occurrence of
    candidates
  ) {
    /*
     * undefined eligibleChildIds means
     * every Child in the Household is
     * eligible.
     */
    const isRestrictedAway =
      occurrence.eligibleChildIds !==
        undefined &&
      !occurrence.eligibleChildIds.includes(
        childId,
      );

    if (
      occurrence.availabilityStartsAt >
        now ||
      isRestrictedAway
    ) {
      continue;
    }

    /*
     * Historical successful unclaims do
     * not hide the occurrence.
     *
     * Any other Claim state prevents it
     * from appearing as available.
     */
    const blockingClaim =
      await findClaimPreventingReclaim(
        ctx,
        occurrence._id,
      );

    if (blockingClaim) {
      continue;
    }

    visible.push(
      occurrence,
    );
  }

  visible.sort(
    (
      left,
      right,
    ) =>
      left.deadlineAt -
      right.deadlineAt,
  );

  return {
    gate,
    occurrences:
      visible,
  };
}

export async function listHouseholdClaimedOccurrences(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
) {
  /*
   * Active ownership is a current-state
   * projection. Query the three active
   * Claim states directly instead of
   * scanning lifetime Household Claims.
   */
  const claimGroups =
    await Promise.all(
      visibleClaimStates.map(
        (state) =>
          ctx.db
            .query(
              'choreClaims',
            )
            .withIndex(
              'by_household_state_claimed_at',
              (q) =>
                q
                  .eq(
                    'householdId',
                    householdId,
                  )
                  .eq(
                    'state',
                    state,
                  ),
            )
            .collect(),
      ),
    );

  const visible = [];

  for (
    const claim of
    claimGroups.flat()
  ) {
    const occurrence =
      await ctx.db.get(
        claim.occurrenceId,
      );

    if (
      !occurrence ||
      occurrence.householdId !==
        householdId ||
      occurrence.kind !==
        'claimable'
    ) {
      continue;
    }

    const child =
      await ctx.db.get(
        claim.childId,
      );

    if (
      !child ||
      child.householdId !==
        householdId
    ) {
      continue;
    }

    visible.push({
      claim,
      occurrence,
      child,
    });
  }

  visible.sort(
    (
      left,
      right,
    ) =>
      right.claim.claimedAt -
      left.claim.claimedAt,
  );

  return visible;
}
