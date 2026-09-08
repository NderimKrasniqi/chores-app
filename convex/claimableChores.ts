import {
  v,
} from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/auth/childAuthorization';
import { claimClaimableOccurrence } from './lib/claims/claiming';
import {
  listHouseholdClaimedOccurrences,
  listVisibleClaimableOccurrencesForChild,
} from './lib/claims/visibility';
import { getClaimUnclaimStatus } from './lib/claims/commitmentRules';
import { getWeeklyUnclaimUsageForChild } from './lib/claims/unclaimAccounting';
import { unclaimClaimableClaim } from './lib/claims/unclaiming';
import { requireCurrentParentForHousehold } from './lib/auth/parentAuthorization';
import {
  scheduleClaimNotifications,
} from './lib/notifications/orchestration';
import {
  activeClaimsForParentValidator,
  claimableChoreListValidator,
  claimResultValidator,
  unclaimResultValidator,
} from './lib/api/choreContracts';

type ActiveClaimState =
  | 'claimed'
  | 'submitted'
  | 'redo_required';

function getCommitmentStatus({
  deadlineAt,
  commitmentLockReachedAt,
  now,
  allowance,
  usedUnclaims,
}: {
  deadlineAt: number;

  commitmentLockReachedAt?:
    number;

  now: number;

  allowance: number;

  usedUnclaims: number;
}) {
  const status =
    getClaimUnclaimStatus({
      deadlineAt,
      now,

      weeklyUnclaimAllowance:
        allowance,

      usedUnclaims,
    });

  const isTimeLocked =
    commitmentLockReachedAt !==
      undefined ||
    status.isTimeLocked;

  const isImmediatelyLocked =
    isTimeLocked ||
    !status
      .hasUnclaimAllowance;

  return {
    lockAt:
      status.lockAt,

    isTimeLocked,

    hasUnclaimAllowance:
      status
        .hasUnclaimAllowance,

    remainingUnclaims:
      status
        .remainingUnclaims,

    canUnclaim:
      !isTimeLocked &&
      status
        .hasUnclaimAllowance,

    isImmediatelyLocked,

    lockReason:
      isTimeLocked
        ? 'time_window' as const
        : !status
              .hasUnclaimAllowance
          ? 'allowance_exhausted' as const
          : null,
  };
}

export const listMine =
  query({
    args: {},

    returns:
      claimableChoreListValidator,

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

      const [
        visible,
        claimed,
        usage,
      ] =
        await Promise.all([
          listVisibleClaimableOccurrencesForChild(
            ctx,
            household._id,
            child._id,
            now,
          ),

          listHouseholdClaimedOccurrences(
            ctx,
            household._id,
          ),

          getWeeklyUnclaimUsageForChild(
            ctx,
            household,
            child._id,
            now,
          ),
        ]);

      return {
        gate: {
          canAccessClaimables:
            visible.gate
              .canAccessClaimables,

          reason:
            visible.gate
              .reason,

          currentUnlockOccurrence:
            visible.gate
              .currentUnlockOccurrence
              ? {
                  occurrenceId:
                    visible.gate
                      .currentUnlockOccurrence
                      .occurrenceId,

                  state:
                    visible.gate
                      .currentUnlockOccurrence
                      .state,

                  scheduledLocalDate:
                    visible.gate
                      .currentUnlockOccurrence
                      .scheduledLocalDate,

                  availabilityStartsAt:
                    visible.gate
                      .currentUnlockOccurrence
                      .availabilityStartsAt,

                  deadlineAt:
                    visible.gate
                      .currentUnlockOccurrence
                      .deadlineAt,
                }
              : null,
        },

        unclaimAllowance: {
          allowance:
            usage.allowance,

          usedUnclaims:
            usage.usedUnclaims,

          remainingUnclaims:
            usage.remainingUnclaims,

          payoutWeek: {
            startLocalDate:
              usage
                .payoutWeek
                .startLocalDate,

            endLocalDate:
              usage
                .payoutWeek
                .endLocalDate,

            startAt:
              usage
                .payoutWeek
                .startAt,

            endAt:
              usage
                .payoutWeek
                .endAt,
          },
        },

        claimableOccurrences:
          visible.occurrences.map(
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

              state:
                occurrence.state,

              commitment:
                getCommitmentStatus({
                  deadlineAt:
                    occurrence
                      .deadlineAt,

                  commitmentLockReachedAt:
                    occurrence
                      .commitmentLockReachedAt,

                  now,

                  allowance:
                    usage.allowance,

                  usedUnclaims:
                    usage
                      .usedUnclaims,
                }),
            }),
          ),

        claimedOccurrences:
          claimed.map(
            (
              item,
            ) => {
              const isMine =
                item.child._id ===
                child._id;

              const commitment =
                isMine &&
                item.claim.state ===
                  'claimed'
                  ? getCommitmentStatus({
                      deadlineAt:
                        item
                          .occurrence
                          .deadlineAt,

                      commitmentLockReachedAt:
                        item
                          .occurrence
                          .commitmentLockReachedAt,

                      now,

                      allowance:
                        usage
                          .allowance,

                      usedUnclaims:
                        usage
                          .usedUnclaims,
                    })
                  : null;

              return {
                claimId:
                  item.claim._id,

                occurrenceId:
                  item.occurrence._id,

                childId:
                  item.child._id,

                claimedByDisplayName:
                  item.child
                    .displayName,

                claimState:
                  item.claim.state,

                claimedAt:
                  item.claim
                    .claimedAt,

                title:
                  item.occurrence
                    .title,

                description:
                  item.occurrence
                    .description,

                valueSek:
                  item.occurrence
                    .valueSek,

                scheduledLocalDate:
                  item.occurrence
                    .scheduledLocalDate,

                timezone:
                  item.occurrence
                    .timezone,

                deadlineAt:
                  item.occurrence
                    .deadlineAt,

                isMine,

                commitment,
              };
            },
          ),
      };
    },
  });

export const listActiveForParent =
  query({
    args: {
      householdId:
        v.id(
          'households',
        ),
    },

    returns:
      activeClaimsForParentValidator,

    handler: async (
      ctx,
      args,
    ) => {
      await requireCurrentParentForHousehold(
        ctx,
        args.householdId,
      );

      const claimed =
        await listHouseholdClaimedOccurrences(
          ctx,
          args.householdId,
        );

      /*
       * listHouseholdClaimedOccurrences
       * already filters to unresolved active
       * ownership states.
       *
       * Narrow the state at this public API
       * boundary so the generated Convex
       * client type expresses that invariant
       * instead of the entire Claim schema
       * union.
       */
      return claimed.map(
        (
          item,
        ) => ({
          claimId:
            item.claim._id,

          occurrenceId:
            item.occurrence._id,

          childId:
            item.child._id,

          claimedByDisplayName:
            item.child
              .displayName,

          claimState:
            item.claim.state as
              ActiveClaimState,

          claimedAt:
            item.claim
              .claimedAt,

          title:
            item.occurrence
              .title,

          description:
            item.occurrence
              .description,

          valueSek:
            item.occurrence
              .valueSek,

          scheduledLocalDate:
            item.occurrence
              .scheduledLocalDate,

          timezone:
            item.occurrence
              .timezone,

          deadlineAt:
            item.occurrence
              .deadlineAt,
        }),
      );
    },
  });

export const claim =
  mutation({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),

      acceptImmediateLock:
        v.optional(
          v.boolean(),
        ),
    },

    returns:
      claimResultValidator,

    handler: async (
      ctx,
      args,
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

      const result =
        await claimClaimableOccurrence(
          ctx,
          household._id,
          child._id,
          args.occurrenceId,
          now,
          args.acceptImmediateLock ??
            false,
        );

      await scheduleClaimNotifications(
        ctx,
        result.claimId,
        {
          now,
        },
      );

      return result;
    },
  });

export const unclaim =
  mutation({
    args: {
      claimId:
        v.id(
          'choreClaims',
        ),
    },

    returns:
      unclaimResultValidator,

    handler: async (
      ctx,
      args,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await unclaimClaimableClaim(
        ctx,
        household._id,
        child._id,
        args.claimId,
      );
    },
  });
