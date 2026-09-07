import {
  mutation,
} from './_generated/server';
import {
  reconcileOccurrenceLifecycle,
} from './lib/choreOccurrenceLifecycle';

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (
    !condition
  ) {
    throw new Error(
      message,
    );
  }
}

export const run =
  mutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      const now =
        Date.UTC(
          2030,
          0,
          15,
          12,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK10 deadline smoke',

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
              'Deadline Child',

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
              'Deadline fixture',

            valueSek:
              100,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-15',
            },

            deadlineLocalTime:
              '13:00',

            deadlineDayOffset:
              0,

            eligibleChildIds:
              [
                childId,
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

      const commonOccurrence = {
        householdId,
        choreDefinitionId:
          definitionId,

        kind:
          'claimable' as const,

        valueSek:
          100,

        scheduledLocalDate:
          '2030-01-15',

        timezone:
          'Europe/Stockholm',

        deadlineLocalTime:
          '13:00',

        deadlineDayOffset:
          0,

        availabilityStartsAt:
          now -
          60 *
            60 *
            1000,

        deadlineAt:
          now,

        eligibleChildIds:
          [
            childId,
          ],

        isUnlockChore:
          false,

        state:
          'available' as const,

        createdAt:
          now,
      };

      const unclaimedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            ...commonOccurrence,

            title:
              'Unclaimed deadline fixture',
          },
        );

      const claimedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            ...commonOccurrence,

            title:
              'Claimed deadline fixture',
          },
        );

      const claimId =
        await ctx.db.insert(
          'choreClaims',
          {
            householdId,

            occurrenceId:
              claimedOccurrenceId,

            childId,

            state:
              'claimed',

            claimedAt:
              now -
              30 *
                60 *
                1000,
          },
        );

      try {
        const unclaimedResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            unclaimedOccurrenceId,
            now,
          );

        const unclaimedOccurrence =
          await ctx.db.get(
            unclaimedOccurrenceId,
          );

        assert(
          unclaimedResult.changed,
          'Unclaimed occurrence should transition at deadline.',
        );

        assert(
          unclaimedOccurrence?.state ===
            'expired_unclaimed',
          'Unclaimed occurrence should become expired_unclaimed.',
        );

        console.log(
          '✅ 1/2 unclaimed occurrence expires at deadline',
        );

        const claimedResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            claimedOccurrenceId,
            now,
          );

        const claimedOccurrence =
          await ctx.db.get(
            claimedOccurrenceId,
          );

        assert(
          !claimedResult.changed,
          'Claimed occurrence must not expire as unclaimed.',
        );

        assert(
          claimedOccurrence?.state ===
            'available',
          'Claimed occurrence must remain under Claim lifecycle.',
        );

        console.log(
          '✅ 2/2 active Claim prevents expired_unclaimed transition',
        );

        return {
          passed:
            2,
          total:
            2,
        };
      } finally {
        await ctx.db.delete(
          claimId,
        );

        await ctx.db.delete(
          unclaimedOccurrenceId,
        );

        await ctx.db.delete(
          claimedOccurrenceId,
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
