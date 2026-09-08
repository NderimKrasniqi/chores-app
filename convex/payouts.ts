import {
  ConvexError,
  v,
} from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import {
  requireCurrentParentForHousehold,
} from './lib/auth/parentAuthorization';
import {
  ensureCurrentPayoutPeriod,
  getPayoutWindowForUsage,
} from './lib/finance/payoutPeriods';
import {
  markPayoutPaid,
} from './lib/finance/payoutSettlement';
import {
  listPayoutOverviewForChildren,
} from './lib/finance/payoutOverview';

const weekdayValidator =
  v.union(
    v.literal('monday'),
    v.literal('tuesday'),
    v.literal('wednesday'),
    v.literal('thursday'),
    v.literal('friday'),
    v.literal('saturday'),
    v.literal('sunday'),
  );

const payoutProjectionValidator =
  v.object({
    payoutId:
      v.id('payouts'),

    payoutPeriodId:
      v.id(
        'payoutPeriods',
      ),

    periodEndLocalDate:
      v.string(),

    balanceAtCloseSek:
      v.number(),

    amountDueSek:
      v.number(),

    pendingOutcomeCount:
      v.number(),

    status:
      v.union(
        v.literal('pending'),
        v.literal('paid'),
        v.literal(
          'no_payment',
        ),
      ),

    paidAt:
      v.union(
        v.number(),
        v.null(),
      ),
  });

export const ensureCurrent =
  mutation({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      v.object({
        payoutPeriodId:
          v.id(
            'payoutPeriods',
          ),

        endAt:
          v.number(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const period =
        await ensureCurrentPayoutPeriod(
          ctx,
          args.householdId,
        );

      return {
        payoutPeriodId:
          period._id,

        endAt:
          period.endAt,
      };
    },
  });

export const getOverview =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      v.object({
        configuredPayoutWeekday:
          weekdayValidator,

        currentPeriod:
          v.object({
            payoutPeriodId:
              v.union(
                v.id(
                  'payoutPeriods',
                ),
                v.null(),
              ),

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
          }),

        children:
          v.array(
            v.object({
              childId:
                v.id(
                  'children',
                ),

              displayName:
                v.string(),

              runningBalanceSek:
                v.number(),

              pendingPayouts:
                v.array(
                  payoutProjectionValidator,
                ),

              latestPayout:
                v.union(
                  payoutProjectionValidator,
                  v.null(),
                ),
            }),
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const household =
        await ctx.db.get(
          args.householdId,
        );

      if (!household) {
        throw new ConvexError(
          'Household not found.',
        );
      }

      const currentPeriod =
        await getPayoutWindowForUsage(
          ctx,
          household,
        );

      const resultChildren =
        await listPayoutOverviewForChildren(
          ctx,
          household._id,
        );

      return {
        configuredPayoutWeekday:
          household
            .payoutWeekday,

        currentPeriod: {
          payoutPeriodId:
            currentPeriod
              .payoutPeriodId,

          startLocalDate:
            currentPeriod
              .startLocalDate,

          endLocalDate:
            currentPeriod
              .endLocalDate,

          startAt:
            currentPeriod.startAt,

          endAt:
            currentPeriod.endAt,

          timezone:
            currentPeriod.timezone,

          payoutWeekday:
            currentPeriod
              .payoutWeekday,
        },

        children:
          resultChildren,
      };
    },
  });

export const markPaid =
  mutation({
    args: {
      payoutId:
        v.id(
          'payouts',
        ),
    },

    returns:
      v.object({
        payoutId:
          v.id(
            'payouts',
          ),

        childId:
          v.id(
            'children',
          ),

        amountPaidSek:
          v.number(),

        paidAt:
          v.number(),

        status:
          v.literal(
            'paid',
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      const payout =
        await ctx.db.get(
          args.payoutId,
        );

      if (!payout) {
        throw new ConvexError(
          'Payout not found.',
        );
      }

      const {
        authUser,
      } =
        await requireCurrentParentForHousehold(
          ctx,
          payout.householdId,
        );

      return await markPayoutPaid(
        ctx,
        payout._id,
        authUser._id,
      );
    },
  });
