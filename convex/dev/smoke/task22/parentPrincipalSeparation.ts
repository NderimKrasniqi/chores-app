import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  requireParentCapableAuthUser,
} from '../../../lib/auth/parentAuthorization';

const resultValidator =
  v.object({
    label:
      v.string(),

    passed:
      v.boolean(),
  });

type SmokeResult = {
  label: string;
  passed: boolean;
};

function rejects(
  operation:
    () => unknown,
) {
  try {
    operation();

    return false;
  } catch {
    return true;
  }
}

export const run =
  internalMutation({
    args: {},

    returns:
      v.array(
        resultValidator,
      ),

    handler:
      async (): Promise<
        SmokeResult[]
      > => {
        const anonymousRejected =
          rejects(
            () =>
              requireParentCapableAuthUser(
                {
                  _id:
                    'anonymous-child-device',
                  isAnonymous:
                    true,
                },
              ),
          );

        const missingRejected =
          rejects(
            () =>
              requireParentCapableAuthUser(
                null,
              ),
          );

        const parent =
          requireParentCapableAuthUser(
            {
              _id:
                'parent-user',
              isAnonymous:
                false,
            },
          );

        return [
          {
            label:
              'anonymous Better Auth identity cannot become Parent-capable',
            passed:
              anonymousRejected,
          },

          {
            label:
              'missing authentication cannot become Parent-capable',
            passed:
              missingRejected,
          },

          {
            label:
              'non-anonymous authenticated identity remains Parent-capable',
            passed:
              parent._id ===
              'parent-user',
          },
        ];
      },
  });
