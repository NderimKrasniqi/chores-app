import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import { listVisibleClaimableOccurrencesForChild } from '../../../lib/claims/visibility';

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

export const run =
  internalMutation({
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

        const now =
          Date.UTC(
            2030,
            0,
            15,
            12,
            0,
            0,
            0,
          );

        const householdId =
          await ctx.db.insert(
            'households',
            {
              name:
                'TASK-09 Visibility Smoke',

              timezone:
                'UTC',

              payoutWeekday:
                'friday',

              weeklyUnclaimAllowance:
                1,

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
                'Eligible Child',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const otherChildId =
          await ctx.db.insert(
            'children',
            {
              householdId,

              displayName:
                'Other Child',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const unlockDefinitionId =
          await ctx.db.insert(
            'choreDefinitions',
            {
              householdId,

              kind:
                'personal',

              title:
                'Unlock Chore',

              valueSek:
                10,

              recurrence: {
                kind:
                  'daily',

                startDate:
                  '2030-01-01',

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
                'task09-smoke',

              createdAt:
                now,

              updatedAt:
                now,
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
                'Claimable Chore',

              valueSek:
                30,

              recurrence: {
                kind:
                  'daily',

                startDate:
                  '2030-01-01',

                interval:
                  1,
              },

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              eligibleChildIds: [
                childId,
              ],

              isUnlockChore:
                false,

              createdByAuthUserId:
                'task09-smoke',

              createdAt:
                now,

              updatedAt:
                now,
            },
          );

        const eligibleOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                claimableDefinitionId,

              kind:
                'claimable',

              title:
                'Visible Claimable',

              valueSek:
                30,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'UTC',

              deadlineLocalTime:
                '18:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now -
                60 *
                  60 *
                  1000,

              deadlineAt:
                now +
                6 *
                  60 *
                  60 *
                  1000,

              eligibleChildIds: [
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

        /*
         * 1. With no current Unlock
         * occurrence, the eligible
         * Claimable Chore is visible.
         */
        const noUnlock =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Eligible Claimable is visible when no current Unlock gate exists',
            noUnlock.gate
              .canAccessClaimables ===
              true &&
              noUnlock
                .occurrences.length ===
                1 &&
              noUnlock
                .occurrences[0]
                ?._id ===
                eligibleOccurrenceId,
            JSON.stringify({
              gate:
                noUnlock.gate,
              count:
                noUnlock
                  .occurrences
                  .length,
            }),
          ),
        );

        /*
         * 2. Current unapproved Unlock
         * closes the pool completely.
         */
        const unlockOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                unlockDefinitionId,

              kind:
                'personal',

              title:
                'Current Unlock',

              valueSek:
                10,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'UTC',

              deadlineLocalTime:
                '20:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now -
                2 *
                  60 *
                  60 *
                  1000,

              deadlineAt:
                now +
                8 *
                  60 *
                  60 *
                  1000,

              personalChildId:
                childId,

              isUnlockChore:
                true,

              state:
                'available',

              createdAt:
                now,
            },
          );

        const locked =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Unapproved current Unlock hides the Claimable pool',
            locked.gate
              .canAccessClaimables ===
              false &&
              locked
                .occurrences.length ===
                0,
            JSON.stringify({
              gate:
                locked.gate,
              count:
                locked
                  .occurrences
                  .length,
            }),
          ),
        );

        /*
         * 3. Submission is still locked.
         */
        await ctx.db.patch(
          unlockOccurrenceId,
          {
            state:
              'submitted',
          },
        );

        const submitted =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Submitted Unlock still hides the Claimable pool',
            submitted.gate
              .canAccessClaimables ===
              false &&
              submitted
                .occurrences.length ===
                0,
            JSON.stringify(
              submitted.gate,
            ),
          ),
        );

        /*
         * 4. Approval opens the pool.
         */
        await ctx.db.patch(
          unlockOccurrenceId,
          {
            state:
              'approved',
          },
        );

        const approved =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Approved current Unlock exposes eligible Claimable Chores',
            approved.gate
              .canAccessClaimables ===
              true &&
              approved
                .occurrences.length ===
                1 &&
              approved
                .occurrences[0]
                ?._id ===
                eligibleOccurrenceId,
            JSON.stringify({
              gate:
                approved.gate,
              count:
                approved
                  .occurrences
                  .length,
            }),
          ),
        );

        /*
         * 5. An available Claimable that
         * excludes this Child is hidden.
         */
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'Ineligible Claimable',

            valueSek:
              40,

            scheduledLocalDate:
              '2030-01-16',

            timezone:
              'UTC',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              30 *
                60 *
                1000,

            deadlineAt:
              now +
              5 *
                60 *
                60 *
                1000,

            eligibleChildIds: [
              otherChildId,
            ],

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

        const eligibility =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Ineligible Claimable Chore is hidden',
            eligibility
              .occurrences.length ===
              1 &&
              eligibility
                .occurrences[0]
                ?._id ===
                eligibleOccurrenceId,
            `${eligibility.occurrences.length} visible`,
          ),
        );

        /*
         * 6. Future Claimables are hidden
         * before availability.
         */
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'Future Claimable',

            valueSek:
              50,

            scheduledLocalDate:
              '2030-01-17',

            timezone:
              'UTC',

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now +
              60 *
                60 *
                1000,

            deadlineAt:
              now +
              7 *
                60 *
                60 *
                1000,

            eligibleChildIds: [
              childId,
            ],

            isUnlockChore:
              false,

            state:
              'scheduled',

            createdAt:
              now,
          },
        );

        const future =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Future Claimable Chore is hidden before availability',
            future
              .occurrences.length ===
              1 &&
              future
                .occurrences[0]
                ?._id ===
                eligibleOccurrenceId,
            `${future.occurrences.length} visible`,
          ),
        );

        /*
         * 7. Overdue Claimables are
         * defensively hidden even if a
         * stale lifecycle state still says
         * available.
         */
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              claimableDefinitionId,

            kind:
              'claimable',

            title:
              'Overdue Claimable',

            valueSek:
              60,

            scheduledLocalDate:
              '2030-01-14',

            timezone:
              'UTC',

            deadlineLocalTime:
              '10:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now -
              4 *
                60 *
                60 *
                1000,

            deadlineAt:
              now -
              1,

            eligibleChildIds: [
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

        const overdue =
          await listVisibleClaimableOccurrencesForChild(
            ctx,
            householdId,
            childId,
            now,
          );

        results.push(
          result(
            'Overdue Claimable Chore is hidden defensively',
            overdue
              .occurrences.length ===
              1 &&
              overdue
                .occurrences[0]
                ?._id ===
                eligibleOccurrenceId,
            `${overdue.occurrences.length} visible`,
          ),
        );

        /*
         * Cleanup.
         */
        const occurrences =
          await ctx.db
            .query(
              'choreOccurrences',
            )
            .withIndex(
              'by_household',
              (q) =>
                q.eq(
                  'householdId',
                  householdId,
                ),
            )
            .collect();

        for (
          const occurrence of
          occurrences
        ) {
          await ctx.db.delete(
            occurrence._id,
          );
        }

        await ctx.db.delete(
          claimableDefinitionId,
        );

        await ctx.db.delete(
          unlockDefinitionId,
        );

        await ctx.db.delete(
          otherChildId,
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
