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
  cancelClaimableClaimForParent,
} from '../../../lib/claimableChoreCancellation';
import {
  reconcileRedoDeadlineFailure,
} from '../../../lib/redoDeadlineFailure';
import {
  submitClaimableRedo,
} from '../../../lib/redoSubmission';

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

      const originalDeadlineAt =
        Date.UTC(
          2030,
          0,
          16,
          17,
          0,
          0,
        );

      const initialSubmittedAt =
        originalDeadlineAt -
        30 * 60 * 1000;

      const initialReviewAt =
        originalDeadlineAt +
        2 * 60 * 60 * 1000;

      /*
       * 2030-01-17 18:00 Stockholm.
       */
      const redoDeadlineAt =
        Date.UTC(
          2030,
          0,
          17,
          17,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK14 Redo cancellation boundary',

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
              'TASK14 Redo Child',

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
              'TASK14 Redo cancellation fixture',

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

      async function createRedoRequired(
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

              deadlineAt:
                originalDeadlineAt,

              eligibleChildIds:
                [
                  childId,
                ],

              isUnlockChore:
                false,

              state:
                'redo_required',

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
                'redo_required',

              claimedAt:
                availabilityStartsAt +
                60_000,
            },
          );

        claimIds.push(
          claimId,
        );

        const initialSubmissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId,

              childId,

              attemptNumber:
                1,

              submittedAt:
                initialSubmittedAt,
            },
          );

        const rejectionReviewId =
          await ctx.db.insert(
            'choreReviews',
            {
              householdId,

              occurrenceId,

              submissionId:
                initialSubmissionId,

              decision:
                'rejected',

              reviewedByAuthUserId:
                'task14-parent',

              reviewedAt:
                initialReviewAt,
            },
          );

        const redoId =
          await ctx.db.insert(
            'choreRedos',
            {
              householdId,

              occurrenceId,

              initialSubmissionId,

              rejectionReviewId,

              deadlineLocalDate:
                '2030-01-17',

              deadlineLocalTime:
                '18:00',

              deadlineAt:
                redoDeadlineAt,

              createdAt:
                initialReviewAt,
            },
          );

        return {
          occurrenceId,
          claimId,
          redoId,
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
         * 1. Before Redo deadline.
         */
        const before =
          await createRedoRequired(
            'Cancel Redo before deadline',
          );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          before.claimId,
          'task14-parent',
          redoDeadlineAt -
            1,
        );

        const beforeClaim =
          await ctx.db.get(
            before.claimId,
          );

        const beforeLedger =
          await ledgerFor(
            before.occurrenceId,
          );

        assert(
          beforeClaim?.state ===
            'cancelled' &&
          beforeLedger.length ===
            0,
          'Parent cancellation before Redo deadline must remain penalty-free.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/4 pre-deadline Redo cancellation remains penalty-free',
        );

        /*
         * 2. Exact Redo deadline.
         */
        const exact =
          await createRedoRequired(
            'Cancel Redo at deadline',
          );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          exact.claimId,
          'task14-parent',
          redoDeadlineAt,
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
          'Parent cancellation at the exact Redo deadline must remain valid.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/4 exact Redo deadline remains cancellable',
        );

        /*
         * 3. Simulate delayed scheduled
         * Redo failure reconciliation.
         */
        const overdue =
          await createRedoRequired(
            'Overdue Redo cancellation',
          );

        await expectFailure(
          () =>
            cancelClaimableClaimForParent(
              ctx,
              householdId,
              overdue.claimId,
              'task14-parent',
              redoDeadlineAt +
                1,
            ),
          'Overdue Redo must reject Parent cancellation.',
        );

        const beforeReconcileClaim =
          await ctx.db.get(
            overdue.claimId,
          );

        const beforeReconcileOccurrence =
          await ctx.db.get(
            overdue.occurrenceId,
          );

        assert(
          beforeReconcileClaim?.state ===
            'redo_required' &&
          beforeReconcileOccurrence?.state ===
            'redo_required',
          'Rejected overdue Redo cancellation must preserve unresolved state for reconciliation.',
        );

        await reconcileRedoDeadlineFailure(
          ctx,
          overdue.redoId,
          redoDeadlineAt +
            1,
        );

        const failedClaim =
          await ctx.db.get(
            overdue.claimId,
          );

        const failedOccurrence =
          await ctx.db.get(
            overdue.occurrenceId,
          );

        const failedLedger =
          await ledgerFor(
            overdue.occurrenceId,
          );

        assert(
          failedClaim?.state ===
            'failed' &&
          failedOccurrence?.state ===
            'failed' &&
          failedLedger.length ===
            1 &&
          failedLedger[0]
            .kind ===
            'penalty' &&
          failedLedger[0]
            .amountSek ===
            -100,
          'Overdue Redo must still reconcile to one full-value penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/4 overdue Redo cancellation cannot bypass penalty',
        );

        /*
         * 4. Attempt 2 submitted exactly at
         * Redo deadline is valid.
         *
         * Review delay therefore does not
         * prevent later penalty-free Parent
         * cancellation.
         */
        const submitted =
          await createRedoRequired(
            'Submitted Redo cancellation',
          );

        await submitClaimableRedo(
          ctx,
          householdId,
          childId,
          submitted.claimId,
          redoDeadlineAt,
        );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          submitted.claimId,
          'task14-parent',
          redoDeadlineAt +
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
          'On-time submitted Redo must remain cancellable after deadline without penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/4 on-time submitted Redo remains cancellable after deadline',
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

          const redos =
            await ctx.db
              .query(
                'choreRedos',
              )
              .withIndex(
                'by_occurrence',
                (q) =>
                  q.eq(
                    'occurrenceId',
                    occurrenceId,
                  ),
              )
              .collect();

          for (
            const redo of
            redos
          ) {
            await ctx.db.delete(
              redo._id,
            );
          }

          const reviews =
            await ctx.db
              .query(
                'choreReviews',
              )
              .withIndex(
                'by_occurrence',
                (q) =>
                  q.eq(
                    'occurrenceId',
                    occurrenceId,
                  ),
              )
              .collect();

          for (
            const review of
            reviews
          ) {
            await ctx.db.delete(
              review._id,
            );
          }

          const submissions =
            await ctx.db
              .query(
                'choreSubmissions',
              )
              .withIndex(
                'by_occurrence',
                (q) =>
                  q.eq(
                    'occurrenceId',
                    occurrenceId,
                  ),
              )
              .collect();

          for (
            const submission of
            submissions
          ) {
            await ctx.db.delete(
              submission._id,
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
