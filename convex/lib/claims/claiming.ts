import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import { getClaimableAccessGateForChild } from './accessGate';
import { getClaimUnclaimStatus } from './commitmentRules';
import { getWeeklyUnclaimUsageForChild } from './unclaimAccounting';
import { findClaimPreventingReclaim } from './ownership';

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

export async function claimClaimableOccurrence(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  occurrenceId:
    Id<'choreOccurrences'>,
  now = Date.now(),
  acceptImmediateLock =
    false,
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
    throw new ConvexError(
      'Claimable Chores are locked until the current Unlock Chore is approved.',
    );
  }

  const household =
    await ctx.db.get(
      householdId,
    );

  if (!household) {
    throw new ConvexError(
      'Household not found.',
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

  if (
    now >=
    occurrence.deadlineAt
  ) {
    throw new ConvexError(
      'This Claimable Chore deadline has passed.',
    );
  }

  if (
    occurrence
      .eligibleChildIds !==
      undefined &&
    !occurrence
      .eligibleChildIds
      .includes(
        childId,
      )
  ) {
    throw new ConvexError(
      'This Child is not eligible for this Claimable Chore.',
    );
  }

  const blockingClaim =
    await findClaimPreventingReclaim(
      ctx,
      occurrenceId,
    );

  if (blockingClaim) {
    throw new ConvexError(
      'This Claimable Chore has already been claimed.',
    );
  }

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

  /*
   * TASK-11 commitment contract.
   *
   * Claiming is still permitted when
   * unclaim rights are unavailable.
   *
   * However, the client must explicitly
   * acknowledge that this Claim becomes
   * immediately locked.
   *
   * The server independently derives both
   * causes:
   *
   * - exact two-hour time boundary;
   * - exhausted weekly allowance.
   */
  const usage =
    await getWeeklyUnclaimUsageForChild(
      ctx,
      household,
      childId,
      now,
    );

  const unclaimStatus =
    getClaimUnclaimStatus({
      deadlineAt:
        occurrence.deadlineAt,

      now,

      weeklyUnclaimAllowance:
        usage.allowance,

      usedUnclaims:
        usage.usedUnclaims,
    });

  const isImmediatelyLocked =
    unclaimStatus.isTimeLocked ||
    !unclaimStatus
      .hasUnclaimAllowance;

  if (
    isImmediatelyLocked &&
    !acceptImmediateLock
  ) {
    throw new ConvexError(
      'This Claim will be locked immediately. Confirm the locked commitment before claiming.',
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

    commitment: {
      lockAt:
        unclaimStatus.lockAt,

      isImmediatelyLocked,

      remainingUnclaims:
        usage.remainingUnclaims,

      lockReason:
        unclaimStatus.isTimeLocked
          ? 'time_window' as const
          : !unclaimStatus
                .hasUnclaimAllowance
            ? 'allowance_exhausted' as const
            : null,
    },
  };
}
