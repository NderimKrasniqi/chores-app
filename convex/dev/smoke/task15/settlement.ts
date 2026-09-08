import {
  internalMutation,
} from '../../../_generated/server';
import {
  getWeeklyUnclaimUsageForChild,
} from '../../../lib/claims/unclaimAccounting';
import {
  closePayoutPeriod,
  ensureCurrentPayoutPeriod,
} from '../../../lib/finance/payoutPeriods';
import {
  markPayoutPaid,
} from '../../../lib/finance/payoutSettlement';
import {
  calculateRunningBalanceForChild,
} from '../../../lib/finance/runningBalance';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/scheduling/choreScheduling';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

async function expectFailure(
  operation:
    () => Promise<unknown>,
  message: string,
) {
  try {
    await operation();
  } catch {
    return;
  }

  throw new Error(
    message,
  );
}

export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      const timezone =
        'Europe/Stockholm';

      const now =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '12:00',
          timezone,
        );

      const financialAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '12:00',
          timezone,
        );

      const unclaimedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '10:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK15 settlement smoke',

            timezone,

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

      const childA =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK15 Child A',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childB =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK15 Child B',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const personalDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK15 pending Personal',

            valueSek:
              100,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-17',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childA,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task15-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const claimableDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'claimable',

            title:
              'TASK15 claimable fixture',

            valueSek:
              50,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-17',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            eligibleChildIds: [
              childA,
              childB,
            ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task15-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '18:00',
          timezone,
        );

      const personalOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              personalDefinitionId,

            kind:
              'personal',

            title:
              'TASK15 pending Personal',

            valueSek:
              100,

            scheduledLocalDate:
              '2030-01-17',

            timezone,

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt,

            personalChildId:
              childA,

            isUnlockChore:
              false,

            state:
              'submitted',

            createdAt:
              now,
          },
        );

      const claimableOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'TASK15 claimable fixture',

            valueSek:
              50,

            scheduledLocalDate:
              '2030-01-17',

            timezone,

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt,

            eligibleChildIds: [
              childA,
              childB,
            ],

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      await ctx.db.insert(
        'choreClaims',
        {
          householdId,

          occurrenceId:
            claimableOccurrenceId,

          childId:
            childA,

          state:
            'unclaimed',

          claimedAt:
            now,

          unclaimedAt,
        },
      );

      await ctx.db.insert(
        'ledgerEntries',
        {
          householdId,

          childId:
            childA,

          occurrenceId:
            personalOccurrenceId,

          kind:
            'earning',

          amountSek:
            100,

          createdAt:
            financialAt,
        },
      );

      await ctx.db.insert(
        'ledgerEntries',
        {
          householdId,

          childId:
            childA,

          occurrenceId:
            claimableOccurrenceId,

          kind:
            'penalty',

          amountSek:
            -30,

          createdAt:
            financialAt,
        },
      );

      await ctx.db.insert(
        'ledgerEntries',
        {
          householdId,

          childId:
            childB,

          occurrenceId:
            claimableOccurrenceId,

          kind:
            'penalty',

          amountSek:
            -50,

          createdAt:
            financialAt,
        },
      );

      const firstPeriod =
        await ensureCurrentPayoutPeriod(
          ctx,
          householdId,
          now,
          {
            scheduleTransitions:
              false,
          },
        );

      assert(
        firstPeriod.payoutWeekday ===
          'friday',
        'Initial Payout Period must retain Friday.',
      );

      await ctx.db.patch(
        householdId,
        {
          payoutWeekday:
            'monday',

          updatedAt:
            financialAt,
        },
      );

      const householdBeforeClose =
        await ctx.db.get(
          householdId,
        );

      assert(
        householdBeforeClose,
        'Household missing.',
      );

      const usageBeforeClose =
        await getWeeklyUnclaimUsageForChild(
          ctx,
          householdBeforeClose,
          childA,
          financialAt,
        );

      assert(
        usageBeforeClose
          .usedUnclaims ===
          1,
        'Changing payout weekday must not reset the open period early.',
      );

      const closeFirst =
        await closePayoutPeriod(
          ctx,
          firstPeriod._id,
          firstPeriod.endAt,
          {
            scheduleTransitions:
              false,
          },
        );

      assert(
        closeFirst
          .nextPayoutPeriodId,
        'First period did not create next period.',
      );

      const firstPayoutA =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_period_child',
            (q) =>
              q
                .eq(
                  'payoutPeriodId',
                  firstPeriod._id,
                )
                .eq(
                  'childId',
                  childA,
                ),
          )
          .unique();

      const firstPayoutB =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_period_child',
            (q) =>
              q
                .eq(
                  'payoutPeriodId',
                  firstPeriod._id,
                )
                .eq(
                  'childId',
                  childB,
                ),
          )
          .unique();

      assert(
        firstPayoutA,
        'Child A first payout missing.',
      );

      assert(
        firstPayoutA.status ===
          'pending' &&
        firstPayoutA.amountDueSek ===
          70,
        'Child A should have a 70 kr pending payout.',
      );

      assert(
        firstPayoutA
          .pendingOutcomeCount ===
          1,
        'Submitted Personal work should remain a pending outcome.',
      );

      assert(
        firstPayoutB,
        'Child B first payout missing.',
      );

      assert(
        firstPayoutB.status ===
          'no_payment' &&
        firstPayoutB
          .balanceAtCloseSek ===
          -50,
        'Negative Child balance must carry with no payout.',
      );

      await expectFailure(
        () =>
          markPayoutPaid(
            ctx,
            firstPayoutB._id,
            'task15-parent',
            firstPeriod.endAt +
              1,
          ),
        'No-payment payout must not be markable as paid.',
      );

      await markPayoutPaid(
        ctx,
        firstPayoutA._id,
        'task15-parent',
        firstPeriod.endAt +
          1,
      );

      const balanceAfterPayment =
        await calculateRunningBalanceForChild(
          ctx,
          childA,
        );

      assert(
        balanceAfterPayment
          .balanceSek ===
          0,
        'Paid 70 kr payout should settle Child A running balance to zero.',
      );

      const nextPeriod =
        await ctx.db.get(
          closeFirst
            .nextPayoutPeriodId,
        );

      assert(
        nextPeriod,
        'Next Payout Period missing.',
      );

      assert(
        nextPeriod
          .payoutWeekday ===
          'monday',
        'New payout weekday must apply to the next period.',
      );

      assert(
        nextPeriod
          .endLocalDate ===
          '2030-01-21',
        'Friday-to-Monday transition period should close Monday.',
      );

      const usageAfterReset =
        await getWeeklyUnclaimUsageForChild(
          ctx,
          householdBeforeClose,
          childA,
          resolveLocalDateTimeToEpochMs(
            '2030-01-18',
            '12:00',
            timezone,
          ),
        );

      assert(
        usageAfterReset
          .usedUnclaims ===
          0,
        'Weekly unclaim usage must reset when the Payout Period closes.',
      );

      await ctx.db.patch(
        personalOccurrenceId,
        {
          state:
            'approved',
        },
      );

      const laterAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-19',
          '12:00',
          timezone,
        );

      await ctx.db.insert(
        'ledgerEntries',
        {
          householdId,

          childId:
            childA,

          occurrenceId:
            personalOccurrenceId,

          kind:
            'earning',

          amountSek:
            40,

          createdAt:
            laterAt,
        },
      );

      await ctx.db.insert(
        'ledgerEntries',
        {
          householdId,

          childId:
            childB,

          occurrenceId:
            claimableOccurrenceId,

          kind:
            'earning',

          amountSek:
            80,

          createdAt:
            laterAt,
        },
      );

      const closeSecond =
        await closePayoutPeriod(
          ctx,
          nextPeriod._id,
          nextPeriod.endAt,
          {
            scheduleTransitions:
              false,
          },
        );

      assert(
        closeSecond
          .nextPayoutPeriodId,
        'Second period did not create a successor.',
      );

      const secondPayoutA =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_period_child',
            (q) =>
              q
                .eq(
                  'payoutPeriodId',
                  nextPeriod._id,
                )
                .eq(
                  'childId',
                  childA,
                ),
          )
          .unique();

      const secondPayoutB =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_period_child',
            (q) =>
              q
                .eq(
                  'payoutPeriodId',
                  nextPeriod._id,
                )
                .eq(
                  'childId',
                  childB,
                ),
          )
          .unique();

      assert(
        secondPayoutA &&
        secondPayoutA.amountDueSek ===
          40,
        'Financial outcome after first cutoff must enter the next payout.',
      );

      assert(
        secondPayoutB &&
        secondPayoutB.amountDueSek ===
          30,
        'Negative 50 kr carry plus 80 kr earning must produce 30 kr payout.',
      );

      const payouts =
        await ctx.db
          .query(
            'payouts',
          )
          .withIndex(
            'by_household_created_at',
            (q) =>
              q.eq(
                'householdId',
                householdId,
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

      const ledgerEntries =
        await ctx.db
          .query(
            'ledgerEntries',
          )
          .withIndex(
            'by_household_created_at',
            (q) =>
              q.eq(
                'householdId',
                householdId,
              ),
          )
          .collect();

      for (
        const entry of
        ledgerEntries
      ) {
        await ctx.db.delete(
          entry._id,
        );
      }

      const claims =
        await ctx.db
          .query(
            'choreClaims',
          )
          .withIndex(
            'by_household_claimed_at',
            (q) =>
              q.eq(
                'householdId',
                householdId,
              ),
          )
          .collect();

      for (
        const claim of
        claims
      ) {
        await ctx.db.delete(
          claim._id,
        );
      }

      await ctx.db.delete(
        personalOccurrenceId,
      );

      await ctx.db.delete(
        claimableOccurrenceId,
      );

      await ctx.db.delete(
        personalDefinitionId,
      );

      await ctx.db.delete(
        claimableDefinitionId,
      );

      await ctx.db.delete(
        childA,
      );

      await ctx.db.delete(
        childB,
      );

      await ctx.db.delete(
        householdId,
      );

      return {
        passed:
          true,
      };
    },
  });
