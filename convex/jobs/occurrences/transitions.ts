import { v } from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import { reconcileOccurrenceLifecycle } from '../../lib/occurrences/lifecycle';

const occurrenceStateValidator =
  v.union(
    v.literal(
      'scheduled',
    ),
    v.literal(
      'available',
    ),
    v.literal(
      'submitted',
    ),
    v.literal(
      'redo_required',
    ),
    v.literal(
      'approved',
    ),
    v.literal(
      'missed',
    ),
    v.literal(
      'failed',
    ),
    v.literal(
      'cancelled',
    ),
    v.literal(
      'expired_unclaimed',
    ),
  );

/*
 * Durable scheduled transition seam.
 *
 * This function is intentionally
 * internal: phones cannot directly
 * advance occurrence lifecycle state.
 */
export const reconcile =
  internalMutation({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),
    },

    returns:
      v.object({
        found:
          v.boolean(),

        changed:
          v.boolean(),

        previousState:
          v.optional(
            occurrenceStateValidator,
          ),

        nextState:
          v.optional(
            occurrenceStateValidator,
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      return await reconcileOccurrenceLifecycle(
        ctx,
        args.occurrenceId,
      );
    },
  });
