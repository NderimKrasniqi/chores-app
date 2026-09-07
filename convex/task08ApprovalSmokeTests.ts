import {
  ConvexError,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import {
  approvePersonalSubmission,
  listPendingPersonalReviews,
} from './lib/personalChoreReview';

type SmokeTestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

function result(
  label: string,
  passed: boolean,
  detail?: string,
): SmokeTestResult {
  return {
    label,
    passed,

    ...(detail
      ? {
          detail,
        }
      : {}),
  };
}

async function expectReject(
  operation:
    () => Promise<unknown>,
) {
  try {
    await operation();

    return false;
  } catch {
    return true;
  }
}

export const run =
  mutation({
    args: {},

    handler:
      async (
        ctx,
      ): Promise<
        SmokeTestResult[]
      > => {
        if (
          process.env
            .APP_ENV ===
          'production'
        ) {
          throw new ConvexError(
            'Developer smoke tests are disabled in production.',
          );
        }

        const results:
          SmokeTestResult[] =
          [];

        const submittedAt =
          Date.UTC(
            2030,
            0,
            15,
            17,
            59,
            0,
            0,
          );

        /*
         * Parent deliberately reviews
         * after the deadline.
         */
        const reviewedAt =
          Date.UTC(
            2030,
            0,
            16,
            12,
            0,
            0,
            0,
          );

        const deadlineAt =
          Date.UTC(
            2030,
            0,
            15,
            18,
            0,
            0,
            0,
          );

        const householdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-08 Approval Smoke',

              timezone:
                'UTC',

              payoutWeekday:
                'friday',

              weeklyUnclaimAllowance:
                1,

              createdAt:
                submittedAt,

              updatedAt:
                submittedAt,
            },
          );

        const childId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'TASK-08 Approval Child',

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
                'personal',

              title:
                'TASK-08 Approval Chore',

              valueSek: 40,

              recurrence: {
                kind:
                  'one_off',

                scheduledDate:
                  '2030-01-15',
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
                'task08-smoke',

              createdAt:
                submittedAt,

              updatedAt:
                submittedAt,
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
                'personal',

              title:
                'TASK-08 Approval Chore',

              valueSek: 40,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'UTC',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                Date.UTC(
                  2030,
                  0,
                  15,
                  0,
                  0,
                  0,
                  0,
                ),

              deadlineAt,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'submitted',

              createdAt:
                submittedAt,
            },
          );

        const submissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId,

              childId,

              attemptNumber:
                1,

              submittedAt,
            },
          );

        /*
         * 1. Pending review appears.
         */
        const pendingBefore =
          await listPendingPersonalReviews(
            ctx,
            householdId,
          );

        results.push(
          result(
            'Submitted Personal Chore appears in Parent review queue',
            pendingBefore.length ===
              1 &&
              pendingBefore[0]
                .submissionId ===
                submissionId,
            `${pendingBefore.length} pending`,
          ),
        );

        /*
         * 2. Review delay after
         * deadline does not hurt an
         * on-time submission.
         */
        const approval =
          await approvePersonalSubmission(
            ctx,
            submissionId,
            'task08-parent',
            reviewedAt,
          );

        results.push(
          result(
            'On-time submission can be approved after deadline',
            approval.state ===
              'approved' &&
              approval.amountSek ===
                40 &&
              approval.reviewedAt ===
                reviewedAt,
            JSON.stringify(
              approval,
            ),
          ),
        );

        /*
         * 3. Occurrence becomes
         * approved.
         */
        const approvedOccurrence =
          await ctx.db.get(
            occurrenceId,
          );

        results.push(
          result(
            'Approval completes Personal Chore occurrence',
            approvedOccurrence
              ?.state ===
              'approved',
            approvedOccurrence
              ?.state,
          ),
        );

        /*
         * 4. Review is durable.
         */
        const reviews =
          await ctx.db
            .query(
              'choreReviews',
            )
            .withIndex(
              'by_submission',
              (q) =>
                q.eq(
                  'submissionId',
                  submissionId,
                ),
            )
            .collect();

        results.push(
          result(
            'Approval creates one durable review',
            reviews.length ===
              1 &&
              reviews[0]
                .decision ===
                'approved' &&
              reviews[0]
                .reviewedByAuthUserId ===
                'task08-parent',
            `${reviews.length} review(s)`,
          ),
        );

        /*
         * 5. Approval creates exactly
         * one positive earning.
         */
        const earnings =
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
                    'earning',
                  ),
            )
            .collect();

        results.push(
          result(
            'Approval creates one positive earning',
            earnings.length ===
              1 &&
              earnings[0]
                .amountSek ===
                40 &&
              earnings[0]
                .childId ===
                childId,
            earnings.length ===
              1
              ? `${earnings[0].amountSek} SEK`
              : `${earnings.length} earning(s)`,
          ),
        );

        /*
         * 6. Review queue clears.
         */
        const pendingAfter =
          await listPendingPersonalReviews(
            ctx,
            householdId,
          );

        results.push(
          result(
            'Approved submission leaves Parent review queue',
            pendingAfter.length ===
              0,
            `${pendingAfter.length} pending`,
          ),
        );

        /*
         * 7. Duplicate approval is
         * rejected.
         */
        results.push(
          result(
            'Duplicate approval is rejected',
            await expectReject(
              () =>
                approvePersonalSubmission(
                  ctx,
                  submissionId,
                  'task08-parent-2',
                  reviewedAt +
                    1000,
                ),
            ),
          ),
        );

        /*
         * 8. No duplicate earning was
         * produced.
         */
        const earningsAfterDuplicate =
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
                    'earning',
                  ),
            )
            .collect();

        results.push(
          result(
            'Duplicate review attempt cannot duplicate earnings',
            earningsAfterDuplicate
              .length ===
              1,
            `${earningsAfterDuplicate.length} earning(s)`,
          ),
        );

        /*
         * Cleanup.
         */
        for (
          const ledgerEntry of
          earningsAfterDuplicate
        ) {
          await ctx.db.delete(
            ledgerEntry._id,
          );
        }

        for (
          const review of
          reviews
        ) {
          await ctx.db.delete(
            review._id,
          );
        }

        await ctx.db.delete(
          submissionId,
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

        results.push(
          result(
            'Test data cleanup',
            true,
          ),
        );

        return results;
      },
  });
