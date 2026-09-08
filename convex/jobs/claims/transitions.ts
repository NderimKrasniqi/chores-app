import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  reconcileClaimCommitmentLock,
} from '../../lib/claims/commitmentLifecycle';

/*
 * Internal durable time transition.
 *
 * Phones cannot manufacture or advance
 * commitment-lock state.
 */
export const reconcileCommitmentLock =
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

        lockAt:
          v.union(
            v.number(),
            v.null(),
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      return await reconcileClaimCommitmentLock(
        ctx,
        args.occurrenceId,
      );
    },
  });
