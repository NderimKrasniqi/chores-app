import {
  ConvexError,
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  ensureCurrentPayoutPeriod,
} from '../../../lib/finance/payoutPeriods';
import {
  getNextHouseholdMaintenanceBatch,
} from '../../../lib/maintenance/householdDispatch';
import {
  runOccurrenceMaintenance,
} from '../../../lib/occurrences/maintenance';

const smokeDispatchKey =
  'task22-maintenance-fanout-smoke';

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
          3,
          10,
          12,
          0,
          0,
        );

      const oldState =
        await ctx.db
          .query(
            'maintenanceDispatchState',
          )
          .withIndex(
            'by_key',
            (q) =>
              q.eq(
                'key',
                smokeDispatchKey,
              ),
          )
          .unique();

      if (oldState) {
        await ctx.db.delete(
          oldState._id,
        );
      }

      const householdA =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Maintenance A',

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

      const householdB =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Maintenance B',

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

      let payoutPeriodId:
        | Awaited<
            ReturnType<
              typeof ensureCurrentPayoutPeriod
            >
          >['_id']
        | null =
        null;

      try {
        /*
         * Dispatcher pagination itself is
         * bounded independently of how many
         * Households exist in the database.
         *
         * No scheduled work is created by
         * this smoke.
         */
        const dispatch =
          await getNextHouseholdMaintenanceBatch(
            ctx,
            smokeDispatchKey,
            {
              batchSize:
                1,

              now,
            },
          );

        if (
          dispatch
            .householdIds
            .length >
          1
        ) {
          throw new Error(
            'Maintenance dispatcher exceeded its requested batch bound.',
          );
        }

        const state =
          await ctx.db
            .query(
              'maintenanceDispatchState',
            )
            .withIndex(
              'by_key',
              (q) =>
                q.eq(
                  'key',
                  smokeDispatchKey,
                ),
            )
            .unique();

        if (!state) {
          throw new Error(
            'Maintenance dispatcher did not persist its cursor checkpoint.',
          );
        }

        /*
         * Scoped occurrence maintenance
         * must remain isolated to A.
         */
        const occurrenceResult =
          await runOccurrenceMaintenance(
            ctx,
            {
              now,

              horizonDays:
                0,

              scheduleTransitions:
                false,

              householdIds: [
                householdA,
              ],
            },
          );

        if (
          occurrenceResult
            .householdCount !==
          1
        ) {
          throw new Error(
            'Occurrence maintenance was not Household-scoped.',
          );
        }

        /*
         * Payout maintenance for A must not
         * create a period for B.
         */
        const payoutPeriod =
          await ensureCurrentPayoutPeriod(
            ctx,
            householdA,
            now,
            {
              scheduleTransitions:
                false,
            },
          );

        payoutPeriodId =
          payoutPeriod._id;

        const householdBPeriods =
          await ctx.db
            .query(
              'payoutPeriods',
            )
            .withIndex(
              'by_household_start_at',
              (q) =>
                q.eq(
                  'householdId',
                  householdB,
                ),
            )
            .collect();

        if (
          householdBPeriods.length !==
          0
        ) {
          throw new Error(
            'Payout maintenance leaked into another Household.',
          );
        }

        return {
          passed:
            true,
        };
      } finally {
        const state =
          await ctx.db
            .query(
              'maintenanceDispatchState',
            )
            .withIndex(
              'by_key',
              (q) =>
                q.eq(
                  'key',
                  smokeDispatchKey,
                ),
            )
            .unique();

        if (state) {
          await ctx.db.delete(
            state._id,
          );
        }

        if (payoutPeriodId) {
          const period =
            await ctx.db.get(
              payoutPeriodId,
            );

          if (period) {
            const payouts =
              await ctx.db
                .query(
                  'payouts',
                )
                .withIndex(
                  'by_period_child',
                  (q) =>
                    q.eq(
                      'payoutPeriodId',
                      period._id,
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

            await ctx.db.delete(
              period._id,
            );
          }
        }

        await ctx.db.delete(
          householdB,
        );

        await ctx.db.delete(
          householdA,
        );
      }
    },
  });
