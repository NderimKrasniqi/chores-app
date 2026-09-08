import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  runOccurrenceMaintenance,
} from '../../../lib/occurrences/maintenance';

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
      const deadlineAt =
        Date.UTC(
          2030,
          0,
          4,
          17,
          0,
          0,
        );

      const availabilityStartsAt =
        deadlineAt -
        6 *
          60 *
          60 *
          1000;

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK14 maintenance fixture',

            timezone:
              'Europe/Stockholm',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              availabilityStartsAt,

            updatedAt:
              availabilityStartsAt,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK14 Maintenance Child',

            createdAt:
              availabilityStartsAt,

            updatedAt:
              availabilityStartsAt,
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
              'TASK14 maintenance Claimable',

            valueSek:
              60,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-04',
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
              'task14-smoke',

            createdAt:
              availabilityStartsAt,

            updatedAt:
              availabilityStartsAt,
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
              'TASK14 maintenance Claimable',

            valueSek:
              60,

            scheduledLocalDate:
              '2030-01-04',

            timezone:
              'Europe/Stockholm',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt,

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
              availabilityStartsAt,
          },
        );

      const claimId =
        await ctx.db.insert(
          'choreClaims',
          {
            householdId,

            occurrenceId,

            childId,

            state:
              'claimed',

            claimedAt:
              availabilityStartsAt +
              60_000,
          },
        );

      try {
        let passed =
          0;

        /*
         * Simulate an exact scheduled
         * callback that did not run.
         *
         * Maintenance runs later and must
         * resolve the same authoritative
         * lifecycle.
         */
        const result =
          await runOccurrenceMaintenance(
            ctx,
            {
              now:
                deadlineAt +
                1,

              horizonDays:
                0,

              scheduleTransitions:
                false,

              householdIds:
                [
                  householdId,
                ],
            },
          );

        const occurrence =
          await ctx.db.get(
            occurrenceId,
          );

        const claim =
          await ctx.db.get(
            claimId,
          );

        const penalties =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_occurrence_kind',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    occurrenceId,
                  )
                  .eq(
                    'kind',
                    'penalty',
                  ),
            )
            .collect();

        assert(
          occurrence?.state ===
            'failed' &&
          claim?.state ===
            'failed',
          'Maintenance must fail an overdue active Claim and occurrence.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/3 maintenance resolves overdue claimed lifecycle',
        );

        assert(
          penalties.length ===
            1 &&
          penalties[0]
            .childId ===
            childId &&
          penalties[0]
            .amountSek ===
            -60,
          'Maintenance must create exactly one full-value Claim penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/3 maintenance creates full-value penalty',
        );

        /*
         * The maintenance count should
         * reflect this Claimable deadline
         * transition.
         */
        assert(
          result
            .claimableDeadlineReconciledCount >=
            1,
          'Maintenance must report the Claimable deadline reconciliation.',
        );

        /*
         * A second pass must be harmless.
         */
        await runOccurrenceMaintenance(
          ctx,
          {
            now:
              deadlineAt +
              2,

            horizonDays:
              0,

            scheduleTransitions:
              false,

            householdIds:
              [
                householdId,
              ],
          },
        );

        const penaltiesAfterRetry =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_occurrence_kind',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    occurrenceId,
                  )
                  .eq(
                    'kind',
                    'penalty',
                  ),
            )
            .collect();

        assert(
          penaltiesAfterRetry.length ===
            1,
          'Repeated maintenance must not duplicate the penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/3 repeated maintenance cannot double-charge',
        );

        return {
          passed,

          total:
            3,
        };
      } finally {
        const entries =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .withIndex(
              'by_occurrence_kind',
              (q) =>
                q.eq(
                  'occurrenceId',
                  occurrenceId,
                ),
            )
            .collect();

        for (
          const entry of
          entries
        ) {
          await ctx.db.delete(
            entry._id,
          );
        }

        await ctx.db.delete(
          claimId,
        );

        await ctx.db.delete(
          occurrenceId,
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
