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
  calculateRunningBalanceForChild,
} from './lib/finance/runningBalance';

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

      const children =
        await ctx.db
          .query(
            'children',
          )
          .withIndex(
            'by_household',
            (q) =>
              q.eq(
                'householdId',
                household._id,
              ),
          )
          .collect();

      const householdPayouts =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_household_created_at',
            (q) =>
              q.eq(
                'householdId',
                household._id,
              ),
          )
          .order(
            'desc',
          )
          .collect();

      const resultChildren = [];

      for (
        const child of
        children
      ) {
        const balance =
          await calculateRunningBalanceForChild(
            ctx,
            child._id,
          );

        const childPayouts =
          householdPayouts.filter(
            (payout) =>
              payout.childId ===
              child._id,
          );

        const projections = [];

        for (
          const payout of
          childPayouts
        ) {
          const period =
            await ctx.db.get(
              payout
                .payoutPeriodId,
            );

          if (!period) {
            throw new ConvexError(
              'Payout Period not found.',
            );
          }

          projections.push({
            payoutId:
              payout._id,

            payoutPeriodId:
              period._id,

            periodEndLocalDate:
              period
                .endLocalDate,

            balanceAtCloseSek:
              payout
                .balanceAtCloseSek,

            amountDueSek:
              payout
                .amountDueSek,

            pendingOutcomeCount:
              payout
                .pendingOutcomeCount,

            status:
              payout.status,

            paidAt:
              payout.paidAt ??
              null,
          });
        }

        resultChildren.push({
          childId:
            child._id,

          displayName:
            child.displayName,

          runningBalanceSek:
            balance.balanceSek,

          pendingPayouts:
            projections.filter(
              (payout) =>
                payout.status ===
                'pending',
            ),

          latestPayout:
            projections[0] ??
            null,
        });
      }

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
