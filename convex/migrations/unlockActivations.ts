import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server';
import {
  v,
} from 'convex/values';

import {
  internal,
} from '../_generated/api';
import type {
  Doc,
} from '../_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from '../_generated/server';
import schema from '../schema';

export const listPage =
  internalQuery({
    args: {
      paginationOpts:
        paginationOptsValidator,
    },

    returns:
      paginationResultValidator(
        schema.doc(
          'choreOccurrences',
        ),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      return await ctx.db
        .query(
          'choreOccurrences',
        )
        .paginate(
          args.paginationOpts,
        );
    },
  });

export const backfillOne =
  internalMutation({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),

      now:
        v.number(),
    },

    returns:
      v.boolean(),

    handler: async (
      ctx,
      args,
    ) => {
      const occurrence =
        await ctx.db.get(
          args.occurrenceId,
        );

      if (
        !occurrence ||
        occurrence.kind !==
          'personal' ||
        !occurrence
          .isUnlockChore ||
        occurrence
          .availabilityReachedAt !==
          undefined ||
        occurrence
          .availabilityStartsAt >
          args.now
      ) {
        return false;
      }

      await ctx.db.patch(
        occurrence._id,
        {
          availabilityReachedAt:
            occurrence
              .availabilityStartsAt,
        },
      );

      return true;
    },
  });

export const run =
  internalAction({
    args: {},

    returns:
      v.object({
        processed:
          v.number(),

        backfilled:
          v.number(),
      }),

    handler: async (
      ctx,
    ) => {
      const now =
        Date.now();

      let cursor:
        string |
        null =
        null;

      let processed =
        0;

      let backfilled =
        0;

      for (;;) {
        const result: {
          page:
            Doc<'choreOccurrences'>[];

          isDone:
            boolean;

          continueCursor:
            string;
        } =
          await ctx.runQuery(
            internal
              .migrations
              .unlockActivations
              .listPage,
            {
              paginationOpts: {
                numItems:
                  50,

                cursor,
              },
            },
          );

        for (
          const occurrence of
          result.page
        ) {
          const changed:
            boolean =
            await ctx.runMutation(
              internal
                .migrations
                .unlockActivations
                .backfillOne,
              {
                occurrenceId:
                  occurrence._id,

                now,
              },
            );

          processed +=
            1;

          if (changed) {
            backfilled +=
              1;
          }
        }

        if (
          result.isDone
        ) {
          break;
        }

        cursor =
          result.continueCursor;
      }

      return {
        processed,
        backfilled,
      };
    },
  });
