import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../_generated/server';
import {
  runEvidenceMaintenance,
} from '../../lib/evidence/maintenance';

/*
 * Bounded evidence retention maintenance.
 *
 * Each invocation processes:
 *
 * - up to 50 expired upload intents;
 * - up to 100 expired private view tokens;
 * - one 50-object _storage page.
 */
export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        expiredIntentsProcessed:
          v.number(),

        expiredIntentFilesDeleted:
          v.number(),

        expiredViewTokensDeleted:
          v.number(),

        storageObjectsScanned:
          v.number(),

        orphanFilesDeleted:
          v.number(),

        completedStorageCycle:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      return await runEvidenceMaintenance(
        ctx,
      );
    },
  });
