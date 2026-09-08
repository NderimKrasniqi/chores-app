import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';
import {
  getClaimCommitmentLockAt,
} from './commitmentRules';

export async function reconcileClaimCommitmentLock(
  ctx:
    MutationCtx,
  occurrenceId:
    Id<'choreOccurrences'>,
  now =
    Date.now(),
) {
  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  if (
    !occurrence ||
    occurrence.kind !==
      'claimable'
  ) {
    return {
      found:
        occurrence !==
        null,

      changed:
        false,

      lockAt:
        null,
    };
  }

  const lockAt =
    getClaimCommitmentLockAt(
      occurrence.deadlineAt,
    );

  if (
    occurrence
      .commitmentLockReachedAt !==
    undefined
  ) {
    return {
      found:
        true,

      changed:
        false,

      lockAt,
    };
  }

  /*
   * Commitment UI is only operational
   * while the occurrence is still
   * scheduled/available.
   *
   * A Claim itself intentionally does not
   * change occurrence.state, so an actively
   * claimed Chore remains covered here.
   */
  if (
    occurrence.state !==
      'scheduled' &&
    occurrence.state !==
      'available'
  ) {
    return {
      found:
        true,

      changed:
        false,

      lockAt,
    };
  }

  if (
    now <
    lockAt
  ) {
    return {
      found:
        true,

      changed:
        false,

      lockAt,
    };
  }

  await ctx.db.patch(
    occurrence._id,
    {
      commitmentLockReachedAt:
        lockAt,
    },
  );

  return {
    found:
      true,

    changed:
      true,

    lockAt,
  };
}
