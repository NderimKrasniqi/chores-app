import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  approveClaimableSubmission,
  listPendingClaimableReviews,
} from '../../../lib/claimableChoreReview';
import { listHouseholdClaimedOccurrences } from '../../../lib/claimableChoreVisibility';
import { resolveLocalDateTimeToEpochMs } from '../../../lib/choreScheduling';

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
      const submittedAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '17:30',
          'Europe/Stockholm',
        );

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          'Europe/Stockholm',
        );

      const reviewAfterDeadline =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '20:00',
          'Europe/Stockholm',
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK12 approval smoke',

            timezone:
              'Europe/Stockholm',

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

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'claimable',

            title:
              'TASK12 approval fixture',

            valueSek:
              125,

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
              'task12-smoke',

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

      const ledgerEntryIds:
        Array<
          Id<'ledgerEntries'>
        > = [];

      async function createSubmittedFixture({
        title,
        claimChildId = childA,
        submissionChildId = childA,
        submissionTime = submittedAt,
      }: {
        title:
          string;

        claimChildId?:
          Id<'children'>;

        submissionChildId?:
          Id<'children'>;

        submissionTime?:
          number;
      }) {
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
                125,

              scheduledLocalDate:
                '2030-01-16',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                resolveLocalDateTimeToEpochMs(
                  '2030-01-16',
                  '10:00',
                  'Europe/Stockholm',
                ),

              deadlineAt,

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
                  'Europe/Stockholm',
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

        const valid =
          await createSubmittedFixture({
            title:
              'Approve me',
          });

        const initialPending =
          await listPendingClaimableReviews(
            ctx,
            householdId,
          );

        assert(
          initialPending.length ===
            1 &&
          initialPending[0]
            ?.submissionId ===
            valid.submissionId &&
          initialPending[0]
            ?.claimId ===
            valid.claimId,
          'Valid submitted Claimable Chore must appear in Parent pending review.',
        );

        passed += 1;

        console.log(
          '✅ 1/8 submitted Claimable Chore appears in Parent pending review',
        );

        const approval =
          await approveClaimableSubmission(
            ctx,
            valid.submissionId,
            'task12-parent',
            reviewAfterDeadline,
          );

        reviewIds.push(
          approval.reviewId,
        );

        ledgerEntryIds.push(
          approval.ledgerEntryId,
        );

        const review =
          await ctx.db.get(
            approval.reviewId,
          );

        const earning =
          await ctx.db.get(
            approval.ledgerEntryId,
          );

        assert(
          review?.decision ===
            'approved' &&
          review.reviewedByAuthUserId ===
            'task12-parent' &&
          review.reviewedAt ===
            reviewAfterDeadline,
          'Approval must persist one authoritative Parent review.',
        );

        assert(
          earning?.kind ===
            'earning' &&
          earning.amountSek ===
            125 &&
          earning.childId ===
            childA,
          'Approval must create the immutable occurrence-value earning.',
        );

        passed += 1;

        console.log(
          '✅ 2/8 Parent approval creates review and Claimable earning',
        );

        const approvedClaim =
          await ctx.db.get(
            valid.claimId,
          );

        const approvedOccurrence =
          await ctx.db.get(
            valid.occurrenceId,
          );

        assert(
          approvedClaim?.state ===
            'approved' &&
          approvedOccurrence?.state ===
            'approved',
          'Approval must terminally approve Claim and occurrence.',
        );

        passed += 1;

        console.log(
          '✅ 3/8 approval completes both Claim and occurrence',
        );

        const activeAfterApproval =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          !activeAfterApproval.some(
            (
              item,
            ) =>
              item.claim._id ===
              valid.claimId,
          ),
          'Approved Claim must release the Child active-Claim slot.',
        );

        passed += 1;

        console.log(
          '✅ 4/8 approval releases active-Claim ownership',
        );

        const pendingAfterApproval =
          await listPendingClaimableReviews(
            ctx,
            householdId,
          );

        assert(
          !pendingAfterApproval.some(
            (
              item,
            ) =>
              item.submissionId ===
              valid.submissionId,
          ),
          'Approved submission must leave Parent pending review.',
        );

        passed += 1;

        console.log(
          '✅ 5/8 approved submission leaves pending-review queue',
        );

        await expectFailure(
          () =>
            approveClaimableSubmission(
              ctx,
              valid.submissionId,
              'task12-other-parent',
              reviewAfterDeadline + 1,
            ),
          'Duplicate approval must fail.',
        );

        const reviewsForValid =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  valid.submissionId,
                ),
            )
            .collect();

        const earningsForValid =
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
                    valid.occurrenceId,
                  )
                  .eq(
                    'kind',
                    'earning',
                  ),
            )
            .collect();

        assert(
          reviewsForValid.length ===
            1 &&
          earningsForValid.length ===
            1,
          'Duplicate approval must not duplicate review or earning.',
        );

        passed += 1;

        console.log(
          '✅ 6/8 duplicate approval cannot duplicate financial effect',
        );

        const late =
          await createSubmittedFixture({
            title:
              'Invalid late submission',

            submissionTime:
              deadlineAt + 1,
          });

        const pendingWithLate =
          await listPendingClaimableReviews(
            ctx,
            householdId,
          );

        assert(
          !pendingWithLate.some(
            (
              item,
            ) =>
              item.submissionId ===
              late.submissionId,
          ),
          'Persisted late submission must not appear reviewable.',
        );

        await expectFailure(
          () =>
            approveClaimableSubmission(
              ctx,
              late.submissionId,
              'task12-parent',
              reviewAfterDeadline,
            ),
          'Persisted late submission must reject approval.',
        );

        passed += 1;

        console.log(
          '✅ 7/8 late persisted submission cannot be approved',
        );

        const mismatched =
          await createSubmittedFixture({
            title:
              'Mismatched ownership',

            claimChildId:
              childA,

            submissionChildId:
              childB,
          });

        const pendingWithMismatch =
          await listPendingClaimableReviews(
            ctx,
            householdId,
          );

        assert(
          !pendingWithMismatch.some(
            (
              item,
            ) =>
              item.submissionId ===
              mismatched.submissionId,
          ),
          'Submission without matching submitted Claim ownership must not appear reviewable.',
        );

        await expectFailure(
          () =>
            approveClaimableSubmission(
              ctx,
              mismatched.submissionId,
              'task12-parent',
              reviewAfterDeadline,
            ),
          'Submission Child must match submitted Claim ownership.',
        );

        passed += 1;

        console.log(
          '✅ 8/8 Claim ownership mismatch is rejected',
        );

        return {
          passed,

          total:
            8,
        };
      } finally {
        for (
          const ledgerEntryId of
          ledgerEntryIds
        ) {
          const entry =
            await ctx.db.get(
              ledgerEntryId,
            );

          if (entry) {
            await ctx.db.delete(
              ledgerEntryId,
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
          definitionId,
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
