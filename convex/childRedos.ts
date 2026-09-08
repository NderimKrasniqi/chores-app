import {
  query,
} from './_generated/server';
import {
  requireCurrentChildAccess,
} from './lib/auth/childAuthorization';
import {
  listActiveRedosForChild,
} from './lib/redos/activeForChild';
import {
  activeRedosForChildValidator,
} from './lib/api/choreContracts';

export const listMine =
  query({
    args: {},

    returns:
      activeRedosForChildValidator,

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
