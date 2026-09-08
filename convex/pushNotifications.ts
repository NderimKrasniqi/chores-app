import {
  v,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import {
  pushPlatformValidator,
} from './schema/notifications';
import {
  disableCurrentPushDevice,
  registerCurrentPushDevice,
} from './lib/notifications/registration';

export const registerCurrentDevice =
  mutation({
    args: {
      expoPushToken:
        v.string(),

      platform:
        pushPlatformValidator,
    },

    returns:
      v.object({
        registrationId:
          v.id(
            'pushRegistrations',
          ),

        created:
          v.boolean(),
      }),

    handler: async (
      ctx,
      args,
    ) =>
      await registerCurrentPushDevice(
        ctx,
        args.expoPushToken,
        args.platform,
      ),
  });

export const disableCurrentDevice =
  mutation({
    args: {
      expoPushToken:
        v.string(),
    },

    returns:
      v.object({
        disabled:
          v.boolean(),
      }),

    handler: async (
      ctx,
      args,
    ) =>
      await disableCurrentPushDevice(
        ctx,
        args.expoPushToken,
      ),
  });
