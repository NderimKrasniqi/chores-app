import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  rejectInitialSubmission,
} from '../../../lib/initialChoreRejection';
import {
  listHouseholdClaimedOccurrences,
} from '../../../lib/claimableChoreVisibility';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/choreScheduling';

function assert(
  condition: unknown,
  message: string,
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
  message: string,
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

      const initialDeadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          timezone,
        );

      const submittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '17:30',
          timezone,
        );

      const reviewAt =
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
              'TASK13 rejection smoke',

            timezone,

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              submittedAt,

            updatedAt:
              submittedAt,
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
              submittedAt,

            updatedAt:
              submittedAt,
          },
        );

      const childB =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child B',

            createdAt:
              submittedAt,

            updatedAt:
              submittedAt,
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
              'TASK13 Personal fixture',

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
              submittedAt,

            updatedAt:
              submittedAt,
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
              'TASK13 Claimable fixture',

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
                childB,
              ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task13-smoke',

            createdAt:
              submittedAt,

            updatedAt:
              submittedAt,
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

      const reviewIds:
        Array<
          Id<'choreReviews'>
        > = [];

      const redoIds:
        Array<
          Id<'choreRedos'>
        > = [];

      async function createPersonalFixture({
        submissionTime =
          submittedAt,

        attemptNumber =
          1,
      }: {
        submissionTime?:
          number;

        attemptNumber?:
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
                'Personal fixture',

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
                initialDeadlineAt,

              personalChildId:
                childA,

              isUnlockChore:
                false,

              state:
                'submitted',

              createdAt:
                submittedAt,
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

              childId:
                childA,

              attemptNumber,

              submittedAt:
                submissionTime,
            },
          );

        submissionIds.push(
          submissionId,
        );

        return {
          occurrenceId,
          submissionId,
        };
      }

      async function createClaimableFixture({
        submissionTime =
          submittedAt,

        claimChildId =
          childA,

        submissionChildId =
          childA,
      }: {
        submissionTime?:
          number;

        claimChildId?:
          Id<'children'>;

        submissionChildId?:
          Id<'children'>;
      } = {}) {
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
                'Claimable fixture',

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
                initialDeadlineAt,

              eligibleChildIds:
                [
                  childA,
                  childB,
                ],

              isUnlockChore:
                false,

              state:
                'submitted',

              createdAt:
                submittedAt,
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
                claimChildId,

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

        const submissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId,

              childId:
                submissionChildId,

              attemptNumber:
                1,

              submittedAt:
                submissionTime,
            },
          );

        submissionIds.push(
          submissionId,
        );

        return {
          occurrenceId,
          claimId,
          submissionId,
        };
      }

      try {
        let passed =
          0;

        const personal =
          await createPersonalFixture();

        const personalResult =
          await rejectInitialSubmission(
            ctx,
            personal.submissionId,
            'task13-parent-a',
            'personal',
            redoDeadlineLocalDate,
            redoDeadlineLocalTime,
            reviewAt,
          );

        reviewIds.push(
          personalResult.reviewId,
        );

        redoIds.push(
          personalResult.redoId,
        );

        const personalReview =
          await ctx.db.get(
            personalResult.reviewId,
          );

        const personalRedo =
          await ctx.db.get(
            personalResult.redoId,
          );

        const personalOccurrence =
          await ctx.db.get(
            personal.occurrenceId,
          );

        assert(
          personalReview?.decision ===
            'rejected' &&
          personalReview.reviewedByAuthUserId ===
            'task13-parent-a' &&
          personalRedo?.initialSubmissionId ===
            personal.submissionId &&
          personalRedo.rejectionReviewId ===
            personalResult.reviewId &&
          personalRedo.deadlineAt ===
            redoDeadlineAt &&
          personalOccurrence?.state ===
            'redo_required',
          'Personal rejection must persist one rejected Review, one Redo, and transition the occurrence.',
        );

        passed += 1;

        console.log(
          '✅ 1/8 Personal initial rejection creates one Redo',
        );

        const personalEarnings =
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
                    personal
                      .occurrenceId,
                  )
                  .eq(
                    'kind',
                    'earning',
                  ),
            )
            .collect();

        assert(
          personalEarnings.length ===
            0,
          'Initial rejection must not create an earning.',
        );

        passed += 1;

        console.log(
          '✅ 2/8 rejection creates no financial effect',
        );

        const claimable =
          await createClaimableFixture();

        const claimableResult =
          await rejectInitialSubmission(
            ctx,
            claimable.submissionId,
            'task13-parent-b',
            'claimable',
            redoDeadlineLocalDate,
            redoDeadlineLocalTime,
            reviewAt,
          );

        reviewIds.push(
          claimableResult.reviewId,
        );

        redoIds.push(
          claimableResult.redoId,
        );

        const claimableOccurrence =
          await ctx.db.get(
            claimable.occurrenceId,
          );

        const claimableClaim =
          await ctx.db.get(
            claimable.claimId,
          );

        assert(
          claimableOccurrence?.state ===
            'redo_required' &&
          claimableClaim?.state ===
            'redo_required',
          'Claimable rejection must keep occurrence and Claim unresolved in redo_required.',
        );

        passed += 1;

        console.log(
          '✅ 3/8 Claimable rejection moves Claim and occurrence to redo_required',
        );

        const activeClaims =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          activeClaims.some(
            (
              item,
            ) =>
              item.claim._id ===
              claimable.claimId,
          ),
          'Claimable Redo must continue occupying the active Claim slot.',
        );

        passed += 1;

        console.log(
          '✅ 4/8 Claimable Redo remains active ownership',
        );

        await expectFailure(
          () =>
            rejectInitialSubmission(
              ctx,
              personal.submissionId,
              'task13-parent-b',
              'personal',
              '2030-01-18',
              '18:00',
              reviewAt + 1,
            ),
          'A Submission must not receive a second successful rejection.',
        );

        const personalReviews =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  personal
                    .submissionId,
                ),
            )
            .collect();

        const personalRedos =
          await ctx.db
            .query(
              'choreRedos',
            )
            .withIndex(
              'by_occurrence',
              (q) =>
                q.eq(
                  'occurrenceId',
                  personal
                    .occurrenceId,
                ),
            )
            .collect();

        assert(
          personalReviews.length ===
            1 &&
          personalRedos.length ===
            1,
          'Duplicate rejection must not duplicate Review or Redo history.',
        );

        passed += 1;

        console.log(
          '✅ 5/8 duplicate initial rejection cannot create a second Redo',
        );

        const attemptTwo =
          await createPersonalFixture({
            attemptNumber:
              2,
          });

        await expectFailure(
          () =>
            rejectInitialSubmission(
              ctx,
              attemptTwo.submissionId,
              'task13-parent-a',
              'personal',
              redoDeadlineLocalDate,
              redoDeadlineLocalTime,
              reviewAt,
            ),
          'Attempt 2 must never create another Redo.',
        );

        const attemptTwoOccurrence =
          await ctx.db.get(
            attemptTwo.occurrenceId,
          );

        assert(
          attemptTwoOccurrence?.state ===
            'submitted',
          'Rejected attempt-2 Redo creation attempt must not mutate occurrence state.',
        );

        passed += 1;

        console.log(
          '✅ 6/8 attempt 2 cannot create another Redo',
        );

        const late =
          await createPersonalFixture({
            submissionTime:
              initialDeadlineAt + 1,
          });

        await expectFailure(
          () =>
            rejectInitialSubmission(
              ctx,
              late.submissionId,
              'task13-parent-a',
              'personal',
              redoDeadlineLocalDate,
              redoDeadlineLocalTime,
              reviewAt,
            ),
          'Late attempt 1 must not receive a Redo.',
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
                  late.submissionId,
                ),
            )
            .collect();

        assert(
          lateReviews.length ===
            0,
          'Late attempt rejection failure must not persist a Review.',
        );

        passed += 1;

        console.log(
          '✅ 7/8 late initial Submission cannot receive a Redo',
        );

        const invalidOwnership =
          await createClaimableFixture({
            claimChildId:
              childB,

            submissionChildId:
              childA,
          });

        await expectFailure(
          () =>
            rejectInitialSubmission(
              ctx,
              invalidOwnership
                .submissionId,
              'task13-parent-a',
              'claimable',
              redoDeadlineLocalDate,
              redoDeadlineLocalTime,
              reviewAt,
            ),
          'Claim ownership mismatch must reject Redo creation.',
        );

        const invalidClaim =
          await ctx.db.get(
            invalidOwnership
              .claimId,
          );

        const invalidOccurrence =
          await ctx.db.get(
            invalidOwnership
              .occurrenceId,
          );

        assert(
          invalidClaim?.state ===
            'submitted' &&
          invalidOccurrence?.state ===
            'submitted',
          'Ownership mismatch must not mutate Claim or occurrence state.',
        );

        passed += 1;

        console.log(
          '✅ 8/8 Claim ownership mismatch is rejected atomically',
        );

        return {
          passed,

          total:
            8,
        };
      } finally {
        for (
          const redoId of
          redoIds
        ) {
          const redo =
            await ctx.db.get(
              redoId,
            );

          if (redo) {
            await ctx.db.delete(
              redoId,
            );
          }
        }

        for (
          const reviewId of
          reviewIds
        ) {
          const review =
            await ctx.db.get(
              reviewId,
            );

          if (review) {
            await ctx.db.delete(
              reviewId,
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
          personalDefinitionId,
        );

        await ctx.db.delete(
          claimableDefinitionId,
        );

        await ctx.db.delete(
          childA,
        );

        await ctx.db.delete(
          childB,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
