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
  ensureClaimableFailurePenalty,
} from '../../../lib/finance/failurePenalty';

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
      const now =
        Date.UTC(
          2030,
          0,
          4,
          17,
          0,
          0,
        );

      const availabilityStartsAt =
        now -
        6 *
          60 *
          60 *
          1000;

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK14 penalty fixture',

            timezone:
              'Europe/Stockholm',

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
              'TASK14 Child',

            createdAt:
              availabilityStartsAt,

            updatedAt:
              availabilityStartsAt,
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
              'TASK14 Claimable',

            valueSek:
              140,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-04',
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

      const personalDefinitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK14 Personal',

            valueSek:
              90,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-04',
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

      async function penaltiesFor(
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
              q
                .eq(
                  'occurrenceId',
                  occurrenceId,
                )
                .eq(
                  'kind',
                  'penalty',
                ),
          )
          .collect();
      }

      async function createClaimableOccurrence({
        title,
        valueSek,
        occurrenceState,
        claimState,
      }: {
        title:
          string;

        valueSek:
          number;

        occurrenceState:
          'available' |
          'failed';

        claimState:
          'claimed' |
          'failed';
      }) {
        const occurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                claimableDefinitionId,

              kind:
                'claimable',

              title,

              valueSek,

              scheduledLocalDate:
                '2030-01-04',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt,

              deadlineAt:
                now,

              eligibleChildIds:
                [
                  childId,
                ],

              isUnlockChore:
                false,

              state:
                occurrenceState,

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
                claimState,

              claimedAt:
                availabilityStartsAt +
                60_000,
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

        /*
         * 1. Money cannot be written before
         * the authoritative terminal state.
         */
        const primary =
          await createClaimableOccurrence({
            title:
              'Primary failed commitment',

            valueSek:
              140,

            occurrenceState:
              'available',

            claimState:
              'claimed',
          });

        await expectFailure(
          () =>
            ensureClaimableFailurePenalty(
              ctx,
              primary.claimId,
              now,
            ),
          'An unresolved Claim must not receive a penalty.',
        );

        const prematurePenalties =
          await penaltiesFor(
            primary.occurrenceId,
          );

        assert(
          prematurePenalties.length ===
            0,
          'Rejected premature penalty must create no Ledger Entry.',
        );

        passed +=
          1;

        console.log(
          '✅ 1/5 unresolved Claim cannot be penalized',
        );

        /*
         * Change the Parent-authored
         * definition after occurrence
         * creation.
         *
         * Financial history must still use
         * the immutable occurrence snapshot.
         */
        await ctx.db.patch(
          claimableDefinitionId,
          {
            valueSek:
              999,

            updatedAt:
              now,
          },
        );

        await ctx.db.patch(
          primary.claimId,
          {
            state:
              'failed',
          },
        );

        await ctx.db.patch(
          primary.occurrenceId,
          {
            state:
              'failed',
          },
        );

        const created =
          await ensureClaimableFailurePenalty(
            ctx,
            primary.claimId,
            now + 1,
          );

        const primaryPenalties =
          await penaltiesFor(
            primary.occurrenceId,
          );

        assert(
          created.created &&
          created.amountSek ===
            -140 &&
          created.childId ===
            childId &&
          primaryPenalties.length ===
            1 &&
          primaryPenalties[0]
            .amountSek ===
            -140,
          'Failed Claimable Chore must create one full immutable-value penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 2/5 failed Claim uses immutable occurrence value',
        );

        /*
         * 3. Repeated reconciliation must
         * reuse the first financial fact.
         */
        const repeated =
          await ensureClaimableFailurePenalty(
            ctx,
            primary.claimId,
            now + 2,
          );

        const repeatedPenalties =
          await penaltiesFor(
            primary.occurrenceId,
          );

        assert(
          !repeated.created &&
          repeated.ledgerEntryId ===
            created.ledgerEntryId &&
          repeatedPenalties.length ===
            1,
          'Repeated penalty reconciliation must not double-charge the Child.',
        );

        passed +=
          1;

        console.log(
          '✅ 3/5 repeated penalty reconciliation is idempotent',
        );

        /*
         * 4. Defensive finance invariant:
         * one occurrence cannot both earn
         * and incur the failure penalty.
         */
        const earnedFailure =
          await createClaimableOccurrence({
            title:
              'Conflicting earning fixture',

            valueSek:
              75,

            occurrenceState:
              'failed',

            claimState:
              'failed',
          });

        await ctx.db.insert(
          'ledgerEntries',
          {
            householdId,

            childId,

            occurrenceId:
              earnedFailure
                .occurrenceId,

            kind:
              'earning',

            amountSek:
              75,

            createdAt:
              now,
          },
        );

        await expectFailure(
          () =>
            ensureClaimableFailurePenalty(
              ctx,
              earnedFailure.claimId,
              now + 3,
            ),
          'An occurrence with an earning must not also receive a penalty.',
        );

        const conflictingPenalties =
          await penaltiesFor(
            earnedFailure.occurrenceId,
          );

        assert(
          conflictingPenalties.length ===
            0,
          'Earning conflict must not create a penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 4/5 earned occurrence cannot also receive failure penalty',
        );

        /*
         * 5. Personal chores never create
         * debt, even under malformed direct
         * test data that contains a Claim.
         */
        const personalOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                personalDefinitionId,

              kind:
                'personal',

              title:
                'Personal failure guard',

              valueSek:
                90,

              scheduledLocalDate:
                '2030-01-04',

              timezone:
                'Europe/Stockholm',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt,

              deadlineAt:
                now,

              personalChildId:
                childId,

              isUnlockChore:
                false,

              state:
                'failed',

              createdAt:
                availabilityStartsAt,
            },
          );

        occurrenceIds.push(
          personalOccurrenceId,
        );

        const malformedPersonalClaimId =
          await ctx.db.insert(
            'choreClaims',
            {
              householdId,

              occurrenceId:
                personalOccurrenceId,

              childId,

              state:
                'failed',

              claimedAt:
                availabilityStartsAt,
            },
          );

        claimIds.push(
          malformedPersonalClaimId,
        );

        await expectFailure(
          () =>
            ensureClaimableFailurePenalty(
              ctx,
              malformedPersonalClaimId,
              now + 4,
            ),
          'Personal Chores must never receive a monetary failure penalty.',
        );

        const personalPenalties =
          await penaltiesFor(
            personalOccurrenceId,
          );

        assert(
          personalPenalties.length ===
            0,
          'Personal failure must create no penalty.',
        );

        passed +=
          1;

        console.log(
          '✅ 5/5 Personal failure cannot create debt',
        );

        return {
          passed,

          total:
            5,
        };
      } finally {
        for (
          const occurrenceId of
          occurrenceIds
        ) {
          const entries =
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
            entries
          ) {
            await ctx.db.delete(
              entry._id,
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
          claimableDefinitionId,
        );

        await ctx.db.delete(
          personalDefinitionId,
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
