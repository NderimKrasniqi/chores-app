import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';
import { getClaimableAccessGateForChild } from './claimableAccessGate';

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

  /*
   * Locked Children receive no
   * available Claimable Chore data.
   */
  if (
    !gate.canAccessClaimables
  ) {
    return {
      gate,
      occurrences: [],
    };
  }

  const candidates =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_household_availability',
        (q) =>
          q
            .eq(
              'householdId',
              householdId,
            )
            .lte(
              'availabilityStartsAt',
              now,
            ),
      )
      .collect();

  const visible = [];

  for (
    const occurrence of
    candidates
  ) {
    if (
      occurrence.kind !==
        'claimable' ||
      occurrence.state !==
        'available' ||
      occurrence
        .availabilityStartsAt >
        now ||
      now >=
        occurrence.deadlineAt ||
      occurrence
        .eligibleChildIds
        ?.includes(
          childId,
        ) !== true
    ) {
      continue;
    }

    /*
     * A claimed occurrence must no longer
     * appear as available to siblings.
     *
     * Claim ownership lives in choreClaims
     * rather than mutating the occurrence
     * into a synthetic "claimed" state.
     */
    const existingClaim =
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
        .first();

    if (existingClaim) {
      continue;
    }

    visible.push(
      occurrence,
    );
  }

  visible.sort(
    (left, right) =>
      left.deadlineAt -
      right.deadlineAt,
  );

  return {
    gate,
    occurrences:
      visible,
  };
}

/*
 * Household-visible unresolved Claim
 * ownership.
 *
 * This is intentionally separate from
 * the Child's unlocked available pool.
 *
 * A Child may still need to see that a
 * sibling owns a Claim even when that
 * Child's own Unlock gate is currently
 * closed.
 */
export async function listHouseholdClaimedOccurrences(
  ctx:
    | MutationCtx
    | QueryCtx,
  householdId:
    Id<'households'>,
) {
  const claims =
    await ctx.db
      .query(
        'choreClaims',
      )
      .withIndex(
        'by_household_claimed_at',
        (q) =>
          q.eq(
            'householdId',
            householdId,
          ),
      )
      .collect();

  const visible = [];

  for (
    const claim of
    claims
  ) {
    if (
      !visibleClaimStates.includes(
        claim.state as
          (typeof visibleClaimStates)[number],
      )
    ) {
      continue;
    }

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
    (left, right) =>
      right.claim.claimedAt -
      left.claim.claimedAt,
  );

  return visible;
}
