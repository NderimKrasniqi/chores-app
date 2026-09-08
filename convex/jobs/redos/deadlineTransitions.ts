import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  reconcileRedoDeadlineFailure,
} from '../../lib/redos/deadlineFailure';

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
 * Internal exact-time Redo deadline seam.
 *
 * Phones cannot directly advance Redo
 * lifecycle state.
 */
export const reconcile =
  internalMutation({
    args: {
      redoId:
        v.id(
          'choreRedos',
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

        occurrenceId:
          v.optional(
            v.id(
              'choreOccurrences',
            ),
          ),

        claimId:
          v.optional(
            v.id(
              'choreClaims',
            ),
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      return await reconcileRedoDeadlineFailure(
        ctx,
        args.redoId,
      );
    },
  });
