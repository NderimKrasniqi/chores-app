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
  claimClaimableOccurrence,
} from '../../../lib/claims/claiming';
import {
  cancelClaimableClaimForParent,
} from '../../../lib/claims/cancellation';
import {
  submitClaimableClaim,
} from '../../../lib/claims/execution';
import {
  reconcileOccurrenceLifecycle,
} from '../../../lib/occurrences/lifecycle';

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

async function expectFailure(
  operation:
    () => Promise<unknown>,
  message:
    string,
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

      const availabilityStartsAt =
        Date.UTC(
          2030,
          0,
          16,
          9,
          0,
          0,
        );

      /*
       * 2030-01-16 18:00 Stockholm =
       * 17:00 UTC.
       */
      const deadlineAt =
        Date.UTC(
          2030,
          0,
          16,
          17,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK14 cancellation boundary',

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
              'TASK14 Cancellation Child',

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
              'TASK14 cancellation fixture',

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

        const claim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            occurrenceId,
            availabilityStartsAt +
              60_000,
            false,
          );

        claimIds.push(
          claim.claimId,
        );

        return {
          occurrenceId,

          claimId:
            claim.claimId,
        };
      }

      async function ledgerFor(
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
              q.eq(
                'occurrenceId',
                occurrenceId,
              ),
          )
          .collect();
      }

      try {
        let passed =
          0;

        /*
         * 1. Parent cancellation before
         * deadline remains penalty-free.
         */
        const before =
          await createClaimedOccurrence(
            'Cancel before deadline',
          );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          before.claimId,
          'task14-parent',
          deadlineAt -
            1,
        );

        const beforeClaim =
          await ctx.db.get(
            before.claimId,
          );

        const beforeOccurrence =
          await ctx.db.get(
            before.occurrenceId,
          );

        const beforeLedger =
          await ledgerFor(
            before.occurrenceId,
          );

        assert(
          beforeClaim?.state ===
            'cancelled' &&
          beforeOccurrence?.state ===
            'cancelled' &&
          beforeLedger.length ===
            0,
          'Parent cancellation before deadline must remain penalty-free.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/4 pre-deadline Parent cancellation remains penalty-free',
        );

        /*
         * 2. Exact deadline is still valid.
         */
        const exact =
          await createClaimedOccurrence(
            'Cancel at exact deadline',
          );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          exact.claimId,
          'task14-parent',
          deadlineAt,
        );

        const exactClaim =
          await ctx.db.get(
            exact.claimId,
          );

        const exactLedger =
          await ledgerFor(
            exact.occurrenceId,
          );

        assert(
          exactClaim?.state ===
            'cancelled' &&
          exactLedger.length ===
            0,
          'Parent cancellation at the exact original deadline must remain penalty-free.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/4 exact-deadline Parent cancellation remains valid',
        );

        /*
         * 3. Simulate delayed scheduled
         * reconciliation.
         *
         * Once deadline has been missed,
         * Parent cancellation cannot erase
         * the already-due consequence.
         */
        const overdue =
          await createClaimedOccurrence(
            'Overdue cancellation attempt',
          );

        await expectFailure(
          () =>
            cancelClaimableClaimForParent(
              ctx,
              householdId,
              overdue.claimId,
              'task14-parent',
              deadlineAt +
                1,
            ),
          'Overdue claimed commitment must reject Parent cancellation.',
        );

        const overdueBeforeReconcileClaim =
          await ctx.db.get(
            overdue.claimId,
          );

        const overdueBeforeReconcileOccurrence =
          await ctx.db.get(
            overdue.occurrenceId,
          );

        assert(
          overdueBeforeReconcileClaim?.state ===
            'claimed' &&
          overdueBeforeReconcileOccurrence?.state ===
            'available',
          'Rejected overdue cancellation must not rewrite lifecycle state.',
        );

        await reconcileOccurrenceLifecycle(
          ctx,
          overdue.occurrenceId,
          deadlineAt +
            1,
        );

        const overdueClaim =
          await ctx.db.get(
            overdue.claimId,
          );

        const overdueOccurrence =
          await ctx.db.get(
            overdue.occurrenceId,
          );

        const overdueLedger =
          await ledgerFor(
            overdue.occurrenceId,
          );

        assert(
          overdueClaim?.state ===
            'failed' &&
          overdueOccurrence?.state ===
            'failed' &&
          overdueLedger.length ===
            1 &&
          overdueLedger[0]
            .kind ===
            'penalty' &&
          overdueLedger[0]
            .amountSek ===
            -100 &&
          overdueLedger[0]
            .childId ===
            childId,
          'Rejected overdue cancellation must remain eligible for normal full-value failure reconciliation.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/4 overdue Parent cancellation cannot bypass failure penalty',
        );

        /*
         * 4. An on-time submitted Claim is
         * protected from deadline failure.
         *
         * Review delay must not prevent a
         * Parent from cancelling that still
         * unresolved submitted occurrence.
         */
        const submitted =
          await createClaimedOccurrence(
            'Submitted cancellation after deadline',
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

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          submitted.claimId,
          'task14-parent',
          deadlineAt +
            60_000,
        );

        const submittedClaim =
          await ctx.db.get(
            submitted.claimId,
          );

        const submittedOccurrence =
          await ctx.db.get(
            submitted.occurrenceId,
          );

        const submittedLedger =
          await ledgerFor(
            submitted.occurrenceId,
          );

        assert(
          submittedClaim?.state ===
            'cancelled' &&
          submittedOccurrence?.state ===
            'cancelled' &&
          submittedLedger.length ===
            0,
          'On-time submitted unresolved Claim must remain cancellable after deadline without penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/4 on-time submitted Claim remains cancellable after deadline',
        );

        return {
          passed,

          total:
            4,
        };
      } finally {
        for (
          const occurrenceId of
          occurrenceIds
        ) {
          const entries =
            await ledgerFor(
              occurrenceId,
            );

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
