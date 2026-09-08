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
import {
  rebuildFinancialBalanceProjection,
} from '../lib/finance/financialProjection';

export const listChildrenPage =
  internalQuery({
    args: {
      paginationOpts:
        paginationOptsValidator,
    },

    returns:
      paginationResultValidator(
        schema.doc(
          'children',
        ),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      return await ctx.db
        .query(
          'children',
        )
        .paginate(
          args.paginationOpts,
        );
    },
  });

export const rebuildOne =
  internalMutation({
    args: {
      childId:
        v.id(
          'children',
        ),
    },

    returns:
      v.null(),

    handler: async (
      ctx,
      args,
    ) => {
      await rebuildFinancialBalanceProjection(
        ctx,
        args.childId,
      );

      return null;
    },
  });

export const run =
  internalAction({
    args: {},

    returns:
      v.object({
        processed:
          v.number(),
      }),

    handler: async (
      ctx,
    ) => {
      let cursor:
        string |
        null =
        null;

      let processed =
        0;

      for (;;) {
        const result: {
          page:
            Doc<'children'>[];

          isDone:
            boolean;

          continueCursor:
            string;
        } =
          await ctx.runQuery(
            internal
              .migrations
              .financialBalances
              .listChildrenPage,
            {
              paginationOpts: {
                numItems:
                  25,

                cursor,
              },
            },
          );

        for (
          const child of
          result.page
        ) {
          await ctx.runMutation(
            internal
              .migrations
              .financialBalances
              .rebuildOne,
            {
              childId:
                child._id,
            },
          );

          processed +=
            1;
        }

        if (
          result.isDone
        ) {
          break;
        }

        cursor =
          result
            .continueCursor;
      }

      return {
        processed,
      };
    },
  });
