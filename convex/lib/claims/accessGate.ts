import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

export type ClaimableAccessGateReason =
  | 'no_current_unlock'
  | 'current_unlock_approved'
  | 'current_unlock_not_approved';

export type ClaimableAccessGate = {
  canAccessClaimables: boolean;

  reason:
    ClaimableAccessGateReason;

  currentUnlockOccurrence:
    | {
        occurrenceId:
          Id<'choreOccurrences'>;

        state:
          | 'scheduled'
          | 'available'
          | 'submitted'
          | 'redo_required'
          | 'approved'
          | 'missed'
          | 'failed'
          | 'cancelled'
          | 'expired_unclaimed';

        scheduledLocalDate:
          string;

        availabilityStartsAt:
          number;

        deadlineAt:
          number;
      }
    | null;
};

/*
 * Resolve the Child's authoritative
 * Claimable Chore access gate.
 *
 * The current Unlock occurrence is the
 * newest Unlock occurrence whose
 * availability start has been reached.
 *
 * A future occurrence does not lock
 * access before its availability start.
 *
 * Approval of an older occurrence has
 * no unlock effect once a newer
 * occurrence is current.
 *
 * If no Unlock occurrence is currently
 * applicable, there is no active gate.
 */
export async function getClaimableAccessGateForChild(
  ctx:
    | MutationCtx
    | QueryCtx,
  childId:
    Id<'children'>,
  now = Date.now(),
): Promise<ClaimableAccessGate> {
  const currentUnlock =
    await ctx.db
      .query(
        'choreOccurrences',
      )
      .withIndex(
        'by_personal_child_availability',
        (q) =>
          q
            .eq(
              'personalChildId',
              childId,
            )
            .lte(
              'availabilityStartsAt',
              now,
            ),
      )
      .order('desc')
      .filter(
        (q) =>
          q.eq(
            q.field(
              'isUnlockChore',
            ),
            true,
          ),
      )
      .first();

  if (!currentUnlock) {
    return {
      canAccessClaimables:
        true,

      reason:
        'no_current_unlock',

      currentUnlockOccurrence:
        null,
    };
  }

  /*
   * The index is Child-specific and
   * Unlock occurrences are Personal,
   * but keep the domain boundary
   * defensive.
   */
  if (
    currentUnlock.kind !==
      'personal' ||
    currentUnlock
      .personalChildId !==
      childId
  ) {
    return {
      canAccessClaimables:
        false,

      reason:
        'current_unlock_not_approved',

      currentUnlockOccurrence:
        {
          occurrenceId:
            currentUnlock._id,

          state:
            currentUnlock.state,

          scheduledLocalDate:
            currentUnlock
              .scheduledLocalDate,

          availabilityStartsAt:
            currentUnlock
              .availabilityStartsAt,

          deadlineAt:
            currentUnlock
              .deadlineAt,
        },
    };
  }

  const approved =
    currentUnlock.state ===
    'approved';

  return {
    canAccessClaimables:
      approved,

    reason:
      approved
        ? 'current_unlock_approved'
        : 'current_unlock_not_approved',

    currentUnlockOccurrence:
      {
        occurrenceId:
          currentUnlock._id,

        state:
          currentUnlock.state,

        scheduledLocalDate:
          currentUnlock
            .scheduledLocalDate,

        availabilityStartsAt:
          currentUnlock
            .availabilityStartsAt,

        deadlineAt:
          currentUnlock
            .deadlineAt,
      },
  };
}
