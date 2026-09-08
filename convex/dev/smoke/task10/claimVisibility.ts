import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import { claimClaimableOccurrence } from '../../../lib/claimableChoreClaiming';
import {
  listHouseholdClaimedOccurrences,
  listVisibleClaimableOccurrencesForChild,
} from '../../../lib/claimableChoreVisibility';

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
              'TASK-10 Visibility Smoke',

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

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'claimable',

            title:
              'Shared Claimable',

            valueSek:
              40,

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
            ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task10-visibility-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
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

            title:
              'Shared Claimable',

            valueSek:
              40,

            scheduledLocalDate:
              '2030-01-15',

            timezone:
              'UTC',

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

            eligibleChildIds: [
              childOneId,
              childTwoId,
            ],

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      /*
       * 1. Before claiming, both eligible
       * Children can see the occurrence.
       */
      const beforeChildOne =
        await listVisibleClaimableOccurrencesForChild(
          ctx,
          householdId,
          childOneId,
          now,
        );

      const beforeChildTwo =
        await listVisibleClaimableOccurrencesForChild(
          ctx,
          householdId,
          childTwoId,
          now,
        );

      results.push(
        result(
          'Available Claimable is visible to both eligible Children before claim',
          beforeChildOne
            .occurrences.length ===
            1 &&
            beforeChildTwo
              .occurrences.length ===
              1,
        ),
      );

      /*
       * 2. Child One claims it.
       */
      const claim =
        await claimClaimableOccurrence(
          ctx,
          householdId,
          childOneId,
          occurrenceId,
          now,
        );

      results.push(
        result(
          'Claim is created for Child One',
          claim.childId ===
            childOneId &&
            claim.occurrenceId ===
              occurrenceId &&
            claim.state ===
              'claimed',
        ),
      );

      /*
       * 3. Claimed occurrence must no
       * longer appear available to the
       * claiming Child.
       */
      const afterChildOne =
        await listVisibleClaimableOccurrencesForChild(
          ctx,
          householdId,
          childOneId,
          now,
        );

      results.push(
        result(
          'Claimed occurrence disappears from claimant available pool',
          afterChildOne
            .occurrences.length ===
            0,
        ),
      );

      /*
       * 4. It must also disappear from
       * siblings' available pool.
       */
      const afterChildTwo =
        await listVisibleClaimableOccurrencesForChild(
          ctx,
          householdId,
          childTwoId,
          now,
        );

      results.push(
        result(
          'Claimed occurrence disappears from sibling available pool',
          afterChildTwo
            .occurrences.length ===
            0,
        ),
      );

      /*
       * 5. Household-visible ownership
       * remains available.
       */
      const claimed =
        await listHouseholdClaimedOccurrences(
          ctx,
          householdId,
        );

      results.push(
        result(
          'Household can see who claimed the occurrence',
          claimed.length ===
            1 &&
            claimed[0]
              ?.claim._id ===
              claim.claimId &&
            claimed[0]
              ?.child._id ===
              childOneId &&
            claimed[0]
              ?.child
              .displayName ===
              'Child One',
          `${claimed.length} visible claim(s)`,
        ),
      );

      /*
       * 6. An unresolved submitted Claim
       * remains household-visible.
       */
      await ctx.db.patch(
        claim.claimId,
        {
          state:
            'submitted',
        },
      );

      const submittedVisible =
        await listHouseholdClaimedOccurrences(
          ctx,
          householdId,
        );

      results.push(
        result(
          'Submitted unresolved Claim remains household-visible',
          submittedVisible
            .length ===
            1 &&
            submittedVisible[0]
              ?.claim.state ===
              'submitted',
        ),
      );

      /*
       * 7. Terminal Claim leaves this
       * active claimed-by surface.
       */
      await ctx.db.patch(
        claim.claimId,
        {
          state:
            'approved',
        },
      );

      const approvedVisible =
        await listHouseholdClaimedOccurrences(
          ctx,
          householdId,
        );

      results.push(
        result(
          'Terminal approved Claim leaves active claimed-by surface',
          approvedVisible
            .length ===
            0,
        ),
      );

      /*
       * Cleanup.
       */
      await ctx.db.delete(
        claim.claimId,
      );

      await ctx.db.delete(
        occurrenceId,
      );

      await ctx.db.delete(
        definitionId,
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

      results.push(
        result(
          'Test data cleanup',
          true,
        ),
      );

      return results;
    },
  });
