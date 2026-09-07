import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';
import { getClaimableAccessGateForChild } from './claimableAccessGate';
import { findClaimPreventingReclaim } from './claimOwnership';

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
