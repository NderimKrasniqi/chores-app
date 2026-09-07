import type {
  Id,
} from './_generated/dataModel';
import {
  mutation,
} from './_generated/server';
import { claimClaimableOccurrence } from './lib/claimableChoreClaiming';
import { resolveLocalDateTimeToEpochMs } from './lib/choreScheduling';

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
  mutation({
    args: {},

    handler: async (
      ctx,
    ) => {
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
              'TASK11 warning smoke',

            timezone:
              'Europe/Stockholm',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              1,

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
              'Warning Child',

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
              'TASK11 warning fixture',

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
          Id<'choreOccurrences'>
        > = [];

      const claimIds:
        Array<
          Id<'choreClaims'>
        > = [];

      async function createOccurrence(
        title: string,
        deadlineLocalTime:
          string,
      ) {
        const deadlineAt =
          resolveLocalDateTimeToEpochMs(
            '2030-01-16',
            deadlineLocalTime,
            'Europe/Stockholm',
          );

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

              valueSek:
                100,

              scheduledLocalDate:
                '2030-01-16',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime,

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                resolveLocalDateTimeToEpochMs(
                  '2030-01-16',
                  '10:00',
                  'Europe/Stockholm',
                ),

              deadlineAt,

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

        return occurrenceId;
      }

      try {
        let passed =
          0;

        const ordinaryOccurrence =
          await createOccurrence(
            'Ordinary Claim',
            '18:00',
          );

        const ordinaryClaim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            ordinaryOccurrence,
            now,
            false,
          );

        claimIds.push(
          ordinaryClaim.claimId,
        );

        assert(
          !ordinaryClaim
            .commitment
            .isImmediatelyLocked,
          'Ordinary Claim should not require immediate-lock warning.',
        );

        passed += 1;

        console.log(
          '✅ 1/5 ordinary Claim succeeds without locked acknowledgement',
        );

        await ctx.db.patch(
          ordinaryClaim.claimId,
          {
            state:
              'approved',
          },
        );

        const lockedByTimeOccurrence =
          await createOccurrence(
            'Locked by time',
            '13:00',
          );

        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childId,
              lockedByTimeOccurrence,
              now,
              false,
            ),
          'Time-locked Claim must require explicit acknowledgement.',
        );

        passed += 1;

        console.log(
          '✅ 2/5 time-locked Claim rejects missing acknowledgement',
        );

        const lockedByTimeClaim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            lockedByTimeOccurrence,
            now,
            true,
          );

        claimIds.push(
          lockedByTimeClaim.claimId,
        );

        assert(
          lockedByTimeClaim
            .commitment
            .isImmediatelyLocked &&
          lockedByTimeClaim
            .commitment
            .lockReason ===
            'time_window',
          'Acknowledged time-window Claim should be recorded as immediately locked.',
        );

        passed += 1;

        console.log(
          '✅ 3/5 acknowledged time-window Claim succeeds',
        );

        await ctx.db.patch(
          lockedByTimeClaim.claimId,
          {
            state:
              'approved',
          },
        );

        /*
         * Create one historical successful
         * unclaim in the current Payout Week
         * to exhaust the allowance.
         */
        const historicalOccurrence =
          await createOccurrence(
            'Historical unclaim',
            '18:00',
          );

        const historicalClaimId =
          await ctx.db.insert(
            'choreClaims',
            {
              householdId,

              occurrenceId:
                historicalOccurrence,

              childId,

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
            },
          );

        claimIds.push(
          historicalClaimId,
        );

        const allowanceLockedOccurrence =
          await createOccurrence(
            'Locked by allowance',
            '18:00',
          );

        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childId,
              allowanceLockedOccurrence,
              now,
              false,
            ),
          'Allowance-locked Claim must require explicit acknowledgement.',
        );

        passed += 1;

        console.log(
          '✅ 4/5 exhausted allowance requires locked acknowledgement',
        );

        const allowanceLockedClaim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            allowanceLockedOccurrence,
            now,
            true,
          );

        claimIds.push(
          allowanceLockedClaim.claimId,
        );

        assert(
          allowanceLockedClaim
            .commitment
            .isImmediatelyLocked &&
          allowanceLockedClaim
            .commitment
            .lockReason ===
            'allowance_exhausted',
          'Allowance-exhausted Claim should identify its lock reason.',
        );

        passed += 1;

        console.log(
          '✅ 5/5 acknowledged allowance-locked Claim still succeeds',
        );

        return {
          passed,

          total:
            5,
        };
      } finally {
        for (
          const claimId of
          claimIds
        ) {
          const claim =
            await ctx.db.get(
              claimId,
            );

          if (claim) {
            await ctx.db.delete(
              claimId,
            );
          }
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
          childId,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
