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
  listHouseholdClaimedOccurrences,
} from '../../../lib/claims/visibility';
import {
  getWeeklyUnclaimUsageForChild,
} from '../../../lib/claims/unclaimAccounting';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/scheduling/choreScheduling';

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

    handler: async (
      ctx,
    ) => {
      const now =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '12:00',
          'Europe/Stockholm',
        );

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          'Europe/Stockholm',
        );

      const redoDeadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-17',
          '18:00',
          'Europe/Stockholm',
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK11 cancellation smoke',

            timezone:
              'Europe/Stockholm',

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

      const otherHouseholdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK11 other household',

            timezone:
              'Europe/Stockholm',

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

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Cancellation Child',

            createdAt:
              now,

            updatedAt:
              now,
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
              'TASK11 cancellation fixture',

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
              'task11-smoke',

            createdAt:
              now,

            updatedAt:
              now,
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

      async function createOccurrence(
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
                  childId,
                ],

              isUnlockChore:
                false,

              state:
                'available',

              createdAt:
                now,
            },
          );

        occurrenceIds.push(
          occurrenceId,
        );

        return occurrenceId;
      }

      async function createClaim(
        occurrenceId:
          Id<'choreOccurrences'>,
      ) {
        const result =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            occurrenceId,
            now,
            false,
          );

        claimIds.push(
          result.claimId,
        );

        return result;
      }

      try {
        let passed =
          0;

        const firstOccurrence =
          await createOccurrence(
            'Cancel claimed',
          );

        const firstClaim =
          await createClaim(
            firstOccurrence,
          );

        const cancellation =
          await cancelClaimableClaimForParent(
            ctx,
            householdId,
            firstClaim.claimId,
            'task11-parent',
            now + 1,
          );

        const persistedClaim =
          await ctx.db.get(
            firstClaim.claimId,
          );

        const persistedOccurrence =
          await ctx.db.get(
            firstOccurrence,
          );

        assert(
          cancellation.state ===
            'cancelled' &&
          persistedClaim?.state ===
            'cancelled' &&
          persistedOccurrence?.state ===
            'cancelled',
          'Parent cancellation must terminally cancel Claim and occurrence.',
        );

        assert(
          persistedClaim?.cancelledAt ===
            now + 1 &&
          persistedClaim
            ?.cancelledByAuthUserId ===
            'task11-parent',
          'Cancellation audit information must be durable.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/8 Parent cancellation durably cancels Claim and occurrence',
        );

        assert(
          persistedClaim?.unclaimedAt ===
            undefined,
          'Parent cancellation must not write Child unclaim usage.',
        );

        const household =
          await ctx.db.get(
            householdId,
          );

        assert(
          household,
          'Household fixture missing.',
        );

        const usage =
          await getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            childId,
            now + 1,
          );

        assert(
          usage.usedUnclaims ===
            0 &&
          usage.remainingUnclaims ===
            2,
          'Parent cancellation must not consume weekly allowance.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/8 Parent cancellation consumes no Child unclaim allowance',
        );

        const replacementOccurrence =
          await createOccurrence(
            'Replacement claim',
          );

        const replacementClaim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            replacementOccurrence,
            now + 2,
            false,
          );

        claimIds.push(
          replacementClaim.claimId,
        );

        assert(
          replacementClaim.state ===
            'claimed',
          'Cancelled Claim must release the active-Claim slot.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/8 Parent cancellation releases active-Claim slot',
        );

        await ctx.db.patch(
          replacementClaim.claimId,
          {
            state:
              'cancelled',

            cancelledAt:
              now + 3,

            cancelledByAuthUserId:
              'task11-parent',
          },
        );

        await ctx.db.patch(
          replacementOccurrence,
          {
            state:
              'cancelled',
          },
        );

        const submittedOccurrence =
          await createOccurrence(
            'Cancel submitted',
          );

        const submittedClaim =
          await createClaim(
            submittedOccurrence,
          );

        await ctx.db.patch(
          submittedClaim.claimId,
          {
            state:
              'submitted',
          },
        );

        await ctx.db.patch(
          submittedOccurrence,
          {
            state:
              'submitted',
          },
        );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          submittedClaim.claimId,
          'task11-parent',
          now + 4,
        );

        const persistedSubmitted =
          await ctx.db.get(
            submittedClaim.claimId,
          );

        assert(
          persistedSubmitted?.state ===
            'cancelled',
          'Submitted unresolved Claim must remain Parent-cancellable.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/8 submitted unresolved Claim can be cancelled',
        );

        /*
         * TASK-13/14-compatible Redo
         * cancellation fixture.
         *
         * redo_required must have a durable
         * Redo record with its own deadline.
         */
        const redoOccurrence =
          await createOccurrence(
            'Cancel redo',
          );

        const redoClaim =
          await createClaim(
            redoOccurrence,
          );

        const initialSubmissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId:
                redoOccurrence,

              childId,

              attemptNumber:
                1,

              submittedAt:
                now,
            },
          );

        const rejectionReviewId =
          await ctx.db.insert(
            'choreReviews',
            {
              householdId,

              occurrenceId:
                redoOccurrence,

              submissionId:
                initialSubmissionId,

              decision:
                'rejected',

              reviewedByAuthUserId:
                'task11-parent',

              reviewedAt:
                now + 4,
            },
          );

        await ctx.db.insert(
          'choreRedos',
          {
            householdId,

            occurrenceId:
              redoOccurrence,

            initialSubmissionId,

            rejectionReviewId,

            deadlineLocalDate:
              '2030-01-17',

            deadlineLocalTime:
              '18:00',

            deadlineAt:
              redoDeadlineAt,

            createdAt:
              now + 4,
          },
        );

        await ctx.db.patch(
          redoClaim.claimId,
          {
            state:
              'redo_required',
          },
        );

        await ctx.db.patch(
          redoOccurrence,
          {
            state:
              'redo_required',
          },
        );

        await cancelClaimableClaimForParent(
          ctx,
          householdId,
          redoClaim.claimId,
          'task11-parent',
          now + 5,
        );

        const persistedRedo =
          await ctx.db.get(
            redoClaim.claimId,
          );

        assert(
          persistedRedo?.state ===
            'cancelled',
          'Redo unresolved Claim must remain Parent-cancellable before its Redo deadline.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/8 redo-required unresolved Claim can be cancelled',
        );

        const approvedOccurrence =
          await createOccurrence(
            'Approved terminal',
          );

        const approvedClaim =
          await createClaim(
            approvedOccurrence,
          );

        await ctx.db.patch(
          approvedClaim.claimId,
          {
            state:
              'approved',
          },
        );

        await ctx.db.patch(
          approvedOccurrence,
          {
            state:
              'approved',
          },
        );

        await expectFailure(
          () =>
            cancelClaimableClaimForParent(
              ctx,
              householdId,
              approvedClaim.claimId,
              'task11-parent',
              now + 6,
            ),
          'Approved terminal Claim must reject Parent cancellation.',
        );

        const stillApproved =
          await ctx.db.get(
            approvedClaim.claimId,
          );

        assert(
          stillApproved?.state ===
            'approved',
          'Rejected cancellation must preserve terminal Claim state.',
        );

        passed +=
          1;

        console.log(
          '✅ 6/8 terminal approved Claim cannot be cancelled',
        );

        await expectFailure(
          () =>
            cancelClaimableClaimForParent(
              ctx,
              otherHouseholdId,
              approvedClaim.claimId,
              'other-parent',
              now + 7,
            ),
          'Cross-Household cancellation must fail.',
        );

        passed +=
          1;

        console.log(
          '✅ 7/8 cross-Household cancellation is rejected',
        );

        const activeAfterCancellation =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          !activeAfterCancellation.some(
            (item) =>
              item.claim._id ===
              firstClaim.claimId,
          ),
          'Cancelled Claim must leave active claimed-by visibility.',
        );

        const ledgerEntries =
          await ctx.db
            .query(
              'ledgerEntries',
            )
            .collect();

        assert(
          !ledgerEntries.some(
            (entry) =>
              entry.householdId ===
                householdId &&
              entry.childId ===
                childId &&
              entry.occurrenceId ===
                firstOccurrence,
          ),
          'Parent cancellation must create no financial effect.',
        );

        passed +=
          1;

        console.log(
          '✅ 8/8 cancellation leaves active visibility and creates no penalty',
        );

        return {
          passed,

          total:
            8,
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
          definitionId,
        );

        await ctx.db.delete(
          childId,
        );

        await ctx.db.delete(
          otherHouseholdId,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
