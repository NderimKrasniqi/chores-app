import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  rejectInitialSubmission,
} from '../../../lib/reviews/initialRejection';
import {
  listHouseholdClaimedOccurrences,
} from '../../../lib/claims/visibility';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/scheduling/choreScheduling';
import {
  submitClaimableRedo,
  submitPersonalRedo,
} from '../../../lib/redos/submission';

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

      const normalRedoSubmitAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '17:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK13 redo submission smoke',

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

      const childB =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child B',

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
              'TASK13 Personal redo fixture',

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
              'TASK13 Claimable redo fixture',

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

      async function createPersonalRedoFixture() {
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
                'Personal redo fixture',

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
          'task13-parent',
          'personal',
          redoDeadlineLocalDate,
          redoDeadlineLocalTime,
          reviewAt,
        );

        return {
          occurrenceId,
        };
      }

      async function createClaimableRedoFixture() {
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
                'Claimable redo fixture',

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
                  childB,
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
          'task13-parent',
          'claimable',
          redoDeadlineLocalDate,
          redoDeadlineLocalTime,
          reviewAt,
        );

        return {
          occurrenceId,
          claimId,
        };
      }

      try {
        let passed =
          0;

        const personal =
          await createPersonalRedoFixture();

        const personalResult =
          await submitPersonalRedo(
            ctx,
            personal.occurrenceId,
            childA,
            normalRedoSubmitAt,
          );

        const personalSubmission =
          await ctx.db.get(
            personalResult.submissionId,
          );

        const personalOccurrence =
          await ctx.db.get(
            personal.occurrenceId,
          );

        assert(
          personalSubmission?.attemptNumber ===
            2 &&
          personalSubmission.submittedAt ===
            normalRedoSubmitAt &&
          personalOccurrence?.state ===
            'submitted',
          'Personal Redo submission must persist attempt 2 and move occurrence to submitted.',
        );

        passed += 1;

        console.log(
          '✅ 1/9 Personal Redo creates attempt 2',
        );

        assert(
          personalOccurrence?.deadlineAt ===
            originalDeadlineAt &&
          personalResult.submittedAt >
            originalDeadlineAt,
          'Redo submission must use the Redo deadline without rewriting the original occurrence deadline.',
        );

        passed += 1;

        console.log(
          '✅ 2/9 original occurrence deadline remains immutable',
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
          'Redo submission itself must not create an earning.',
        );

        passed += 1;

        console.log(
          '✅ 3/9 Redo submission has no financial effect',
        );

        const exactDeadline =
          await createPersonalRedoFixture();

        const exactResult =
          await submitPersonalRedo(
            ctx,
            exactDeadline
              .occurrenceId,
            childA,
            redoDeadlineAt,
          );

        assert(
          exactResult.submittedAt ===
            redoDeadlineAt,
          'Submission exactly at Redo deadline must be valid.',
        );

        passed += 1;

        console.log(
          '✅ 4/9 exact Redo deadline submission is valid',
        );

        const late =
          await createPersonalRedoFixture();

        await expectFailure(
          () =>
            submitPersonalRedo(
              ctx,
              late.occurrenceId,
              childA,
              redoDeadlineAt + 1,
            ),
          'Submission after the Redo deadline must fail.',
        );

        const lateOccurrence =
          await ctx.db.get(
            late.occurrenceId,
          );

        const lateAttemptTwo =
          await ctx.db
            .query(
              'choreSubmissions',
            )
            .withIndex(
              'by_occurrence_attempt',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    late.occurrenceId,
                  )
                  .eq(
                    'attemptNumber',
                    2,
                  ),
            )
            .collect();

        assert(
          lateOccurrence?.state ===
            'redo_required' &&
          lateAttemptTwo.length ===
            0,
          'Late Redo failure must not mutate occurrence or persist attempt 2.',
        );

        passed += 1;

        console.log(
          '✅ 5/9 late Redo submission is rejected atomically',
        );

        await expectFailure(
          () =>
            submitPersonalRedo(
              ctx,
              personal.occurrenceId,
              childA,
              normalRedoSubmitAt + 1,
            ),
          'A Redo must not be submitted twice.',
        );

        const duplicateAttempts =
          await ctx.db
            .query(
              'choreSubmissions',
            )
            .withIndex(
              'by_occurrence_attempt',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    personal
                      .occurrenceId,
                  )
                  .eq(
                    'attemptNumber',
                    2,
                  ),
            )
            .collect();

        assert(
          duplicateAttempts.length ===
            1,
          'Duplicate Redo submission must not create another attempt 2.',
        );

        passed += 1;

        console.log(
          '✅ 6/9 duplicate Redo submission is prevented',
        );

        const claimable =
          await createClaimableRedoFixture();

        const claimableResult =
          await submitClaimableRedo(
            ctx,
            householdId,
            childA,
            claimable.claimId,
            normalRedoSubmitAt,
          );

        const claimableSubmission =
          await ctx.db.get(
            claimableResult
              .submissionId,
          );

        const claimableClaim =
          await ctx.db.get(
            claimable.claimId,
          );

        const claimableOccurrence =
          await ctx.db.get(
            claimable.occurrenceId,
          );

        assert(
          claimableSubmission?.attemptNumber ===
            2 &&
          claimableClaim?.state ===
            'submitted' &&
          claimableOccurrence?.state ===
            'submitted' &&
          claimableOccurrence.deadlineAt ===
            originalDeadlineAt,
          'Claimable Redo must persist attempt 2 and return Claim and occurrence to submitted.',
        );

        passed += 1;

        console.log(
          '✅ 7/9 Claimable Redo returns Claim and occurrence to submitted',
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
          'Submitted Claimable Redo must continue occupying the active Claim slot.',
        );

        passed += 1;

        console.log(
          '✅ 8/9 submitted Claimable Redo remains active ownership',
        );

        const ownerMismatch =
          await createClaimableRedoFixture();

        await expectFailure(
          () =>
            submitClaimableRedo(
              ctx,
              householdId,
              childB,
              ownerMismatch
                .claimId,
              normalRedoSubmitAt,
            ),
          'Another Child must not submit the owner Redo.',
        );

        const ownerMismatchClaim =
          await ctx.db.get(
            ownerMismatch
              .claimId,
          );

        const ownerMismatchOccurrence =
          await ctx.db.get(
            ownerMismatch
              .occurrenceId,
          );

        const ownerMismatchAttempt =
          await ctx.db
            .query(
              'choreSubmissions',
            )
            .withIndex(
              'by_occurrence_attempt',
              (q) =>
                q
                  .eq(
                    'occurrenceId',
                    ownerMismatch
                      .occurrenceId,
                  )
                  .eq(
                    'attemptNumber',
                    2,
                  ),
            )
            .collect();

        assert(
          ownerMismatchClaim?.state ===
            'redo_required' &&
          ownerMismatchOccurrence?.state ===
            'redo_required' &&
          ownerMismatchAttempt.length ===
            0,
          'Wrong-Child Redo attempt must have no durable effect.',
        );

        passed += 1;

        console.log(
          '✅ 9/9 another Child cannot submit the Claimable Redo',
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
