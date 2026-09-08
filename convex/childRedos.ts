import {
  query,
} from './_generated/server';
import {
  requireCurrentChildAccess,
} from './lib/auth/childAuthorization';
import {
  listActiveRedosForChild,
} from './lib/redos/activeForChild';

export const listMine =
  query({
    args: {},

    handler: async (
      ctx,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await listActiveRedosForChild(
        ctx,
        household._id,
        child._id,
      );
    },
  });
