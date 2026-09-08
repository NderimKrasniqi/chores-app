import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

import {
  weekdayValidator,
} from './households';

const payoutPeriodStateValidator =
  v.union(
    v.literal('open'),
    v.literal('closed'),
  );

const payoutStatusValidator =
  v.union(
    v.literal('pending'),
    v.literal('paid'),
    v.literal('no_payment'),
  );

export const financeTables = {
  payoutPeriods: defineTable({
    householdId:
      v.id('households'),

    startLocalDate:
      v.string(),

    endLocalDate:
      v.string(),

    startAt:
      v.number(),

    endAt:
      v.number(),

    timezone:
      v.string(),

    payoutWeekday:
      weekdayValidator,

    state:
      payoutPeriodStateValidator,

    createdAt:
      v.number(),

    closedAt:
      v.optional(
        v.number(),
      ),
  })
    .index(
      'by_household_start_at',
      [
        'householdId',
        'startAt',
      ],
    )
    .index(
      'by_household_state_end_at',
      [
        'householdId',
        'state',
        'endAt',
      ],
    ),

  payouts: defineTable({
    householdId:
      v.id('households'),

    payoutPeriodId:
      v.id('payoutPeriods'),

    childId:
      v.id('children'),

    /*
     * Net unreserved financial position
     * at this period's cutoff.
     *
     * Negative values carry forward.
     */
    balanceAtCloseSek:
      v.number(),

    /*
     * Positive amount manually paid
     * through Swish.
     */
    amountDueSek:
      v.number(),

    /*
     * Work still awaiting review or Redo
     * when the period closed.
     */
    pendingOutcomeCount:
      v.number(),

    status:
      payoutStatusValidator,

    createdAt:
      v.number(),

    paidAt:
      v.optional(
        v.number(),
      ),

    paidByAuthUserId:
      v.optional(
        v.string(),
      ),
  })
    .index(
      'by_period_child',
      [
        'payoutPeriodId',
        'childId',
      ],
    )
    .index(
      'by_household_status',
      [
        'householdId',
        'status',
      ],
    )
    .index(
      'by_child',
      [
        'childId',
      ],
    )
    .index(
      'by_household_created_at',
      [
        'householdId',
        'createdAt',
      ],
    ),
};
