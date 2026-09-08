import {
  v,
} from 'convex/values';

import {
  internal,
} from '../../../_generated/api';
import {
  internalAction,
} from '../../../_generated/server';

function jpeg(
  marker:
    number,
) {
  return new Blob(
    [
      new Uint8Array(
        [
          0xff,
          0xd8,
          marker,
          0xff,
          0xd9,
        ],
      ),
    ],
    {
      type:
        'image/jpeg',
    },
  );
}

export const run =
  internalAction({
    args: {},

    returns:
      v.object({
        passed:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      const abandonedStorageId =
        await ctx.storage.store(
          jpeg(
            0x01,
          ),
        );

      const orphanStorageId =
        await ctx.storage.store(
          jpeg(
            0x02,
          ),
        );

      const referencedStorageId =
        await ctx.storage.store(
          jpeg(
            0x03,
          ),
        );

      try {
        const result: {
          passed:
            boolean;
        } =
          await ctx.runMutation(
            internal
              .dev.smoke.task22
              .evidenceRetentionFixture
              .run,
            {
              abandonedStorageId,
              orphanStorageId,
              referencedStorageId,
            },
          );

        return result;
      } catch (
        error
      ) {
        for (
          const storageId of
          [
            abandonedStorageId,
            orphanStorageId,
            referencedStorageId,
          ]
        ) {
          try {
            await ctx.storage.delete(
              storageId,
            );
          } catch {
            /*
             * Fixture may already have
             * deleted the object.
             */
          }
        }

        throw error;
      }
    },
  });
