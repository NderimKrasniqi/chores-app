import {
  internalMutation,
} from '../../../_generated/server';
import { getWeeklyUnclaimUsageForChild } from '../../../lib/claims/unclaimAccounting';
import { resolveLocalDateTimeToEpochMs } from '../../../lib/scheduling/choreScheduling';

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

export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      /*
       * Wednesday 2030-01-16.
       *
       * Friday payout means:
       *
       * current week:
       * 2030-01-11 00:00
       * through
       * 2030-01-18 00:00
       */
      const now =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '12:00',
          'Europe/Stockholm',
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK11 accounting smoke',

            timezone:
              'Europe/Stockholm',

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
              'Accounting Child',

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
              'claimable',

            title:
              'Accounting fixture',

            valueSek:
              100,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-16',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            eligibleChildIds:
              [
                childId,
              ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task11-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const occurrenceIds:
        Array<
          import('../../../_generated/dataModel').Id<'choreOccurrences'>
        > = [];

      const claimIds:
        Array<
          import('../../../_generated/dataModel').Id<'choreClaims'>
        > = [];

      async function createClaim({
        state,
        claimedAt,
        unclaimedAt,
        cancelledAt,
      }: {
        state:
          | 'claimed'
          | 'unclaimed'
          | 'cancelled';

        claimedAt:
          number;

        unclaimedAt?:
          number;

        cancelledAt?:
          number;
      }) {
        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'claimable',

              title:
                'Accounting fixture',

              valueSek:
                100,

              scheduledLocalDate:
                '2030-01-16',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now -
                60 *
                  60 *
                  1000,

              deadlineAt:
                now +
                6 *
                  60 *
                  60 *
                  1000,

              eligibleChildIds:
                [
                  childId,
                ],

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                now,
            },
          );

        occurrenceIds.push(
          occurrenceId,
        );

        const claimId =
          await ctx.db.insert(
            'choreClaims',
            {
              householdId,

              occurrenceId,

              childId,

              state,

              claimedAt,

              unclaimedAt,

              cancelledAt,

              cancelledByAuthUserId:
                cancelledAt !==
                undefined
                  ? 'task11-parent'
                  : undefined,
            },
          );

        claimIds.push(
          claimId,
        );
      }

      try {
        let passed =
          0;

        const household =
          await ctx.db.get(
            householdId,
          );

        assert(
          household,
          'Household fixture missing.',
        );

        const initial =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          initial.usedUnclaims ===
            0,
          'Fresh week should have zero used unclaims.',
        );

        assert(
          initial.remainingUnclaims ===
            2,
          'Fresh week should retain full allowance.',
        );

        passed += 1;

        console.log(
          '✅ 1/8 fresh payout week has full allowance',
        );

        await createClaim({
          state:
            'unclaimed',

          claimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-10',
              '10:00',
              'Europe/Stockholm',
            ),

          unclaimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-10',
              '11:00',
              'Europe/Stockholm',
            ),
        });

        const afterPreviousWeek =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          afterPreviousWeek.usedUnclaims ===
            0,
          'Previous payout-week unclaim must not count.',
        );

        passed += 1;

        console.log(
          '✅ 2/8 previous payout-week unclaim is excluded',
        );

        await createClaim({
          state:
            'unclaimed',

          claimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-12',
              '10:00',
              'Europe/Stockholm',
            ),

          unclaimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-12',
              '11:00',
              'Europe/Stockholm',
            ),
        });

        const afterOne =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          afterOne.usedUnclaims ===
            1 &&
          afterOne.remainingUnclaims ===
            1,
          'One successful current-week unclaim should consume one allowance.',
        );

        passed += 1;

        console.log(
          '✅ 3/8 successful Child unclaim consumes one allowance',
        );

        await createClaim({
          state:
            'cancelled',

          claimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-13',
              '10:00',
              'Europe/Stockholm',
            ),

          cancelledAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-13',
              '11:00',
              'Europe/Stockholm',
            ),
        });

        const afterCancellation =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          afterCancellation.usedUnclaims ===
            1,
          'Parent cancellation must not consume Child allowance.',
        );

        passed += 1;

        console.log(
          '✅ 4/8 Parent cancellation does not consume allowance',
        );

        await createClaim({
          state:
            'claimed',

          claimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-14',
              '10:00',
              'Europe/Stockholm',
            ),
        });

        const afterActive =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          afterActive.usedUnclaims ===
            1,
          'Active Claim must not consume unclaim allowance.',
        );

        passed += 1;

        console.log(
          '✅ 5/8 active Claim does not consume allowance',
        );

        await createClaim({
          state:
            'unclaimed',

          claimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-15',
              '10:00',
              'Europe/Stockholm',
            ),

          unclaimedAt:
            resolveLocalDateTimeToEpochMs(
              '2030-01-15',
              '11:00',
              'Europe/Stockholm',
            ),
        });

        const exhausted =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now,
          );

        assert(
          exhausted.usedUnclaims ===
            2,
          'Two successful current-week unclaims should be counted.',
        );

        assert(
          exhausted.remainingUnclaims ===
            0,
          'Allowance should be exhausted.',
        );

        assert(
          !exhausted.hasUnclaimAllowance,
          'Exhausted allowance must remove unclaim rights.',
        );

        passed += 1;

        console.log(
          '✅ 6/8 weekly allowance exhausts at configured limit',
        );

        const nextWeek =
          resolveLocalDateTimeToEpochMs(
            '2030-01-18',
            '00:00',
            'Europe/Stockholm',
          );

        const reset =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            nextWeek,
          );

        assert(
          reset.usedUnclaims ===
            0,
          'New payout week should not inherit prior usage.',
        );

        assert(
          reset.remainingUnclaims ===
            2,
          'New payout week should restore full allowance.',
        );

        passed += 1;

        console.log(
          '✅ 7/8 exact payout boundary resets weekly usage',
        );

        assert(
          exhausted.payoutWeek.startLocalDate ===
            '2030-01-11' &&
          exhausted.payoutWeek.endLocalDate ===
            '2030-01-18',
          'Usage must be attached to the resolved Household-local payout week.',
        );

        passed += 1;

        console.log(
          '✅ 8/8 usage is attached to authoritative payout-week window',
        );

        return {
          passed,

          total:
            8,
        };
      } finally {
        for (
          const claimId of
          claimIds
        ) {
          await ctx.db.delete(
            claimId,
          );
        }

        for (
          const occurrenceId of
          occurrenceIds
        ) {
          await ctx.db.delete(
            occurrenceId,
          );
        }

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
