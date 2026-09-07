import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../_generated/dataModel';
import type {
  MutationCtx,
} from '../_generated/server';
import { getClaimableAccessGateForChild } from './claimableAccessGate';

const activeClaimStates = [
  'claimed',
  'submitted',
  'redo_required',
] as const;

async function findActiveClaimForChild(
  ctx: MutationCtx,
  childId:
    Id<'children'>,
) {
  for (
    const state of
    activeClaimStates
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
                state,
              ),
        )
        .first();

    if (claim) {
      return claim;
    }
  }

  return null;
}

/*
 * Atomically claim one available
 * Claimable Chore Occurrence.
 *
 * The caller supplies only the occurrence
 * identity. Child and Household identity
 * come from authenticated server state.
 *
 * All consequential rules are checked
 * inside the same Convex mutation:
 *
 * - Unlock gate;
 * - Household boundary;
 * - Claimable kind;
 * - availability window;
 * - eligibility snapshot;
 * - exclusive occurrence ownership;
 * - one unresolved Claim per Child.
 *
 * Convex mutations are transactional.
 * The occurrence-Claim index read and
 * insert therefore provide the
 * first-successful-claim boundary.
 */
export async function claimClaimableOccurrence(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  occurrenceId:
    Id<'choreOccurrences'>,
  now = Date.now(),
) {
  /*
   * Re-check TASK-09 authorization at the
   * moment of claiming.
   *
   * A client having previously seen the
   * pool never grants authority to claim
   * after the Unlock gate closes.
   */
  const gate =
    await getClaimableAccessGateForChild(
      ctx,
      childId,
      now,
    );

  if (
    !gate.canAccessClaimables
  ) {
    throw new ConvexError(
      'Claimable Chores are locked until the current Unlock Chore is approved.',
    );
  }

  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Claimable Chore occurrence not found.',
    );
  }

  if (
    occurrence.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'This Claimable Chore does not belong to this Household.',
    );
  }

  if (
    occurrence.kind !==
    'claimable'
  ) {
    throw new ConvexError(
      'Only Claimable Chores can be claimed.',
    );
  }

  if (
    occurrence.state !==
    'available'
  ) {
    throw new ConvexError(
      'This Claimable Chore is not available.',
    );
  }

  if (
    now <
    occurrence
      .availabilityStartsAt
  ) {
    throw new ConvexError(
      'This Claimable Chore is not available yet.',
    );
  }

  /*
   * Claimable Chores expire AT their
   * deadline boundary.
   *
   * Unlike Personal submission, claiming
   * exactly at deadline is not permitted.
   */
  if (
    now >=
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'This Claimable Chore deadline has passed.',
    );
  }

  /*
   * TASK-07 snapshots explicit Child IDs
   * on every generated Claimable
   * occurrence, including definitions
   * configured for "all Children".
   */
  if (
    occurrence
      .eligibleChildIds
      ?.includes(
        childId,
      ) !== true
  ) {
    throw new ConvexError(
      'This Child is not eligible for this Claimable Chore.',
    );
  }

  /*
   * Exclusive ownership boundary.
   *
   * The index read participates in the
   * transaction. Concurrent attempts for
   * the same occurrence cannot both
   * successfully commit a Claim.
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
            occurrenceId,
          ),
      )
      .first();

  if (existingClaim) {
    throw new ConvexError(
      'This Claimable Chore has already been claimed.',
    );
  }

  /*
   * A Child may own at most one unresolved
   * Claim at a time.
   *
   * Submission and redo continue to occupy
   * the slot. Approval, unclaim,
   * cancellation, and failure are terminal.
   */
  const activeClaim =
    await findActiveClaimForChild(
      ctx,
      childId,
    );

  if (activeClaim) {
    throw new ConvexError(
      'This Child already has an active Claimable Chore.',
    );
  }

  const claimId =
    await ctx.db.insert(
      'choreClaims',
      {
        householdId,

        occurrenceId:
          occurrence._id,

        childId,

        state:
          'claimed',

        /*
         * Convex server time is
         * authoritative.
         */
        claimedAt:
          now,
      },
    );

  return {
    claimId,

    occurrenceId:
      occurrence._id,

    childId,

    claimedAt:
      now,

    state:
      'claimed' as const,
  };
}
