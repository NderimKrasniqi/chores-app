import type {
  Id,
} from './_generated/dataModel';
import {
  mutation,
} from './_generated/server';
import { claimClaimableOccurrence } from './lib/claimableChoreClaiming';
import { unclaimClaimableClaim } from './lib/claimableChoreUnclaiming';
import { getWeeklyUnclaimUsageForChild } from './lib/claimUnclaimAccounting';
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

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          'Europe/Stockholm',
        );

      const lockAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '16:00',
          'Europe/Stockholm',
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK11 unclaim smoke',

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

      const childA =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child A',

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
              'Child B',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childC =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child C',

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
              'TASK11 unclaim fixture',

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
                childA,
                childB,
                childC,
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
                resolveLocalDateTimeToEpochMs(
                  '2030-01-16',
                  '10:00',
                  'Europe/Stockholm',
                ),

              deadlineAt,

              eligibleChildIds:
                [
                  childA,
                  childB,
                  childC,
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

      async function claim(
        childId:
          Id<'children'>,
        occurrenceId:
          Id<'choreOccurrences'>,
        at = now,
        acceptImmediateLock =
          false,
      ) {
        const result =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            occurrenceId,
            at,
            acceptImmediateLock,
          );

        claimIds.push(
          result.claimId,
        );

        return result;
      }

      try {
        let passed =
          0;

        const firstOccurrence =
          await createOccurrence(
            'First unclaim',
          );

        const firstClaim =
          await claim(
            childA,
            firstOccurrence,
          );

        const firstUnclaim =
          await unclaimClaimableClaim(
            ctx,
            householdId,
            childA,
            firstClaim.claimId,
            now,
          );

        const persistedFirst =
          await ctx.db.get(
            firstClaim.claimId,
          );

        assert(
          persistedFirst?.state ===
            'unclaimed',
          'Successful unclaim must persist terminal unclaimed state.',
        );

        assert(
          persistedFirst.unclaimedAt ===
            now,
          'Successful unclaim must persist authoritative unclaimedAt.',
        );

        assert(
          firstUnclaim.remainingUnclaims ===
            1,
          'Successful first unclaim should leave one weekly unclaim.',
        );

        passed += 1;

        console.log(
          '✅ 1/10 valid pre-lock Child unclaim succeeds durably',
        );

        const household =
          await ctx.db.get(
            householdId,
          );

        assert(
          household,
          'Household fixture missing.',
        );

        const usageAfterFirst =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childA,
            now,
          );

        assert(
          usageAfterFirst.usedUnclaims ===
            1,
          'Successful unclaim must consume exactly one weekly allowance.',
        );

        passed += 1;

        console.log(
          '✅ 2/10 successful unclaim consumes weekly allowance',
        );

        const secondOwner =
          await claim(
            childB,
            firstOccurrence,
          );

        const claimsForFirstOccurrence =
          await ctx.db
            .query(
              'choreClaims',
            )
            .withIndex(
              'by_occurrence',
              (q) =>
                q.eq(
                  'occurrenceId',
                  firstOccurrence,
                ),
            )
            .collect();

        assert(
          secondOwner.childId ===
            childB,
          'Another eligible Child should be able to claim after unclaim.',
        );

        assert(
          claimsForFirstOccurrence.length ===
            2,
          'Reclaim must preserve the earlier Claim history.',
        );

        assert(
          claimsForFirstOccurrence.some(
            (item) =>
              item.state ===
              'unclaimed',
          ),
          'Historical unclaimed Claim must remain durable.',
        );

        passed += 1;

        console.log(
          '✅ 3/10 unclaimed occurrence can be reclaimed while history is preserved',
        );

        const lockedOccurrence =
          await createOccurrence(
            'Exact lock',
          );

        const lockedClaim =
          await claim(
            childA,
            lockedOccurrence,
          );

        await expectFailure(
          () =>
            unclaimClaimableClaim(
              ctx,
              householdId,
              childA,
              lockedClaim.claimId,
              lockAt,
            ),
          'Exact two-hour lock boundary must reject unclaim.',
        );

        const persistedLocked =
          await ctx.db.get(
            lockedClaim.claimId,
          );

        assert(
          persistedLocked?.state ===
            'claimed',
          'Rejected locked unclaim must leave Claim active.',
        );

        passed += 1;

        console.log(
          '✅ 4/10 exact two-hour boundary rejects unclaim atomically',
        );

        /*
         * Release this synthetic active slot
         * without consuming unclaim allowance.
         */
        await ctx.db.patch(
          lockedClaim.claimId,
          {
            state:
              'cancelled',
          },
        );

        const beforeLockOccurrence =
          await createOccurrence(
            'Before lock',
          );

        const beforeLockClaim =
          await claim(
            childA,
            beforeLockOccurrence,
          );

        await unclaimClaimableClaim(
          ctx,
          householdId,
          childA,
          beforeLockClaim.claimId,
          lockAt - 1,
        );

        const persistedBeforeLock =
          await ctx.db.get(
            beforeLockClaim.claimId,
          );

        assert(
          persistedBeforeLock?.state ===
            'unclaimed',
          'One millisecond before lock must still permit unclaim.',
        );

        passed += 1;

        console.log(
          '✅ 5/10 one millisecond before lock still permits unclaim',
        );

        const exhaustedUsage =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childA,
            lockAt - 1,
          );

        assert(
          exhaustedUsage.usedUnclaims ===
            2 &&
          exhaustedUsage.remainingUnclaims ===
            0,
          'Two successful unclaims must exhaust allowance.',
        );

        passed += 1;

        console.log(
          '✅ 6/10 configured weekly allowance is exhausted after two unclaims',
        );

        const exhaustedOccurrence =
          await createOccurrence(
            'Exhausted allowance',
          );

        const exhaustedClaim =
          await claim(
            childA,
            exhaustedOccurrence,
            now,
            true,
          );

        assert(
          exhaustedClaim.state ===
            'claimed',
          'Allowance exhaustion must not prevent a new Claim.',
        );

        passed += 1;

        console.log(
          '✅ 7/10 exhausted unclaim allowance does not prevent claiming',
        );

        await expectFailure(
          () =>
            unclaimClaimableClaim(
              ctx,
              householdId,
              childA,
              exhaustedClaim.claimId,
              now,
            ),
          'Exhausted weekly allowance must reject unclaim.',
        );

        const persistedExhausted =
          await ctx.db.get(
            exhaustedClaim.claimId,
          );

        assert(
          persistedExhausted?.state ===
            'claimed' &&
          persistedExhausted.unclaimedAt ===
            undefined,
          'Rejected exhausted unclaim must not mutate the Claim.',
        );

        passed += 1;

        console.log(
          '✅ 8/10 exhausted allowance rejects unclaim without mutation',
        );

        await expectFailure(
          () =>
            unclaimClaimableClaim(
              ctx,
              householdId,
              childC,
              exhaustedClaim.claimId,
              now,
            ),
          'Another Child must not unclaim someone else’s Claim.',
        );

        passed += 1;

        console.log(
          '✅ 9/10 another Child cannot unclaim the owner’s Claim',
        );

        await ctx.db.patch(
          exhaustedClaim.claimId,
          {
            state:
              'submitted',
          },
        );

        await expectFailure(
          () =>
            unclaimClaimableClaim(
              ctx,
              householdId,
              childA,
              exhaustedClaim.claimId,
              now,
            ),
          'Submitted Claim must not be voluntarily unclaimed.',
        );

        const persistedSubmitted =
          await ctx.db.get(
            exhaustedClaim.claimId,
          );

        assert(
          persistedSubmitted?.state ===
            'submitted',
          'Rejected submitted unclaim must preserve submission state.',
        );

        passed += 1;

        console.log(
          '✅ 10/10 submitted Claim cannot be unclaimed',
        );

        return {
          passed,

          total:
            10,
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
          childA,
        );

        await ctx.db.delete(
          childB,
        );

        await ctx.db.delete(
          childC,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
