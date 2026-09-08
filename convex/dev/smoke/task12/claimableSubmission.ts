import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import { submitClaimableClaim } from '../../../lib/claimableChoreExecution';
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

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK12 submission smoke',

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
              'TASK12 other household',

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

      const childA =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Child A',

            createdAt:
              now,

            updatedAt:
              now,
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
              'TASK12 submission fixture',

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
                childA,
                childB,
              ],

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task12-smoke',

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

      const submissionIds:
        Array<
          Id<'choreSubmissions'>
        > = [];

      async function createClaimFixture({
        title,
        childId = childA,
        claimState = 'claimed',
        occurrenceState = 'available',
      }: {
        title:
          string;

        childId?:
          Id<'children'>;

        claimState?:
          | 'claimed'
          | 'submitted'
          | 'unclaimed'
          | 'cancelled';

        occurrenceState?:
          | 'available'
          | 'submitted'
          | 'cancelled';
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
                  childA,
                  childB,
                ],

              isUnlockChore:
                false,

              state:
                occurrenceState,

              createdAt:
                now,
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
                claimState,

              claimedAt:
                now -
                30 *
                  60 *
                  1000,
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

      try {
        let passed =
          0;

        const ordinary =
          await createClaimFixture({
            title:
              'Ordinary submission',
          });

        const submitted =
          await submitClaimableClaim(
            ctx,
            householdId,
            childA,
            ordinary.claimId,
            now,
          );

        submissionIds.push(
          submitted.submissionId,
        );

        const persistedSubmission =
          await ctx.db.get(
            submitted.submissionId,
          );

        const persistedClaim =
          await ctx.db.get(
            ordinary.claimId,
          );

        const persistedOccurrence =
          await ctx.db.get(
            ordinary.occurrenceId,
          );

        assert(
          persistedSubmission?.childId ===
            childA &&
          persistedSubmission.attemptNumber ===
            1 &&
          persistedSubmission.submittedAt ===
            now,
          'Successful Claimable submission must persist authoritative attempt-1 data.',
        );

        assert(
          persistedClaim?.state ===
            'submitted' &&
          persistedOccurrence?.state ===
            'submitted',
          'Claim and occurrence must enter submitted state together.',
        );

        passed += 1;

        console.log(
          '✅ 1/9 owning Child can submit active Claimable Chore',
        );

        const earningsAfterSubmission =
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
                    ordinary.occurrenceId,
                  )
                  .eq(
                    'kind',
                    'earning',
                  ),
            )
            .collect();

        assert(
          earningsAfterSubmission.length ===
            0,
          'Submission alone must create no earning.',
        );

        passed += 1;

        console.log(
          '✅ 2/9 submission creates no earning before Parent approval',
        );

        const active =
          await listHouseholdClaimedOccurrences(
            ctx,
            householdId,
          );

        assert(
          active.some(
            (
              item,
            ) =>
              item.claim._id ===
                ordinary.claimId &&
              item.claim.state ===
                'submitted',
          ),
          'Submitted Claim must continue occupying active ownership.',
        );

        passed += 1;

        console.log(
          '✅ 3/9 submitted Claim remains in active-Claim ownership',
        );

        const exactDeadline =
          await createClaimFixture({
            title:
              'Exact deadline',
          });

        const exactResult =
          await submitClaimableClaim(
            ctx,
            householdId,
            childA,
            exactDeadline.claimId,
            deadlineAt,
          );

        submissionIds.push(
          exactResult.submissionId,
        );

        assert(
          exactResult.submittedAt ===
            deadlineAt,
          'Submission exactly at deadline must remain valid.',
        );

        passed += 1;

        console.log(
          '✅ 4/9 exact-deadline submission remains valid',
        );

        const late =
          await createClaimFixture({
            title:
              'Late submission',
          });

        await expectFailure(
          () =>
            submitClaimableClaim(
              ctx,
              householdId,
              childA,
              late.claimId,
              deadlineAt + 1,
            ),
          'Submission after deadline must fail.',
        );

        const lateClaim =
          await ctx.db.get(
            late.claimId,
          );

        const lateOccurrence =
          await ctx.db.get(
            late.occurrenceId,
          );

        assert(
          lateClaim?.state ===
            'claimed' &&
          lateOccurrence?.state ===
            'available',
          'Rejected late submission must not mutate Claim or occurrence.',
        );

        passed += 1;

        console.log(
          '✅ 5/9 post-deadline submission is rejected atomically',
        );

        const wrongChild =
          await createClaimFixture({
            title:
              'Wrong Child',
          });

        await expectFailure(
          () =>
            submitClaimableClaim(
              ctx,
              householdId,
              childB,
              wrongChild.claimId,
              now,
            ),
          'Another Child must not submit the owner’s Claim.',
        );

        passed += 1;

        console.log(
          '✅ 6/9 another Child cannot submit the owner’s Claim',
        );

        await expectFailure(
          () =>
            submitClaimableClaim(
              ctx,
              otherHouseholdId,
              childA,
              wrongChild.claimId,
              now,
            ),
          'Cross-Household submission must fail.',
        );

        passed += 1;

        console.log(
          '✅ 7/9 cross-Household submission is rejected',
        );

        const released =
          await createClaimFixture({
            title:
              'Released Claim',

            claimState:
              'unclaimed',
          });

        await expectFailure(
          () =>
            submitClaimableClaim(
              ctx,
              householdId,
              childA,
              released.claimId,
              now,
            ),
          'Unclaimed historical Claim must not be submitted.',
        );

        passed += 1;

        console.log(
          '✅ 8/9 released historical Claim cannot be submitted',
        );

        await expectFailure(
          () =>
            submitClaimableClaim(
              ctx,
              householdId,
              childA,
              ordinary.claimId,
              now + 1,
            ),
          'Already submitted Claim must reject duplicate submission.',
        );

        const ordinarySubmissions =
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
                    ordinary.occurrenceId,
                  )
                  .eq(
                    'attemptNumber',
                    1,
                  ),
            )
            .collect();

        assert(
          ordinarySubmissions.length ===
            1,
          'Duplicate submission attempt must not create another durable submission.',
        );

        passed += 1;

        console.log(
          '✅ 9/9 duplicate initial submission is prevented',
        );

        return {
          passed,

          total:
            9,
        };
      } finally {
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
          otherHouseholdId,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
