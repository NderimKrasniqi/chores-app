import {
  ConvexError,
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  calculateRunningBalanceForChild,
  insertFinancialLedgerEntry,
} from '../../../lib/finance/financialProjection';
import {
  markPayoutPaid,
} from '../../../lib/finance/payoutSettlement';

export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        passed:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      if (
        process.env
          .APP_ENV ===
        'production'
      ) {
        throw new ConvexError(
          'Developer smoke tests are disabled in production.',
        );
      }

      const now =
        Date.UTC(
          2031,
          0,
          10,
          12,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Financial Projection',

            timezone:
              'UTC',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Projection Child',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'Projection fixture',

            valueSek:
              100,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2031-01-10',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task22-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const occurrenceA =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'Earning',

            valueSek:
              100,

            scheduledLocalDate:
              '2031-01-10',

            timezone:
              'UTC',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt:
              now +
              6 *
                60 *
                60 *
                1000,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'approved',

            createdAt:
              now,
          },
        );

      const occurrenceB =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'Penalty fixture',

            valueSek:
              30,

            scheduledLocalDate:
              '2031-01-10',

            timezone:
              'UTC',

            deadlineLocalTime:
              '19:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt:
              now +
              7 *
                60 *
                60 *
                1000,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'failed',

            createdAt:
              now,
          },
        );

      try {
        await insertFinancialLedgerEntry(
          ctx,
          {
            householdId,

            childId,

            occurrenceId:
              occurrenceA,

            kind:
              'earning',

            amountSek:
              100,

            createdAt:
              now,
          },
        );

        await insertFinancialLedgerEntry(
          ctx,
          {
            householdId,

            childId,

            occurrenceId:
              occurrenceB,

            kind:
              'penalty',

            amountSek:
              -30,

            createdAt:
              now +
              1,
          },
        );

        const beforePayment =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        if (
          beforePayment
            .earningTotalSek !==
            100 ||
          beforePayment
            .penaltyTotalSek !==
            -30 ||
          beforePayment
            .settledTotalSek !==
            0 ||
          beforePayment
            .balanceSek !==
            70 ||
          beforePayment
            .entryCount !==
            2
        ) {
          throw new Error(
            'Financial projection did not track Ledger writes.',
          );
        }

        const payoutPeriodId =
          await ctx.db.insert(
            'payoutPeriods',
            {
              householdId,

              startLocalDate:
                '2031-01-04',

              endLocalDate:
                '2031-01-11',

              startAt:
                now -
                6 *
                  24 *
                  60 *
                  60 *
                  1000,

              endAt:
                now +
                24 *
                  60 *
                  60 *
                  1000,

              timezone:
                'UTC',

              payoutWeekday:
                'friday',

              state:
                'closed',

              createdAt:
                now,

              closedAt:
                now,
            },
          );

        const payoutId =
          await ctx.db.insert(
            'payouts',
            {
              householdId,

              payoutPeriodId,

              childId,

              balanceAtCloseSek:
                70,

              amountDueSek:
                70,

              pendingOutcomeCount:
                0,

              status:
                'pending',

              createdAt:
                now,
            },
          );

        await markPayoutPaid(
          ctx,
          payoutId,
          'task22-parent',
          now +
            2,
        );

        const afterPayment =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        if (
          afterPayment
            .settledTotalSek !==
            70 ||
          afterPayment
            .balanceSek !==
            0 ||
          afterPayment
            .entryCount !==
            2
        ) {
          throw new Error(
            'Financial projection did not track paid settlement.',
          );
        }

        return {
          passed:
            true,
        };
      } finally {
        const projection =
          await ctx.db
            .query(
              'childFinancialBalances',
            )
            .withIndex(
              'by_child',
              (q) =>
                q.eq(
                  'childId',
                  childId,
                ),
            )
            .unique();

        if (projection) {
          await ctx.db.delete(
            projection._id,
          );
        }

        const payouts =
          await ctx.db
            .query(
              'payouts',
            )
            .withIndex(
              'by_child',
              (q) =>
                q.eq(
                  'childId',
                  childId,
                ),
            )
            .collect();

        for (
          const payout of
          payouts
        ) {
          await ctx.db.delete(
            payout._id,
          );
        }

        const periods =
          await ctx.db
            .query(
              'payoutPeriods',
            )
            .withIndex(
              'by_household_start_at',
              (q) =>
                q.eq(
                  'householdId',
                  householdId,
                ),
            )
            .collect();

        for (
          const period of
          periods
        ) {
          await ctx.db.delete(
            period._id,
          );
        }

        const entries =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_child_created_at',
              (q) =>
                q.eq(
                  'childId',
                  childId,
                ),
            )
            .collect();

        for (
          const entry of
          entries
        ) {
          await ctx.db.delete(
            entry._id,
          );
        }

        await ctx.db.delete(
          occurrenceB,
        );

        await ctx.db.delete(
          occurrenceA,
        );

        await ctx.db.delete(
          definitionId,
        );

        await ctx.db.delete(
          childId,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
