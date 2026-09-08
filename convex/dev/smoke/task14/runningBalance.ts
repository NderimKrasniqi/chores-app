import {
  v,
} from 'convex/values';

import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  calculateRunningBalanceForChild,
} from '../../../lib/runningBalance';

function assert(
  condition:
    unknown,
  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        passed:
          v.number(),

        total:
          v.number(),
      }),

    handler: async (
      ctx,
    ) => {
      const baseTime =
        Date.UTC(
          2030,
          0,
          4,
          12,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK14 Running Balance fixture',

            timezone:
              'Europe/Stockholm',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              baseTime,

            updatedAt:
              baseTime,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK14 Balance Child',

            createdAt:
              baseTime,

            updatedAt:
              baseTime,
          },
        );

      const siblingId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK14 Sibling',

            createdAt:
              baseTime,

            updatedAt:
              baseTime,
          },
        );

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'claimable',

            title:
              'TASK14 Balance fixture',

            valueSek:
              140,

            recurrence: {
              kind:
                'daily',

              startDate:
                '2030-01-04',

              interval:
                1,
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            eligibleChildIds:
              [
                childId,
                siblingId,
              ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task14-smoke',

            createdAt:
              baseTime,

            updatedAt:
              baseTime,
          },
        );

      const occurrenceIds:
        Array<
          Id<'choreOccurrences'>
        > = [];

      async function createOccurrence(
        title:
          string,
        scheduledLocalDate:
          string,
        valueSek:
          number,
        state:
          'approved' |
          'failed',
        createdAt:
          number,
      ) {
        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'claimable',

              title,

              valueSek,

              scheduledLocalDate,

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                createdAt,

              deadlineAt:
                createdAt +
                6 *
                  60 *
                  60 *
                  1000,

              eligibleChildIds:
                [
                  childId,
                  siblingId,
                ],

              isUnlockChore:
                false,

              state,

              createdAt,
            },
          );

        occurrenceIds.push(
          occurrenceId,
        );

        return occurrenceId;
      }

      try {
        let passed =
          0;

        /*
         * 1. No financial events means
         * exactly zero Running Balance.
         */
        const empty =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        assert(
          empty.balanceSek ===
            0 &&
          empty.earningTotalSek ===
            0 &&
          empty.penaltyTotalSek ===
            0 &&
          empty.entryCount ===
            0,
          'Child with no Ledger Entries must have zero Running Balance.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/5 empty Ledger produces zero Running Balance',
        );

        /*
         * 2. Full-value failure may push
         * Running Balance below zero.
         */
        const failedOccurrenceId =
          await createOccurrence(
            'Missed locked Claim',
            '2030-01-04',
            140,
            'failed',
            baseTime,
          );

        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId,

            occurrenceId:
              failedOccurrenceId,

            kind:
              'penalty',

            amountSek:
              -140,

            createdAt:
              baseTime,
          },
        );

        const negative =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        assert(
          negative.balanceSek ===
            -140 &&
          negative.penaltyTotalSek ===
            -140 &&
          negative.earningTotalSek ===
            0,
          'Penalty must be able to push Running Balance below zero.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/5 failure penalty can make Running Balance negative',
        );

        /*
         * 3. One week later, a smaller
         * earning reduces the debt but does
         * not reset it.
         */
        const nextWeekAt =
          baseTime +
          7 *
            24 *
            60 *
            60 *
            1000;

        const firstEarningOccurrenceId =
          await createOccurrence(
            'Next-week earning',
            '2030-01-11',
            40,
            'approved',
            nextWeekAt,
          );

        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId,

            occurrenceId:
              firstEarningOccurrenceId,

            kind:
              'earning',

            amountSek:
              40,

            createdAt:
              nextWeekAt,
          },
        );

        const carried =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        assert(
          carried.balanceSek ===
            -100 &&
          carried.earningTotalSek ===
            40 &&
          carried.penaltyTotalSek ===
            -140,
          'Negative balance must carry across a later week and offset future earnings.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/5 negative balance carries into later-week earnings',
        );

        /*
         * 4. Future earnings continue
         * offsetting the carried negative
         * value and may eventually cross
         * back above zero.
         */
        const laterWeekAt =
          baseTime +
          14 *
            24 *
            60 *
            60 *
            1000;

        const secondEarningOccurrenceId =
          await createOccurrence(
            'Later earning',
            '2030-01-18',
            125,
            'approved',
            laterWeekAt,
          );

        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId,

            occurrenceId:
              secondEarningOccurrenceId,

            kind:
              'earning',

            amountSek:
              125,

            createdAt:
              laterWeekAt,
          },
        );

        const recovered =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        assert(
          recovered.balanceSek ===
            25 &&
          recovered.earningTotalSek ===
            165 &&
          recovered.penaltyTotalSek ===
            -140 &&
          recovered.entryCount ===
            3,
          'Later earnings must offset carried debt before producing a positive balance.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/5 later earnings offset carried debt before becoming positive',
        );

        /*
         * 5. Sibling money must never enter
         * this Child's Running Balance.
         */
        const siblingOccurrenceId =
          await createOccurrence(
            'Sibling earning',
            '2030-01-19',
            999,
            'approved',
            laterWeekAt +
              24 *
                60 *
                60 *
                1000,
          );

        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId:
              siblingId,

            occurrenceId:
              siblingOccurrenceId,

            kind:
              'earning',

            amountSek:
              999,

            createdAt:
              laterWeekAt +
              24 *
                60 *
                60 *
                1000,
          },
        );

        const isolated =
          await calculateRunningBalanceForChild(
            ctx,
            childId,
          );

        const sibling =
          await calculateRunningBalanceForChild(
            ctx,
            siblingId,
          );

        assert(
          isolated.balanceSek ===
            25 &&
          isolated.entryCount ===
            3 &&
          sibling.balanceSek ===
            999 &&
          sibling.entryCount ===
            1,
          'Running Balance must be isolated to exactly one Child.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/5 sibling Ledger Entries cannot affect another Child balance',
        );

        return {
          passed,

          total:
            5,
        };
      } finally {
        const childEntries =
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
          childEntries
        ) {
          await ctx.db.delete(
            entry._id,
          );
        }

        const siblingEntries =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_child_created_at',
              (q) =>
                q.eq(
                  'childId',
                  siblingId,
                ),
            )
            .collect();

        for (
          const entry of
          siblingEntries
        ) {
          await ctx.db.delete(
            entry._id,
          );
        }

        for (
          const occurrenceId of
          occurrenceIds
        ) {
          const occurrence =
            await ctx.db.get(
              occurrenceId,
            );

          if (occurrence) {
            await ctx.db.delete(
              occurrenceId,
            );
          }
        }

        await ctx.db.delete(
          definitionId,
        );

        await ctx.db.delete(
          siblingId,
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
