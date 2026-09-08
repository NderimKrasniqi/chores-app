import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

/*
 * Cursor checkpoints for bounded
 * Household maintenance dispatch.
 *
 * These rows contain no domain state.
 * They only remember where the next cron
 * invocation should resume pagination.
 */
export const maintenanceTables = {
  maintenanceDispatchState:
    defineTable({
      key:
        v.string(),

      cursor:
        v.union(
          v.string(),
          v.null(),
        ),

      updatedAt:
        v.number(),
    })
      .index(
        'by_key',
        [
          'key',
        ],
      ),
};
