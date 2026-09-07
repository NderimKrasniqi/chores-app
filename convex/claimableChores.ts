import {
  mutation,
  query,
} from './_generated/server';
import {
  v,
} from 'convex/values';

import { requireCurrentChildAccess } from './lib/childAuthorization';
import { claimClaimableOccurrence } from './lib/claimableChoreClaiming';
import {
  listHouseholdClaimedOccurrences,
  listVisibleClaimableOccurrencesForChild,
} from './lib/claimableChoreVisibility';
import { requireCurrentParentForHousehold } from './lib/parentAuthorization';

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

      const [
        visible,
        claimed,
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
            }),
          ),

        claimedOccurrences:
          claimed.map(
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

              isMine:
                item.child._id ===
                child._id,
            }),
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
    },

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

      return await claimClaimableOccurrence(
        ctx,
        household._id,
        child._id,
        args.occurrenceId,
      );
    },
  });
