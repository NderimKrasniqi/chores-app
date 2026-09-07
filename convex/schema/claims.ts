import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

/*
 * Durable Claim lifecycle.
 *
 * A Claim keeps the same identity while
 * moving through its execution states.
 *
 * `unclaimed` and `cancelled` are terminal
 * outcomes introduced by TASK-11.
 */
const choreClaimStateValidator =
  v.union(
    v.literal('claimed'),
    v.literal('submitted'),
    v.literal('redo_required'),
    v.literal('approved'),
    v.literal('unclaimed'),
    v.literal('cancelled'),
    v.literal('failed'),
  );

export const claimTables = {
  choreClaims: defineTable({
    householdId:
      v.id('households'),

    occurrenceId:
      v.id(
        'choreOccurrences',
      ),

    childId:
      v.id('children'),

    state:
      choreClaimStateValidator,

    /*
     * Authoritative Convex server time.
     */
    claimedAt:
      v.number(),

    /*
     * Present only after a successful
     * Child-initiated unclaim.
     *
     * This timestamp is the durable fact
     * used for weekly allowance usage.
     *
     * Parent cancellation never writes
     * unclaimedAt and therefore never
     * consumes Child allowance.
     */
    unclaimedAt:
      v.optional(
        v.number(),
      ),

    /*
     * Present only when an authorized
     * Parent cancels the unresolved Claim.
     */
    cancelledAt:
      v.optional(
        v.number(),
      ),

    cancelledByAuthUserId:
      v.optional(
        v.string(),
      ),
  })
    .index(
      'by_occurrence',
      [
        'occurrenceId',
      ],
    )

    .index(
      'by_child',
      [
        'childId',
      ],
    )

    .index(
      'by_child_state',
      [
        'childId',
        'state',
      ],
    )

    /*
     * Efficiently counts successful
     * Child unclaims inside the current
     * Payout Week.
     */
    .index(
      'by_child_unclaimed_at',
      [
        'childId',
        'unclaimedAt',
      ],
    )

    .index(
      'by_household_claimed_at',
      [
        'householdId',
        'claimedAt',
      ],
    ),
};
