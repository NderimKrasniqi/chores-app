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
  listHouseholdApprovalActivity,
} from '../../../lib/activity/approvalActivity';

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
          v.boolean(),

        activityCount:
          v.number(),
      }),

    handler: async (
      ctx,
    ) => {
      const now =
        1_893_456_000_000;

      const timezone =
        'Europe/Stockholm';

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK17 activity smoke',

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
              'Alex',

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
              'Sam',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const definitionIds:
        Id<'choreDefinitions'>[] =
        [];

      const occurrenceIds:
        Id<'choreOccurrences'>[] =
        [];

      const submissionIds:
        Id<'choreSubmissions'>[] =
        [];

      const reviewIds:
        Id<'choreReviews'>[] =
        [];

      const ledgerIds:
        Id<'ledgerEntries'>[] =
        [];

      async function createReviewedPersonal({
        childId,
        title,
        valueSek,
        scheduledDate,
        reviewedAt,
        decision,
      }: {
        childId:
          Id<'children'>;

        title:
          string;

        valueSek:
          number;

        scheduledDate:
          string;

        reviewedAt:
          number;

        decision:
          'approved' |
          'rejected';
      }) {
        const definitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'personal',

              title,

              valueSek,

              recurrence: {
                kind:
                  'one_off',

                scheduledDate,
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
                'task17-parent',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        definitionIds.push(
          definitionId,
        );

        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title,

              valueSek,

              scheduledLocalDate:
                scheduledDate,

              timezone,

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now -
                60_000,

              deadlineAt:
                now +
                3_600_000,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                decision ===
                'approved'
                  ? 'approved'
                  : 'redo_required',

              createdAt:
                now,
            },
          );

        occurrenceIds.push(
          occurrenceId,
        );

        const submissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId,

              childId,

              attemptNumber:
                1,

              submittedAt:
                now,
            },
          );

        submissionIds.push(
          submissionId,
        );

        const reviewId =
          await ctx.db.insert(
            'choreReviews',
            {
              householdId,

              occurrenceId,

              submissionId,

              decision,

              reviewedByAuthUserId:
                'task17-parent',

              reviewedAt,
            },
          );

        reviewIds.push(
          reviewId,
        );

        if (
          decision ===
          'approved'
        ) {
          const ledgerId =
            await ctx.db.insert(
              'ledgerEntries',
              {
                householdId,

                childId,

                occurrenceId,

                reviewId,

                kind:
                  'earning',

                amountSek:
                  valueSek,

                createdAt:
                  reviewedAt,
              },
            );

          ledgerIds.push(
            ledgerId,
          );
        }

        return {
          definitionId,
          occurrenceId,
          reviewId,
        };
      }

      const first =
        await createReviewedPersonal({
          childId:
            childA,

          title:
            'Load dishwasher',

          valueSek:
            60,

          scheduledDate:
            '2030-01-15',

          reviewedAt:
            now +
            100,

          decision:
            'approved',
        });

      const second =
        await createReviewedPersonal({
          childId:
            childB,

          title:
            'Vacuum living room',

          valueSek:
            90,

          scheduledDate:
            '2030-01-16',

          reviewedAt:
            now +
            200,

          decision:
            'approved',
        });

      const rejected =
        await createReviewedPersonal({
          childId:
            childB,

          title:
            'Rejected private outcome',

          valueSek:
            45,

          scheduledDate:
            '2030-01-17',

          reviewedAt:
            now +
            300,

          decision:
            'rejected',
        });

      /*
       * Detailed financial history must not
       * leak into sibling shared activity.
       */
      const penaltyId =
        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId:
              childB,

            occurrenceId:
              rejected
                .occurrenceId,

            kind:
              'penalty',

            amountSek:
              -777,

            createdAt:
              now +
              301,
          },
        );

      ledgerIds.push(
        penaltyId,
      );

      /*
       * Historical activity must continue
       * using the immutable occurrence snapshot
       * rather than the edited definition.
       */
      await ctx.db.patch(
        second.definitionId,
        {
          title:
            'Renamed future definition',

          valueSek:
            999,
        },
      );

      const activity =
        await listHouseholdApprovalActivity(
          ctx,
          householdId,
        );

      assert(
        activity.length ===
          2,
        'Shared activity must contain approved chores only.',
      );

      assert(
        activity[0]
          .childId ===
          childB,
        'Newest approved household activity should be first.',
      );

      assert(
        activity[0]
          .choreTitle ===
          'Vacuum living room',
        'Activity must use the immutable occurrence title snapshot.',
      );

      assert(
        activity[0]
          .valueSek ===
          90,
        'Activity must use the approved occurrence value, not an edited definition value.',
      );

      assert(
        activity[1]
          .childId ===
          childA,
        'Sibling approved achievement should remain visible in shared household activity.',
      );

      assert(
        activity.every(
          (
            item,
          ) =>
            item.valueSek >
            0,
        ),
        'Penalty amounts must not appear in shared approval activity.',
      );

      const allowedKeys =
        [
          'activityId',
          'approvedAt',
          'childDisplayName',
          'childId',
          'choreKind',
          'choreTitle',
          'valueSek',
        ]
          .sort()
          .join(
            '|',
          );

      for (
        const item
        of activity
      ) {
        const actualKeys =
          Object.keys(
            item,
          )
            .sort()
            .join(
              '|',
            );

        assert(
          actualKeys ===
            allowedKeys,
          'Shared Child activity exposed fields outside the approved social projection.',
        );
      }

      for (
        const ledgerId
        of ledgerIds
      ) {
        await ctx.db.delete(
          ledgerId,
        );
      }

      for (
        const reviewId
        of reviewIds
      ) {
        await ctx.db.delete(
          reviewId,
        );
      }

      for (
        const submissionId
        of submissionIds
      ) {
        await ctx.db.delete(
          submissionId,
        );
      }

      for (
        const occurrenceId
        of occurrenceIds
      ) {
        await ctx.db.delete(
          occurrenceId,
        );
      }

      for (
        const definitionId
        of definitionIds
      ) {
        await ctx.db.delete(
          definitionId,
        );
      }

      await ctx.db.delete(
        childA,
      );

      await ctx.db.delete(
        childB,
      );

      await ctx.db.delete(
        householdId,
      );

      /*
       * Keep references used so TypeScript
       * verifies the fixture objects above.
       */
      void first;

      return {
        passed:
          true,

        activityCount:
          activity.length,
      };
    },
  });
