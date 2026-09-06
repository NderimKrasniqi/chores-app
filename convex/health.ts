import { v } from 'convex/values';
import { query } from './_generated/server';

export const ping = query({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    message: v.string(),
  }),
  handler: async () => {
    return {
      ok: true,
      message: 'Convex connected',
    };
  },
});
