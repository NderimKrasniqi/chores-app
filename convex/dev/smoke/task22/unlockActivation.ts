import {
  ConvexError,
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  getClaimableAccessGateForChild,
} from '../../../lib/claims/accessGate';
import {
  reconcileOccurrenceLifecycle,
} from '../../../lib/occurrences/lifecycle';

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
          2,
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
              'TASK22 Unlock Activation',

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
              'Unlock Child',

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
              'personal',

            title:
              'Unlock fixture',

            valueSek:
              20,

            recurrence: {
              kind:
                'daily',

              startDate:
                '2031-03-01',

              interval:
                1,
            },

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childId,

            isUnlockChore:
              true,

            createdByAuthUserId:
              'task22-smoke',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const olderOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'Older approved Unlock',

            valueSek:
              20,

            scheduledLocalDate:
              '2031-03-09',

            timezone:
              'UTC',

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              24 *
                60 *
                60 *
                1000,

            availabilityReachedAt:
              now -
              24 *
                60 *
                60 *
                1000,

            deadlineAt:
              now -
              16 *
                60 *
                60 *
                1000,

            personalChildId:
              childId,

            isUnlockChore:
              true,

            state:
              'approved',

            createdAt:
              now,
          },
        );

      const futureStartsAt =
        now +
        60 *
          60 *
          1000;

      const futureOccurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'Future Unlock',

            valueSek:
              20,

            scheduledLocalDate:
              '2031-03-10',

            timezone:
              'UTC',

            deadlineLocalTime:
              '20:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              futureStartsAt,

            deadlineAt:
              futureStartsAt +
              8 *
                60 *
                60 *
                1000,

            personalChildId:
              childId,

            isUnlockChore:
              true,

            state:
              'scheduled',

            createdAt:
              now,
          },
        );

      try {
        const before =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        if (
          !before
            .canAccessClaimables ||
          before
            .currentUnlockOccurrence
            ?.occurrenceId !==
            olderOccurrenceId
        ) {
          throw new Error(
            'Future scheduled Unlock replaced the activated current Unlock too early.',
          );
        }

        const transition =
          await reconcileOccurrenceLifecycle(
            ctx,
            futureOccurrenceId,
            futureStartsAt,
          );

        if (
          !transition.changed ||
          transition.nextState !==
            'available'
        ) {
          throw new Error(
            'Future Unlock did not activate at its exact availability boundary.',
          );
        }

        const activated =
          await ctx.db.get(
            futureOccurrenceId,
          );

        if (
          !activated ||
          activated
            .availabilityReachedAt !==
            futureStartsAt
        ) {
          throw new Error(
            'Unlock activation fact was not persisted.',
          );
        }

        /*
         * Deliberately pass the old clock.
         *
         * The gate must still switch because
         * selection is based on durable
         * activation state, not Date.now().
         */
        const after =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        if (
          after
            .canAccessClaimables ||
          after
            .currentUnlockOccurrence
            ?.occurrenceId !==
            futureOccurrenceId ||
          after
            .currentUnlockOccurrence
            ?.state !==
            'available'
        ) {
          throw new Error(
            'Unlock gate did not switch from the durable activation transition.',
          );
        }

        return {
          passed:
            true,
        };
      } finally {
        await ctx.db.delete(
          futureOccurrenceId,
        );

        await ctx.db.delete(
          olderOccurrenceId,
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
