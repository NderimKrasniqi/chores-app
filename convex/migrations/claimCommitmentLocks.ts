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
import {
  getClaimCommitmentLockAt,
} from '../lib/claims/commitmentRules';
import {
  reconcileClaimCommitmentLock,
} from '../lib/claims/commitmentLifecycle';
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

export const reconcileOne =
  internalMutation({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),
    },

    returns:
      v.union(
        v.literal(
          'ignored',
        ),
        v.literal(
          'already',
        ),
        v.literal(
          'marked',
        ),
        v.literal(
          'scheduled',
        ),
      ),

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
          'claimable' ||
        (
          occurrence.state !==
            'scheduled' &&
          occurrence.state !==
            'available'
        )
      ) {
        return 'ignored';
      }

      if (
        occurrence
          .commitmentLockReachedAt !==
        undefined
      ) {
        return 'already';
      }

      const now =
        Date.now();

      const lockAt =
        getClaimCommitmentLockAt(
          occurrence.deadlineAt,
        );

      if (
        lockAt <=
        now
      ) {
        const result =
          await reconcileClaimCommitmentLock(
            ctx,
            occurrence._id,
            now,
          );

        return result.changed
          ? 'marked'
          : 'already';
      }

      await ctx.scheduler.runAt(
        lockAt,

        internal
          .jobs.claims.transitions
          .reconcileCommitmentLock,

        {
          occurrenceId:
            occurrence._id,
        },
      );

      return 'scheduled';
    },
  });

export const run =
  internalAction({
    args: {},

    returns:
      v.object({
        processed:
          v.number(),

        marked:
          v.number(),

        scheduled:
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

      let marked =
        0;

      let scheduled =
        0;

      for (;;) {
        const page: {
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
              .claimCommitmentLocks
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
          page.page
        ) {
          const result:
            | 'ignored'
            | 'already'
            | 'marked'
            | 'scheduled' =
            await ctx.runMutation(
              internal
                .migrations
                .claimCommitmentLocks
                .reconcileOne,
              {
                occurrenceId:
                  occurrence._id,
              },
            );

          processed +=
            1;

          if (
            result ===
            'marked'
          ) {
            marked +=
              1;
          }

          if (
            result ===
            'scheduled'
          ) {
            scheduled +=
              1;
          }
        }

        if (
          page.isDone
        ) {
          break;
        }

        cursor =
          page.continueCursor;
      }

      return {
        processed,
        marked,
        scheduled,
      };
    },
  });
