import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

/*
 * Claim lifecycle.
 *
 * TASK-10 initially creates `claimed`.
 *
 * Later tasks will move the same durable
 * Claim through submission, redo, approval,
 * unclaim, cancellation, and failure without
 * replacing its identity.
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
  /*
   * Durable exclusive ownership of one
   * Claimable Chore Occurrence.
   *
   * The occurrence already contains the
   * immutable accepted value, deadline,
   * timezone, and eligibility snapshots,
   * so those terms are not duplicated here.
   */
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
     *
     * The client never supplies claimedAt.
     */
    claimedAt:
      v.number(),
  })
    /*
     * Used for exclusive ownership:
     * one occurrence may have at most one
     * successful durable Claim.
     */
    .index(
      'by_occurrence',
      [
        'occurrenceId',
      ],
    )

    /*
     * Used for the Child's active-Claim
     * slot and future Claim history.
     */
    .index(
      'by_child',
      [
        'childId',
      ],
    )

    /*
     * TASK-10 and later lifecycle work
     * can efficiently inspect unresolved
     * states for one Child.
     */
    .index(
      'by_child_state',
      [
        'childId',
        'state',
      ],
    )

    /*
     * Household-facing claimed-by
     * visibility and history.
     */
    .index(
      'by_household_claimed_at',
      [
        'householdId',
        'claimedAt',
      ],
    ),
};
