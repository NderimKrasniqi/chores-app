import {
  ConvexError,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import { getClaimableAccessGateForChild } from '../../../lib/claimableAccessGate';

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
                'TASK-09 Unlock Gate Smoke',

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
                'TASK-09 Child',

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
                'Daily Unlock',

              valueSek:
                20,

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

        /*
         * 1. No current Unlock occurrence
         * means no active gate.
         */
        const noUnlock =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'No current Unlock occurrence leaves Claimable access open',
            noUnlock
              .canAccessClaimables ===
              true &&
              noUnlock.reason ===
                'no_current_unlock' &&
              noUnlock
                .currentUnlockOccurrence ===
                null,
            JSON.stringify(
              noUnlock,
            ),
          ),
        );

        /*
         * 2. A future Unlock occurrence
         * must not lock access early.
         */
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
                '2030-01-16',

              timezone:
                'UTC',

              deadlineLocalTime:
                '20:00',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now +
                24 *
                  60 *
                  60 *
                  1000,

              deadlineAt:
                now +
                32 *
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

        const beforeFuture =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Future Unlock occurrence does not lock access before availability',
            beforeFuture
              .canAccessClaimables ===
              true &&
              beforeFuture.reason ===
                'no_current_unlock',
            JSON.stringify(
              beforeFuture,
            ),
          ),
        );

        /*
         * 3. An approved current Unlock
         * opens Claimable access.
         */
        const olderApprovedId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Older Approved Unlock',

              valueSek:
                20,

              scheduledLocalDate:
                '2030-01-14',

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

        const approvedCurrent =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Approved current Unlock occurrence opens Claimable access',
            approvedCurrent
              .canAccessClaimables ===
              true &&
              approvedCurrent.reason ===
                'current_unlock_approved' &&
              approvedCurrent
                .currentUnlockOccurrence
                ?.occurrenceId ===
                olderApprovedId,
            JSON.stringify(
              approvedCurrent,
            ),
          ),
        );

        /*
         * 4. Once a newer occurrence
         * reaches availability, the older
         * approval no longer unlocks.
         */
        const newerOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Current Unlock',

              valueSek:
                20,

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

        const newerAvailable =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Newer available Unlock relocks Claimable access',
            newerAvailable
              .canAccessClaimables ===
              false &&
              newerAvailable
                .currentUnlockOccurrence
                ?.occurrenceId ===
                newerOccurrenceId &&
              newerAvailable.reason ===
                'current_unlock_not_approved',
            JSON.stringify(
              newerAvailable,
            ),
          ),
        );

        /*
         * 5. Submission alone does not
         * unlock Claimable access.
         */
        await ctx.db.patch(
          newerOccurrenceId,
          {
            state:
              'submitted',
          },
        );

        const submitted =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Submitted Unlock does not open Claimable access',
            submitted
              .canAccessClaimables ===
              false &&
              submitted
                .currentUnlockOccurrence
                ?.state ===
                'submitted',
            JSON.stringify(
              submitted,
            ),
          ),
        );

        /*
         * 6. Parent approval of the
         * current occurrence opens access.
         */
        await ctx.db.patch(
          newerOccurrenceId,
          {
            state:
              'approved',
          },
        );

        const newerApproved =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Approval of current Unlock opens Claimable access',
            newerApproved
              .canAccessClaimables ===
              true &&
              newerApproved.reason ===
                'current_unlock_approved' &&
              newerApproved
                .currentUnlockOccurrence
                ?.occurrenceId ===
                newerOccurrenceId,
            JSON.stringify(
              newerApproved,
            ),
          ),
        );

        /*
         * 7. A newer missed Unlock becomes
         * current and closes access again.
         */
        const missedOccurrenceId =
          await ctx.db.insert(
            'choreOccurrences',
            {
              householdId,

              choreDefinitionId:
                definitionId,

              kind:
                'personal',

              title:
                'Missed Current Unlock',

              valueSek:
                20,

              scheduledLocalDate:
                '2030-01-15',

              timezone:
                'UTC',

              deadlineLocalTime:
                '11:30',

              deadlineDayOffset:
                0,

              availabilityStartsAt:
                now -
                30 *
                  60 *
                  1000,

              deadlineAt:
                now -
                1,

              personalChildId:
                childId,

              isUnlockChore:
                true,

              state:
                'missed',

              createdAt:
                now + 1,
            },
          );

        const missedCurrent =
          await getClaimableAccessGateForChild(
            ctx,
            childId,
            now,
          );

        results.push(
          result(
            'Missed current Unlock keeps Claimable access locked',
            missedCurrent
              .canAccessClaimables ===
              false &&
              missedCurrent
                .currentUnlockOccurrence
                ?.occurrenceId ===
                missedOccurrenceId &&
              missedCurrent
                .currentUnlockOccurrence
                ?.state ===
                'missed',
            JSON.stringify(
              missedCurrent,
            ),
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
