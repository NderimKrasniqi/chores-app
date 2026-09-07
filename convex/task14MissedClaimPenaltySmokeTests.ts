import {
  v,
} from 'convex/values';

import type {
  Id,
} from './_generated/dataModel';
import {
  internalMutation,
} from './_generated/server';
import {
  submitClaimableClaim,
} from './lib/claimableChoreExecution';
import {
  listHouseholdClaimedOccurrences,
} from './lib/claimableChoreVisibility';
import {
  reconcileOccurrenceLifecycle,
} from './lib/choreOccurrenceLifecycle';

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
      const timezone =
        'Europe/Stockholm';

      /*
       * 2030-01-04 18:00
       * Europe/Stockholm =
       * 17:00 UTC.
       */
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
              'TASK14 missed Claim fixture',

            timezone,

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
              'TASK14 Deadline Child',

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
              'TASK14 deadline Claimable',

            valueSek:
              140,

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

      const occurrenceIds:
        Array<
          Id<'choreOccurrences'>
        > = [];

      const claimIds:
        Array<
          Id<'choreClaims'>
        > = [];

      const submissionIds:
        Array<
          Id<'choreSubmissions'>
        > = [];

      async function createClaimedOccurrence(
        title:
          string,
        valueSek =
          140,
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

              scheduledLocalDate:
                '2030-01-04',

              timezone,

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

              state:
                'claimed',

              claimedAt:
                availabilityStartsAt +
                60_000,
            },
          );

        claimIds.push(
          claimId,
        );

        return {
          occurrenceId,

          claimId,
        };
      }

      async function penaltiesFor(
        occurrenceId:
          Id<'choreOccurrences'>,
      ) {
        return await ctx.db
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
      }

      try {
        let passed =
          0;

        /*
         * 1. Exact deadline is still valid.
         */
        const exact =
          await createClaimedOccurrence(
            'Exact deadline Claim',
          );

        const exactResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            exact.occurrenceId,
            deadlineAt,
          );

        const exactOccurrence =
          await ctx.db.get(
            exact.occurrenceId,
          );

        const exactClaim =
          await ctx.db.get(
            exact.claimId,
          );

        const exactPenalties =
          await penaltiesFor(
            exact.occurrenceId,
          );

        assert(
          !exactResult.changed &&
          exactOccurrence?.state ===
            'available' &&
          exactClaim?.state ===
            'claimed' &&
          exactPenalties.length ===
            0,
          'Claim must remain submit-capable at the exact original deadline.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/6 exact deadline keeps Claim submit-capable',
        );

        /*
         * 2. First instant after deadline:
         *    commitment fails and charges
         *    the immutable full value.
         */
        const missedResult =
          await reconcileOccurrenceLifecycle(
            ctx,
            exact.occurrenceId,
            deadlineAt +
              1,
          );

        const failedOccurrence =
          await ctx.db.get(
            exact.occurrenceId,
          );

        const failedClaim =
          await ctx.db.get(
            exact.claimId,
          );

        const failedPenalties =
          await penaltiesFor(
            exact.occurrenceId,
          );

        assert(
          missedResult.changed &&
          failedOccurrence?.state ===
            'failed' &&
          failedClaim?.state ===
            'failed' &&
          failedPenalties.length ===
            1 &&
          failedPenalties[0]
            .amountSek ===
            -140 &&
          failedPenalties[0]
            .childId ===
            childId,
          'Missed claimed Claimable Chore must fail with one full-value penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/6 post-deadline missed Claim fails with full penalty',
        );

        /*
         * 3. Terminal reconciliation cannot
         *    create another financial fact.
         */
        const repeated =
          await reconcileOccurrenceLifecycle(
            ctx,
            exact.occurrenceId,
            deadlineAt +
              2,
          );

        const repeatedPenalties =
          await penaltiesFor(
            exact.occurrenceId,
          );

        assert(
          !repeated.changed &&
          repeatedPenalties.length ===
            1,
          'Repeated lifecycle reconciliation must not duplicate the penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/6 repeated lifecycle reconciliation is idempotent',
        );

        /*
         * 4. Failed ownership leaves the
         *    Child's active Claim set.
         */
        const activeAfterFailure =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          !activeAfterFailure.some(
            (item) =>
              item.claim._id ===
              exact.claimId,
          ),
          'Failed Claim must release the active Claim slot.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/6 failed Claim releases active Claim slot',
        );

        /*
         * 5. Submission exactly at deadline
         *    moves lifecycle away from the
         *    original deadline before the
         *    later reconciliation occurs.
         */
        const submitted =
          await createClaimedOccurrence(
            'Exact deadline submission',
            100,
          );

        const submission =
          await submitClaimableClaim(
            ctx,
            householdId,
            childId,
            submitted.claimId,
            deadlineAt,
          );

        submissionIds.push(
          submission.submissionId,
        );

        const afterSubmission =
          await reconcileOccurrenceLifecycle(
            ctx,
            submitted.occurrenceId,
            deadlineAt +
              1,
          );

        const submittedOccurrence =
          await ctx.db.get(
            submitted.occurrenceId,
          );

        const submittedClaim =
          await ctx.db.get(
            submitted.claimId,
          );

        const submittedPenalties =
          await penaltiesFor(
            submitted.occurrenceId,
          );

        assert(
          !afterSubmission.changed &&
          submittedOccurrence?.state ===
            'submitted' &&
          submittedClaim?.state ===
            'submitted' &&
          submittedPenalties.length ===
            0,
          'Exact-deadline submission must be protected from the later failure reconciliation.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/6 exact-deadline submission is protected from penalty',
        );

        /*
         * 6. Never-claimed occurrence keeps
         *    ordinary expired-unclaimed
         *    behavior and has no debt.
         */
        const unclaimedOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'claimable',

              title:
                'Never claimed',

              valueSek:
                80,

              scheduledLocalDate:
                '2030-01-04',

              timezone,

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

        occurrenceIds.push(
          unclaimedOccurrenceId,
        );

        const expiry =
          await reconcileOccurrenceLifecycle(
            ctx,
            unclaimedOccurrenceId,
            deadlineAt,
          );

        const expiredOccurrence =
          await ctx.db.get(
            unclaimedOccurrenceId,
          );

        const expiryPenalties =
          await penaltiesFor(
            unclaimedOccurrenceId,
          );

        assert(
          expiry.changed &&
          expiredOccurrence?.state ===
            'expired_unclaimed' &&
          expiryPenalties.length ===
            0,
          'Never-claimed occurrence must expire without a penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 6/6 ordinary unclaimed expiry remains penalty-free',
        );

        return {
          passed,

          total:
            6,
        };
      } finally {
        for (
          const occurrenceId of
          occurrenceIds
        ) {
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
        }

        for (
          const submissionId of
          submissionIds
        ) {
          const submission =
            await ctx.db.get(
              submissionId,
            );

          if (submission) {
            await ctx.db.delete(
              submissionId,
            );
          }
        }

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
