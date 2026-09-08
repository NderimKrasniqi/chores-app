import {
  ConvexError,
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  claimClaimableOccurrence,
} from '../../../lib/claims/claiming';
import {
  reconcileClaimCommitmentLock,
} from '../../../lib/claims/commitmentLifecycle';
import {
  getClaimCommitmentLockAt,
} from '../../../lib/claims/commitmentRules';

export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        passed:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      if (
        process.env
          .APP_ENV ===
        'production'
      ) {
        throw new ConvexError(
          'Developer smoke tests are disabled in production.',
        );
      }

      const now =
        Date.UTC(
          2031,
          1,
          10,
          12,
          0,
          0,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Claim Lock',

            timezone:
              'UTC',

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
              'Lock Child',

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
              'Claim lock fixture',

            valueSek:
              50,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2031-02-10',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task22-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const lockedDeadline =
        now +
        3 *
          60 *
          60 *
          1000;

      const lockAt =
        getClaimCommitmentLockAt(
          lockedDeadline,
        );

      const lockOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'claimable',

            title:
              'Reactive lock',

            valueSek:
              50,

            scheduledLocalDate:
              '2031-02-10',

            timezone:
              'UTC',

            deadlineLocalTime:
              '15:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt:
              lockedDeadline,

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      const unrestrictedOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'claimable',

            title:
              'Unrestricted Claimable',

            valueSek:
              60,

            scheduledLocalDate:
              '2031-02-10',

            timezone:
              'UTC',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt:
              now +
              6 *
                60 *
                60 *
                1000,

            /*
             * Deliberately omitted:
             * eligibleChildIds.
             *
             * Undefined means all Household
             * Children.
             */
            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      let claimId:
        Awaited<
          ReturnType<
            typeof claimClaimableOccurrence
          >
        >['claimId'] |
        null =
        null;

      try {
        const before =
          await reconcileClaimCommitmentLock(
            ctx,
            lockOccurrenceId,
            lockAt -
              1,
          );

        const beforeDoc =
          await ctx.db.get(
            lockOccurrenceId,
          );

        if (
          before.changed ||
          !beforeDoc ||
          beforeDoc
            .commitmentLockReachedAt !==
            undefined
        ) {
          throw new Error(
            'Commitment lock transitioned before the exact boundary.',
          );
        }

        const exact =
          await reconcileClaimCommitmentLock(
            ctx,
            lockOccurrenceId,
            lockAt,
          );

        const exactDoc =
          await ctx.db.get(
            lockOccurrenceId,
          );

        if (
          !exact.changed ||
          !exactDoc ||
          exactDoc
            .commitmentLockReachedAt !==
            lockAt
        ) {
          throw new Error(
            'Commitment lock was not persisted at the exact boundary.',
          );
        }

        const repeated =
          await reconcileClaimCommitmentLock(
            ctx,
            lockOccurrenceId,
            lockAt +
              1,
          );

        if (
          repeated.changed
        ) {
          throw new Error(
            'Commitment lock reconciliation must be idempotent.',
          );
        }

        const claim =
          await claimClaimableOccurrence(
            ctx,
            householdId,
            childId,
            unrestrictedOccurrenceId,
            now,
            false,
          );

        claimId =
          claim.claimId;

        if (
          claim.childId !==
            childId ||
          claim.occurrenceId !==
            unrestrictedOccurrenceId
        ) {
          throw new Error(
            'Unrestricted Claimable was not claimable by Household Child.',
          );
        }

        return {
          passed:
            true,
        };
      } finally {
        if (claimId) {
          const claim =
            await ctx.db.get(
              claimId,
            );

          if (claim) {
            await ctx.db.delete(
              claim._id,
            );
          }
        }

        await ctx.db.delete(
          unrestrictedOccurrenceId,
        );

        await ctx.db.delete(
          lockOccurrenceId,
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
      }
    },
  });
