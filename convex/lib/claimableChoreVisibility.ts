import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../_generated/server';
import { getClaimableAccessGateForChild } from './claimableAccessGate';

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
   * This is an authorization boundary.
   *
   * Locked Children receive no Claimable
   * occurrence data from this helper.
   */
  if (
    !gate.canAccessClaimables
  ) {
    return {
      gate,
      occurrences: [],
    };
  }

  /*
   * Use the Household + availability
   * index to avoid reading future
   * occurrences unnecessarily.
   */
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

  const occurrences =
    candidates
      .filter(
        (occurrence) =>
          occurrence.kind ===
            'claimable' &&
          occurrence.state ===
            'available' &&
          occurrence
            .availabilityStartsAt <=
            now &&
          /*
           * TASK-07 expires an unclaimed
           * Claimable occurrence at its
           * deadline, so visibility uses
           * the same strict boundary.
           */
          now <
            occurrence.deadlineAt &&
          /*
           * Generated Claimable
           * occurrences snapshot explicit
           * Child eligibility.
           */
          occurrence
            .eligibleChildIds
            ?.includes(
              childId,
            ) === true,
      )
      .sort(
        (left, right) =>
          left.deadlineAt -
          right.deadlineAt,
      );

  return {
    gate,
    occurrences,
  };
}
