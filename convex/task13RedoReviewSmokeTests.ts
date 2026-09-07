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
  approveRedoSubmission,
  rejectRedoSubmission,
} from './lib/redoChoreReview';
import {
  submitClaimableRedo,
  submitPersonalRedo,
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

      const redoSubmittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '17:00',
          timezone,
        );

      /*
       * Review delay is harmless because
       * persisted submittedAt determines
       * whether Redo submission was valid.
       */
      const redoReviewAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '20:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK13 redo review smoke',

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

      const childA =
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
              'TASK13 Personal review fixture',

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
              childA,

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
              'TASK13 Claimable review fixture',

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
                childA,
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

      async function createPersonalRedoSubmission({
        submitAt =
          redoSubmittedAt,
      }: {
        submitAt?:
          number;
      } = {}) {
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
                'Personal Redo review',

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
                childA,

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

              childId:
                childA,

              attemptNumber:
                1,

              submittedAt:
                initialSubmittedAt,
            },
          );

        await rejectInitialSubmission(
          ctx,
          initialSubmissionId,
          'task13-parent-a',
          'personal',
          redoDeadlineLocalDate,
          redoDeadlineLocalTime,
          initialReviewAt,
        );

        const redoResult =
          await submitPersonalRedo(
            ctx,
            occurrenceId,
            childA,
            submitAt,
          );

        return {
          occurrenceId,

          submissionId:
            redoResult
              .submissionId,
        };
      }

      async function createClaimableRedoSubmission() {
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
                'Claimable Redo review',

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
                  childA,
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

              childId:
                childA,

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

              childId:
                childA,

              attemptNumber:
                1,

              submittedAt:
                initialSubmittedAt,
            },
          );

        await rejectInitialSubmission(
          ctx,
          initialSubmissionId,
          'task13-parent-a',
          'claimable',
          redoDeadlineLocalDate,
          redoDeadlineLocalTime,
          initialReviewAt,
        );

        const redoResult =
          await submitClaimableRedo(
            ctx,
            householdId,
            childA,
            claimId,
            redoSubmittedAt,
          );

        return {
          occurrenceId,

          claimId,

          submissionId:
            redoResult
              .submissionId,
        };
      }

      try {
        let passed =
          0;

        /*
         * 1. Personal Redo approval.
         */
        const personalApproved =
          await createPersonalRedoSubmission();

        const personalApproval =
          await approveRedoSubmission(
            ctx,
            personalApproved
              .submissionId,
            'task13-parent-b',
            'personal',
            redoReviewAt,
          );

        const personalOccurrence =
          await ctx.db.get(
            personalApproved
              .occurrenceId,
          );

        const personalReview =
          await ctx.db.get(
            personalApproval
              .reviewId,
          );

        const personalEarning =
          await ctx.db.get(
            personalApproval
              .ledgerEntryId,
          );

        assert(
          personalReview?.decision ===
            'approved' &&
          personalOccurrence?.state ===
            'approved' &&
          personalEarning?.kind ===
            'earning' &&
          personalEarning.amountSek ===
            90,
          'Approved Personal Redo must create the normal earning and complete the occurrence.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/9 Personal Redo approval completes and earns',
        );

        /*
         * 2. Review may happen after Redo
         * deadline if submission was on
         * time.
         */
        assert(
          personalOccurrence?.deadlineAt ===
            originalDeadlineAt &&
          personalApproval.reviewedAt >
            redoDeadlineAt,
          'Review delay must not rewrite the original deadline or invalidate an on-time Redo.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/9 on-time Redo remains approvable after its deadline',
        );

        /*
         * 3. Claimable Redo approval.
         */
        const claimableApproved =
          await createClaimableRedoSubmission();

        const claimableApproval =
          await approveRedoSubmission(
            ctx,
            claimableApproved
              .submissionId,
            'task13-parent-b',
            'claimable',
            redoReviewAt,
          );

        const approvedClaim =
          await ctx.db.get(
            claimableApproved
              .claimId,
          );

        const approvedOccurrence =
          await ctx.db.get(
            claimableApproved
              .occurrenceId,
          );

        assert(
          approvedClaim?.state ===
            'approved' &&
          approvedOccurrence?.state ===
            'approved' &&
          claimableApproval.amountSek ===
            140,
          'Approved Claimable Redo must approve Claim and occurrence using immutable value.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/9 Claimable Redo approval completes Claim and occurrence',
        );

        /*
         * 4. Approved Claimable Redo
         * releases active Claim slot.
         */
        const activeAfterApproval =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          !activeAfterApproval.some(
            (item) =>
              item.claim._id ===
              claimableApproved
                .claimId,
          ),
          'Approved Claimable Redo must release the active Claim slot.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/9 Claimable Redo approval releases active Claim slot',
        );

        /*
         * 5. Rejected Personal Redo fails
         * terminally but cannot create debt.
         */
        const personalRejected =
          await createPersonalRedoSubmission();

        const personalRejection =
          await rejectRedoSubmission(
            ctx,
            personalRejected
              .submissionId,
            'task13-parent-a',
            'personal',
            redoReviewAt,
          );

        const rejectedPersonalOccurrence =
          await ctx.db.get(
            personalRejected
              .occurrenceId,
          );

        const rejectedPersonalReview =
          await ctx.db.get(
            personalRejection
              .reviewId,
          );

        const personalRejectedRedos =
          await ctx.db
            .query(
              'choreRedos',
            )
            .withIndex(
              'by_occurrence',
              (q) =>
                q.eq(
                  'occurrenceId',
                  personalRejected
                    .occurrenceId,
                ),
            )
            .collect();

        const personalRejectedLedger =
          await ledgerFor(
            personalRejected
              .occurrenceId,
          );

        assert(
          rejectedPersonalReview?.decision ===
            'rejected' &&
          rejectedPersonalOccurrence?.state ===
            'failed' &&
          personalRejectedRedos.length ===
            1 &&
          personalRejectedLedger.length ===
            0,
          'Rejected Personal Redo must fail terminally without another Redo or financial penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/9 Personal Redo rejection fails with no penalty or second Redo',
        );

        /*
         * 6. Rejected Claimable Redo gets
         * the same full-value consequence
         * as a missed Claimable Redo.
         */
        const claimableRejected =
          await createClaimableRedoSubmission();

        await rejectRedoSubmission(
          ctx,
          claimableRejected
            .submissionId,
          'task13-parent-a',
          'claimable',
          redoReviewAt,
        );

        const rejectedClaim =
          await ctx.db.get(
            claimableRejected
              .claimId,
          );

        const rejectedClaimOccurrence =
          await ctx.db.get(
            claimableRejected
              .occurrenceId,
          );

        const rejectedClaimLedger =
          await ledgerFor(
            claimableRejected
              .occurrenceId,
          );

        assert(
          rejectedClaim?.state ===
            'failed' &&
          rejectedClaimOccurrence?.state ===
            'failed' &&
          rejectedClaimLedger.length ===
            1 &&
          rejectedClaimLedger[0]
            .kind ===
            'penalty' &&
          rejectedClaimLedger[0]
            .amountSek ===
            -140 &&
          rejectedClaimLedger[0]
            .childId ===
            childA,
          'Rejected Claimable Redo must create exactly one full-value penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 6/9 Claimable Redo rejection creates full-value penalty',
        );

        /*
         * 7. First successful approval
         * remains authoritative.
         */
        await expectFailure(
          () =>
            rejectRedoSubmission(
              ctx,
              personalApproved
                .submissionId,
              'task13-parent-a',
              'personal',
              redoReviewAt +
                1,
            ),
          'A later rejection must not overwrite an approved Redo.',
        );

        const approvedReviews =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  personalApproved
                    .submissionId,
                ),
            )
            .collect();

        assert(
          approvedReviews.length ===
            1 &&
          approvedReviews[0]
            .decision ===
            'approved',
          'First successful approval must remain authoritative.',
        );

        passed +=
          1;

        console.log(
          '✅ 7/9 later conflicting rejection cannot overwrite approval',
        );

        /*
         * 8. First successful rejection
         * remains authoritative.
         */
        await expectFailure(
          () =>
            approveRedoSubmission(
              ctx,
              personalRejected
                .submissionId,
              'task13-parent-b',
              'personal',
              redoReviewAt +
                1,
            ),
          'A later approval must not overwrite a rejected Redo.',
        );

        const rejectedReviews =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  personalRejected
                    .submissionId,
                ),
            )
            .collect();

        const rejectedEarnings =
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
                    personalRejected
                      .occurrenceId,
                  )
                  .eq(
                    'kind',
                    'earning',
                  ),
            )
            .collect();

        assert(
          rejectedReviews.length ===
            1 &&
          rejectedReviews[0]
            .decision ===
            'rejected' &&
          rejectedEarnings.length ===
            0,
          'First successful rejection must remain authoritative with no later earning.',
        );

        passed +=
          1;

        console.log(
          '✅ 8/9 later conflicting approval cannot overwrite rejection',
        );

        /*
         * 9. Defensive historical case:
         * a persisted late attempt 2 must
         * not become reviewable.
         */
        const lateFixture =
          await createPersonalRedoSubmission();

        const lateSubmission =
          await ctx.db.get(
            lateFixture.submissionId,
          );

        assert(
          lateSubmission,
          'Synthetic late fixture Submission must exist.',
        );

        await ctx.db.patch(
          lateSubmission._id,
          {
            submittedAt:
              redoDeadlineAt +
              1,
          },
        );

        await expectFailure(
          () =>
            approveRedoSubmission(
              ctx,
              lateFixture
                .submissionId,
              'task13-parent-b',
              'personal',
              redoReviewAt,
            ),
          'Persisted late Redo must not be reviewable.',
        );

        const lateOccurrence =
          await ctx.db.get(
            lateFixture
              .occurrenceId,
          );

        const lateReviews =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  lateFixture
                    .submissionId,
                ),
            )
            .collect();

        assert(
          lateOccurrence?.state ===
            'submitted' &&
          lateReviews.length ===
            0,
          'Late persisted Redo review failure must have no durable review effect.',
        );

        passed +=
          1;

        console.log(
          '✅ 9/9 late persisted Redo cannot be reviewed',
        );

        return {
          passed,

          total:
            9,
        };
      } finally {
        for (
          const occurrenceId of
          occurrenceIds
        ) {
          const ledgerEntries =
            await ledgerFor(
              occurrenceId,
            );

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
          childA,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
