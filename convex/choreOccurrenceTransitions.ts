import { v } from 'convex/values';

import {
  internalMutation,
} from './_generated/server';
import { reconcileOccurrenceLifecycle } from './lib/choreOccurrenceLifecycle';

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
