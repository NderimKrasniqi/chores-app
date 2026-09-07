import {
  query,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/childAuthorization';
import { listVisibleClaimableOccurrencesForChild } from './lib/claimableChoreVisibility';

/*
 * Child-facing Claimable Chore pool.
 *
 * TASK-09 exposes visibility only.
 * Claim creation belongs to TASK-10.
 *
 * Child and Household identity are always
 * resolved from the authenticated anonymous
 * Child-device session.
 *
 * The client does not supply childId or
 * householdId.
 *
 * The server-side visibility helper applies
 * the current Unlock Chore gate and Child
 * eligibility rules before any Claimable
 * occurrence data is returned.
 */
export const listMine =
  query({
    args: {},

    handler: async (
      ctx,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      const now =
        Date.now();

      const {
        gate,
        occurrences,
      } =
        await listVisibleClaimableOccurrencesForChild(
          ctx,
          household._id,
          child._id,
          now,
        );

      return {
        /*
         * TASK-09 UI can use this to explain
         * why the pool is locked or unlocked.
         */
        gate: {
          canAccessClaimables:
            gate.canAccessClaimables,

          reason:
            gate.reason,

          currentUnlockOccurrence:
            gate.currentUnlockOccurrence
              ? {
                  occurrenceId:
                    gate
                      .currentUnlockOccurrence
                      .occurrenceId,

                  state:
                    gate
                      .currentUnlockOccurrence
                      .state,

                  scheduledLocalDate:
                    gate
                      .currentUnlockOccurrence
                      .scheduledLocalDate,

                  availabilityStartsAt:
                    gate
                      .currentUnlockOccurrence
                      .availabilityStartsAt,

                  deadlineAt:
                    gate
                      .currentUnlockOccurrence
                      .deadlineAt,
                }
              : null,
        },

        /*
         * When the Unlock gate is closed,
         * listVisibleClaimableOccurrencesForChild
         * returns an empty array.
         *
         * This means Claimable Chore visibility
         * is enforced by the backend rather than
         * merely hidden by React Native.
         */
        claimableOccurrences:
          occurrences.map(
            (
              occurrence,
            ) => ({
              occurrenceId:
                occurrence._id,

              choreDefinitionId:
                occurrence
                  .choreDefinitionId,

              title:
                occurrence.title,

              description:
                occurrence.description,

              valueSek:
                occurrence.valueSek,

              scheduledLocalDate:
                occurrence
                  .scheduledLocalDate,

              timezone:
                occurrence.timezone,

              availabilityStartsAt:
                occurrence
                  .availabilityStartsAt,

              deadlineAt:
                occurrence.deadlineAt,

              /*
               * TASK-09 only returns
               * available Claimable Chores.
               *
               * We expose the state anyway so
               * the UI contract remains explicit
               * and future TASK-10 work does not
               * have to infer it.
               */
              state:
                occurrence.state,
            }),
          ),
      };
    },
  });
