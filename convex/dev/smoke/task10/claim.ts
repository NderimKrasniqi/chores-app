import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import { claimClaimableOccurrence } from '../../../lib/claims/claiming';

type SmokeTestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

function result(
  label: string,
  passed: boolean,
  detail?: string,
): SmokeTestResult {
  return {
    label,
    passed,

    ...(detail
      ? {
          detail,
        }
      : {}),
  };
}

async function expectFailure(
  action: () =>
    Promise<unknown>,
) {
  try {
    await action();

    return false;
  } catch {
    return true;
  }
}

export const run =
  internalMutation({
    args: {},

    handler: async (
      ctx,
    ): Promise<
      SmokeTestResult[]
    > => {
      if (
        process.env
          .APP_ENV ===
        'production'
      ) {
        throw new ConvexError(
          'Developer smoke tests are disabled in production.',
        );
      }

      const results:
        SmokeTestResult[] =
        [];

      const now =
        Date.UTC(
          2030,
          0,
          15,
          12,
          0,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK-10 Claim Smoke',

            timezone:
              'UTC',

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

      const otherHouseholdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK-10 Other Household',

            timezone:
              'UTC',

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

      const childOneId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child One',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childTwoId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child Two',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const lockedChildId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Locked Child',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const otherHouseholdChildId =
        await ctx.db.insert(
          'children',
          {
            householdId:
              otherHouseholdId,

            displayName:
              'Other Household Child',

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
              'TASK-10 Claimable',

            valueSek:
              50,

            recurrence: {
              kind:
                'daily',

              startDate:
                '2030-01-01',

              interval:
                1,
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            eligibleChildIds: [
              childOneId,
              childTwoId,
              lockedChildId,
            ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task10-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const unlockDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'Locked Child Unlock',

            valueSek:
              10,

            recurrence: {
              kind:
                'daily',

              startDate:
                '2030-01-01',

              interval:
                1,
            },

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            personalChildId:
              lockedChildId,

            isUnlockChore:
              true,

            createdByAuthUserId:
              'task10-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      /*
       * Locked Child has a current
       * unapproved Unlock occurrence.
       */
      const unlockOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              unlockDefinitionId,

            kind:
              'personal',

            title:
              'Locked Child Unlock',

            valueSek:
              10,

            scheduledLocalDate:
              '2030-01-15',

            timezone:
              'UTC',

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              60 *
                60 *
                1000,

            availabilityReachedAt:
              now -
              60 *
                60 *
                1000,

            deadlineAt:
              now +
              8 *
                60 *
                60 *
                1000,

            personalChildId:
              lockedChildId,

            isUnlockChore:
              true,

            state:
              'available',

            createdAt:
              now,
          },
        );

      async function createClaimableOccurrence(
        title: string,
        options: {
          state?:
            | 'scheduled'
            | 'available'
            | 'submitted'
            | 'redo_required'
            | 'approved'
            | 'missed'
            | 'failed'
            | 'cancelled'
            | 'expired_unclaimed';

          availabilityStartsAt?:
            number;

          deadlineAt?:
            number;

          eligibleChildIds?:
            typeof childOneId[];
        } = {},
      ) {
        return await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title,

            valueSek:
              50,

            scheduledLocalDate:
              '2030-01-15',

            timezone:
              'UTC',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              options
                .availabilityStartsAt ??
              now -
                60 *
                  60 *
                  1000,

            deadlineAt:
              options.deadlineAt ??
              now +
                6 *
                  60 *
                  60 *
                  1000,

            eligibleChildIds:
              options
                .eligibleChildIds ??
              [
                childOneId,
                childTwoId,
                lockedChildId,
              ],

            isUnlockChore:
              false,

            state:
              options.state ??
              'available',

            createdAt:
              now,
          },
        );
      }

      /*
       * 1. Eligible unlocked Child can
       * successfully claim.
       */
      const firstOccurrenceId =
        await createClaimableOccurrence(
          'First Claimable',
        );

      const firstClaim =
        await claimClaimableOccurrence(
          ctx,
          householdId,
          childOneId,
          firstOccurrenceId,
          now,
        );

      const storedFirstClaim =
        await ctx.db.get(
          firstClaim.claimId,
        );

      results.push(
        result(
          'Eligible unlocked Child can claim available Claimable Chore',
          storedFirstClaim
            ?.occurrenceId ===
            firstOccurrenceId &&
            storedFirstClaim
              .childId ===
              childOneId &&
            storedFirstClaim
              .state ===
              'claimed' &&
            storedFirstClaim
              .claimedAt ===
              now,
          JSON.stringify(
            storedFirstClaim,
          ),
        ),
      );

      /*
       * 2. A second Child cannot claim
       * the same occurrence.
       */
      const secondChildSameOccurrenceRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childTwoId,
              firstOccurrenceId,
              now,
            ),
        );

      const firstOccurrenceClaims =
        await ctx.db
          .query(
            'choreClaims',
          )
          .withIndex(
            'by_occurrence',
            (q) =>
              q.eq(
                'occurrenceId',
                firstOccurrenceId,
              ),
          )
          .collect();

      results.push(
        result(
          'Second Child cannot claim already claimed occurrence',
          secondChildSameOccurrenceRejected &&
            firstOccurrenceClaims
              .length ===
              1 &&
            firstOccurrenceClaims[0]
              ?.childId ===
              childOneId,
          `${firstOccurrenceClaims.length} claim(s)`,
        ),
      );

      /*
       * 3. Same Child cannot claim a
       * second occurrence while the first
       * Claim remains unresolved.
       */
      const secondOccurrenceId =
        await createClaimableOccurrence(
          'Second Claimable',
        );

      const secondActiveClaimRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childOneId,
              secondOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Child cannot own two unresolved Claims',
          secondActiveClaimRejected,
        ),
      );

      /*
       * Mark the first Claim terminal.
       *
       * TASK-12 will eventually perform
       * this lifecycle through approval.
       */
      await ctx.db.patch(
        firstClaim.claimId,
        {
          state:
            'approved',
        },
      );

      /*
       * 4. Terminal Claim releases the
       * active-Claim slot.
       */
      const secondClaim =
        await claimClaimableOccurrence(
          ctx,
          householdId,
          childOneId,
          secondOccurrenceId,
          now,
        );

      results.push(
        result(
          'Terminal Claim releases active-Claim slot',
          secondClaim.state ===
            'claimed' &&
            secondClaim
              .occurrenceId ===
              secondOccurrenceId,
        ),
      );

      /*
       * Child Two remains free for the
       * remaining validation cases.
       */

      /*
       * 5. Ineligible Child is rejected.
       */
      const ineligibleOccurrenceId =
        await createClaimableOccurrence(
          'Restricted Claimable',
          {
            eligibleChildIds: [
              childOneId,
            ],
          },
        );

      const ineligibleRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childTwoId,
              ineligibleOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Ineligible Child cannot claim',
          ineligibleRejected,
        ),
      );

      /*
       * 6. Future occurrence cannot be
       * claimed before availability.
       */
      const futureOccurrenceId =
        await createClaimableOccurrence(
          'Future Claimable',
          {
            state:
              'scheduled',

            availabilityStartsAt:
              now +
              60 *
                60 *
                1000,

            deadlineAt:
              now +
              7 *
                60 *
                60 *
                1000,
          },
        );

      const futureRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childTwoId,
              futureOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Future Claimable cannot be claimed before availability',
          futureRejected,
        ),
      );

      /*
       * 7. Claiming exactly at deadline
       * is rejected.
       */
      const deadlineOccurrenceId =
        await createClaimableOccurrence(
          'Deadline Claimable',
          {
            deadlineAt:
              now,
          },
        );

      const deadlineRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              childTwoId,
              deadlineOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Claimable cannot be claimed at deadline boundary',
          deadlineRejected,
        ),
      );

      /*
       * 8. Locked Child cannot claim even
       * when eligible and occurrence is
       * otherwise available.
       */
      const lockedOccurrenceId =
        await createClaimableOccurrence(
          'Locked Gate Claimable',
        );

      const lockedRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              householdId,
              lockedChildId,
              lockedOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Unapproved current Unlock blocks claiming',
          lockedRejected,
        ),
      );

      /*
       * 9. Parent approval of the current
       * Unlock immediately permits the
       * otherwise valid Claim.
       */
      await ctx.db.patch(
        unlockOccurrenceId,
        {
          state:
            'approved',
        },
      );

      const unlockedClaim =
        await claimClaimableOccurrence(
          ctx,
          householdId,
          lockedChildId,
          lockedOccurrenceId,
          now,
        );

      results.push(
        result(
          'Approved current Unlock permits claiming',
          unlockedClaim.state ===
            'claimed' &&
            unlockedClaim.childId ===
              lockedChildId,
        ),
      );

      /*
       * 10. Household boundary is
       * authoritative.
       *
       * Use a Child from another Household
       * while passing this Household as the
       * claimed occurrence boundary.
       */
      const crossHouseholdRejected =
        await expectFailure(
          () =>
            claimClaimableOccurrence(
              ctx,
              otherHouseholdId,
              otherHouseholdChildId,
              ineligibleOccurrenceId,
              now,
            ),
        );

      results.push(
        result(
          'Child cannot claim occurrence from another Household',
          crossHouseholdRejected,
        ),
      );

      /*
       * Cleanup Claims first.
       */
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

      /*
       * Cleanup occurrences.
       */
      const occurrences =
        await ctx.db
          .query(
            'choreOccurrences',
          )
          .withIndex(
            'by_household',
            (q) =>
              q.eq(
                'householdId',
                householdId,
              ),
          )
          .collect();

      for (
        const occurrence of
        occurrences
      ) {
        await ctx.db.delete(
          occurrence._id,
        );
      }

      await ctx.db.delete(
        unlockDefinitionId,
      );

      await ctx.db.delete(
        claimableDefinitionId,
      );

      await ctx.db.delete(
        lockedChildId,
      );

      await ctx.db.delete(
        childTwoId,
      );

      await ctx.db.delete(
        childOneId,
      );

      await ctx.db.delete(
        householdId,
      );

      await ctx.db.delete(
        otherHouseholdChildId,
      );

      await ctx.db.delete(
        otherHouseholdId,
      );

      results.push(
        result(
          'Test data cleanup',
          true,
        ),
      );

      return results;
    },
  });
