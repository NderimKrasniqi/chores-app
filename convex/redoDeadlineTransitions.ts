import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from './_generated/server';
import {
  reconcileRedoDeadlineFailure,
} from './lib/redoDeadlineFailure';

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
