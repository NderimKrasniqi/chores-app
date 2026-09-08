import {
  v,
} from 'convex/values';

import {
  internal,
} from '../../../_generated/api';
import {
  internalAction,
} from '../../../_generated/server';

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
      const blob =
        new Blob(
          [
            new Uint8Array(
              [
                0xff,
                0xd8,
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

      const storageId =
        await ctx.storage
          .store(
            blob,
          );

      try {
        const result: {
          passed:
            boolean;
        } =
          await ctx.runMutation(
            internal
              .dev.smoke.task16
              .evidenceFixture
              .run,
            {
              storageId,
            },
          );

        return result;
      } catch (
        error
      ) {
        await ctx.storage.delete(
          storageId,
        );

        throw error;
      }
    },
  });
