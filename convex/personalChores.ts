import { v } from 'convex/values';

import {
  mutation,
  query,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/auth/childAuthorization';
import {
  listPersonalOccurrencesForChild,
  submitPersonalOccurrence,
} from './lib/personal/execution';
import {
  submitPersonalRedo,
} from './lib/redos/submission';

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
 * Attempt 1.
 *
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

/*
 * Attempt 2 — the one permitted Redo.
 *
 * The active deadline comes from the
 * durable choreRedos record rather than
 * the original occurrence deadline.
 */
export const submitRedo =
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

      return await submitPersonalRedo(
        ctx,
        args.occurrenceId,
        child._id,
      );
    },
  });
