import { v } from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/childAuthorization';
import {
  listPersonalOccurrencesForChild,
  submitPersonalOccurrence,
} from './lib/personalChoreExecution';

/*
 * Child-facing Personal Chore view.
 *
 * The backend returns the Child's
 * occurrence history. Presentation
 * decides which recurring occurrence
 * is currently relevant.
 *
 * canSubmit is advisory UI state only.
 * The mutation independently re-checks
 * every invariant.
 */
export const listMine =
  query({
    args: {},

    handler: async (
      ctx,
    ) => {
      const {
        child,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      const now =
        Date.now();

      const occurrences =
        await listPersonalOccurrencesForChild(
          ctx,
          child._id,
        );

      return occurrences.map(
        (occurrence) => ({
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

          isUnlockChore:
            occurrence
              .isUnlockChore,

          canSubmit:
            occurrence.state ===
              'available' &&
            now >=
              occurrence
                .availabilityStartsAt &&
            now <=
              occurrence
                .deadlineAt,
        }),
      );
    },
  });

/*
 * Child submits completed Personal work.
 *
 * The app does not supply submittedAt.
 * Convex server time is authoritative.
 */
export const submit =
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
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await submitPersonalOccurrence(
        ctx,
        args.occurrenceId,
        child._id,
      );
    },
  });
