import type {
  Id,
} from './_generated/dataModel';
import {
  mutation,
} from './_generated/server';
import {
  rejectInitialSubmission,
} from './lib/initialChoreRejection';
import {
  listHouseholdClaimedOccurrences,
} from './lib/claimableChoreVisibility';
import {
  resolveLocalDateTimeToEpochMs,
} from './lib/choreScheduling';
import {
  reconcileRedoDeadlineFailure,
} from './lib/redoDeadlineFailure';
import {
  submitClaimableRedo,
} from './lib/redoSubmission';

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
  mutation({
    args: {},

    handler: async (
      ctx,
    ) => {
      const timezone =
        'Europe/Stockholm';

      const availabilityStartsAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '10:00',
          timezone,
        );

      const originalDeadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          timezone,
        );

      const initialSubmittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '17:30',
          timezone,
        );

      const initialReviewAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '20:00',
          timezone,
        );

      const redoDeadlineLocalDate =
        '2030-01-17';

      const redoDeadlineLocalTime =
        '18:00';

      const redoDeadlineAt =
        resolveLocalDateTimeToEpochMs(
          redoDeadlineLocalDate,
          redoDeadlineLocalTime,
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK13 Redo deadline failure',

            timezone,

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child A',

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
          },
        );

      const personalDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK13 Personal deadline fixture',

            valueSek:
              90,

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

            personalChildId:
              childId,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task13-smoke',

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
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
              'TASK13 Claimable deadline fixture',

            valueSek:
              140,

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
              'task13-smoke',

            createdAt:
              initialSubmittedAt,

            updatedAt:
              initialSubmittedAt,
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

      async function createPersonalRedo() {
        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                personalDefinitionId,

              kind:
                'personal',

              title:
                'Personal missed Redo',

              valueSek:
                90,

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

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'submitted',

              createdAt:
                initialSubmittedAt,
            },
          );

        occurrenceIds.push(
          occurrenceId,
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

        const rejection =
          await rejectInitialSubmission(
            ctx,
            initialSubmissionId,
            'task13-parent',
            'personal',
            redoDeadlineLocalDate,
            redoDeadlineLocalTime,
            initialReviewAt,
          );

        return {
          occurrenceId,

          redoId:
            rejection.redoId,
        };
      }

      async function createClaimableRedo() {
        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                claimableDefinitionId,

              kind:
                'claimable',

              title:
                'Claimable missed Redo',

              valueSek:
                140,

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
                'submitted',

              createdAt:
                initialSubmittedAt,
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
                'submitted',

              claimedAt:
                resolveLocalDateTimeToEpochMs(
                  '2030-01-16',
                  '12:00',
                  timezone,
                ),
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

        const rejection =
          await rejectInitialSubmission(
            ctx,
            initialSubmissionId,
            'task13-parent',
            'claimable',
            redoDeadlineLocalDate,
            redoDeadlineLocalTime,
            initialReviewAt,
          );

        return {
          occurrenceId,

          claimId,

          redoId:
            rejection.redoId,
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

        const personal =
          await createPersonalRedo();

        const exactBoundary =
          await reconcileRedoDeadlineFailure(
            ctx,
            personal.redoId,
            redoDeadlineAt,
          );

        const exactOccurrence =
          await ctx.db.get(
            personal.occurrenceId,
          );

        assert(
          !exactBoundary.changed &&
          exactOccurrence?.state ===
            'redo_required',
          'Redo must remain open at the exact deadline.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/7 exact Redo deadline remains submit-capable',
        );

        const personalFailure =
          await reconcileRedoDeadlineFailure(
            ctx,
            personal.redoId,
            redoDeadlineAt +
              1,
          );

        const failedPersonal =
          await ctx.db.get(
            personal.occurrenceId,
          );

        const personalLedger =
          await ledgerFor(
            personal.occurrenceId,
          );

        assert(
          personalFailure.changed &&
          failedPersonal?.state ===
            'failed' &&
          personalLedger.length ===
            0,
          'Missed Personal Redo must fail with no financial effect.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/7 missed Personal Redo fails with no penalty',
        );

        const claimable =
          await createClaimableRedo();

        const claimableFailure =
          await reconcileRedoDeadlineFailure(
            ctx,
            claimable.redoId,
            redoDeadlineAt +
              1,
          );

        const failedClaim =
          await ctx.db.get(
            claimable.claimId,
          );

        const failedClaimOccurrence =
          await ctx.db.get(
            claimable.occurrenceId,
          );

        const claimableLedger =
          await ledgerFor(
            claimable.occurrenceId,
          );

        assert(
          claimableFailure.changed &&
          failedClaim?.state ===
            'failed' &&
          failedClaimOccurrence?.state ===
            'failed' &&
          claimableLedger.length ===
            1 &&
          claimableLedger[0]
            .kind ===
            'penalty' &&
          claimableLedger[0]
            .amountSek ===
            -140 &&
          claimableLedger[0]
            .childId ===
            childId,
          'Missed Claimable Redo must fail and create one full-value penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/7 missed Claimable Redo creates full-value penalty',
        );

        const activeAfterFailure =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          !activeAfterFailure.some(
            (item) =>
              item.claim._id ===
              claimable.claimId,
          ),
          'Failed Claimable Redo must release the unresolved active Claim slot.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/7 failed Claimable Redo releases active Claim slot',
        );

        const submitted =
          await createClaimableRedo();

        await submitClaimableRedo(
          ctx,
          householdId,
          childId,
          submitted.claimId,
          redoDeadlineAt,
        );

        const submittedReconciliation =
          await reconcileRedoDeadlineFailure(
            ctx,
            submitted.redoId,
            redoDeadlineAt +
              1,
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
          !submittedReconciliation.changed &&
          submittedClaim?.state ===
            'submitted' &&
          submittedOccurrence?.state ===
            'submitted' &&
          submittedLedger.length ===
            0,
          'On-time attempt 2 must be protected from the later deadline callback.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/7 on-time attempt 2 is protected from deadline failure',
        );

        const cancelled =
          await createClaimableRedo();

        await ctx.db.patch(
          cancelled.claimId,
          {
            state:
              'cancelled',
          },
        );

        await ctx.db.patch(
          cancelled.occurrenceId,
          {
            state:
              'cancelled',
          },
        );

        const cancelledReconciliation =
          await reconcileRedoDeadlineFailure(
            ctx,
            cancelled.redoId,
            redoDeadlineAt +
              1,
          );

        const cancelledOccurrence =
          await ctx.db.get(
            cancelled.occurrenceId,
          );

        const cancelledLedger =
          await ledgerFor(
            cancelled.occurrenceId,
          );

        assert(
          !cancelledReconciliation.changed &&
          cancelledOccurrence?.state ===
            'cancelled' &&
          cancelledLedger.length ===
            0,
          'Parent-cancelled Redo must ignore its later scheduled deadline callback without penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 6/7 cancelled Redo deadline callback is harmless',
        );

        const secondFailurePass =
          await reconcileRedoDeadlineFailure(
            ctx,
            claimable.redoId,
            redoDeadlineAt +
              2,
          );

        const ledgerAfterRetry =
          await ledgerFor(
            claimable.occurrenceId,
          );

        assert(
          !secondFailurePass.changed &&
          ledgerAfterRetry.length ===
            1 &&
          ledgerAfterRetry[0]
            .kind ===
            'penalty' &&
          ledgerAfterRetry[0]
            .amountSek ===
            -140,
          'Redo deadline reconciliation must be idempotent and never double-charge.',
        );

        passed +=
          1;

        console.log(
          '✅ 7/7 terminal Redo deadline reconciliation cannot double-charge',
        );

        return {
          passed,

          total:
            7,
        };
      } finally {
        for (
          const occurrenceId of
          occurrenceIds
        ) {
          const ledgerEntries =
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
            ledgerEntries
          ) {
            await ctx.db.delete(
              entry._id,
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
          personalDefinitionId,
        );

        await ctx.db.delete(
          claimableDefinitionId,
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
