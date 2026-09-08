import {
  ConvexError,
} from 'convex/values';

import type {
  MutationCtx,
} from '../../_generated/server';
import {
  authComponent,
} from '../../auth';
import {
  requireCurrentChildAccess,
} from '../auth/childAuthorization';

export type PushPlatform =
  | 'ios'
  | 'android';

function isAnonymousAuthUser(
  user: object,
) {
  return (
    'isAnonymous' in user &&
    user.isAnonymous ===
      true
  );
}

function validateExpoPushToken(
  value: string,
) {
  const token =
    value.trim();

  if (
    !(
      token.startsWith(
        'ExponentPushToken[',
      ) ||
      token.startsWith(
        'ExpoPushToken[',
      )
    ) ||
    !token.endsWith(']') ||
    token.length >
      512
  ) {
    throw new ConvexError(
      'Invalid Expo Push Token.',
    );
  }

  return token;
}

export async function registerCurrentPushDevice(
  ctx: MutationCtx,
  expoPushToken: string,
  platform:
    PushPlatform,
  now = Date.now(),
) {
  const authUser =
    await authComponent.safeGetAuthUser(
      ctx,
    );

  if (!authUser) {
    throw new ConvexError(
      'Authentication required.',
    );
  }

  const token =
    validateExpoPushToken(
      expoPushToken,
    );

  let childAccessGrantId:
    | Awaited<
        ReturnType<
          typeof requireCurrentChildAccess
        >
      >['accessGrant']['_id']
    | undefined;

  let childId:
    | Awaited<
        ReturnType<
          typeof requireCurrentChildAccess
        >
      >['child']['_id']
    | undefined;

  if (
    isAnonymousAuthUser(
      authUser,
    )
  ) {
    const childAccess =
      await requireCurrentChildAccess(
        ctx,
      );

    childAccessGrantId =
      childAccess
        .accessGrant
        ._id;

    childId =
      childAccess
        .child
        ._id;
  }

  /*
   * An Expo Push Token identifies the app
   * installation, not our Parent/Child
   * actor.
   *
   * A shared device therefore must not
   * keep multiple active actor
   * registrations for the same OS token:
   * that could expose Parent notifications
   * while a Child is using the device.
   */
  const registrationsForToken =
    await ctx.db
      .query(
        'pushRegistrations',
      )
      .withIndex(
        'by_expo_push_token',
        (q) =>
          q.eq(
            'expoPushToken',
            token,
          ),
      )
      .collect();

  for (
    const registration
    of registrationsForToken
  ) {
    if (
      registration.authUserId ===
        authUser._id ||
      registration.disabledAt !==
        undefined
    ) {
      continue;
    }

    await ctx.db.patch(
      registration._id,
      {
        disabledAt:
          now,

        updatedAt:
          now,
      },
    );
  }

  const existing =
    await ctx.db
      .query(
        'pushRegistrations',
      )
      .withIndex(
        'by_auth_user_and_expo_push_token',
        (q) =>
          q
            .eq(
              'authUserId',
              authUser._id,
            )
            .eq(
              'expoPushToken',
              token,
            ),
      )
      .unique();

  if (existing) {
    await ctx.db.replace(
      existing._id,
      {
        authUserId:
          authUser._id,

        expoPushToken:
          token,

        platform,

        ...(childAccessGrantId !==
        undefined
          ? {
              childAccessGrantId,
            }
          : {}),

        ...(childId !==
        undefined
          ? {
              childId,
            }
          : {}),

        createdAt:
          existing.createdAt,

        updatedAt:
          now,
      },
    );

    return {
      registrationId:
        existing._id,

      created:
        false,
    };
  }

  const registrationId =
    await ctx.db.insert(
      'pushRegistrations',
      {
        authUserId:
          authUser._id,

        expoPushToken:
          token,

        platform,

        ...(childAccessGrantId !==
        undefined
          ? {
              childAccessGrantId,
            }
          : {}),

        ...(childId !==
        undefined
          ? {
              childId,
            }
          : {}),

        createdAt:
          now,

        updatedAt:
          now,
      },
    );

  return {
    registrationId,
    created:
      true,
  };
}

export async function disableCurrentPushDevice(
  ctx: MutationCtx,
  expoPushToken: string,
  now = Date.now(),
) {
  const authUser =
    await authComponent.safeGetAuthUser(
      ctx,
    );

  if (!authUser) {
    throw new ConvexError(
      'Authentication required.',
    );
  }

  const token =
    validateExpoPushToken(
      expoPushToken,
    );

  const registration =
    await ctx.db
      .query(
        'pushRegistrations',
      )
      .withIndex(
        'by_auth_user_and_expo_push_token',
        (q) =>
          q
            .eq(
              'authUserId',
              authUser._id,
            )
            .eq(
              'expoPushToken',
              token,
            ),
      )
      .unique();

  if (!registration) {
    return {
      disabled:
        false,
    };
  }

  await ctx.db.patch(
    registration._id,
    {
      disabledAt:
        now,

      updatedAt:
        now,
    },
  );

  return {
    disabled:
      true,
  };
}

/*
 * ExpoPushToken represents the device /
 * Expo project, so DeviceNotRegistered
 * invalidates every local actor registration
 * using that token.
 */
export async function disableExpoPushTokenGlobally(
  ctx: MutationCtx,
  expoPushToken:
    string,
  now = Date.now(),
) {
  const registrations =
    await ctx.db
      .query(
        'pushRegistrations',
      )
      .withIndex(
        'by_expo_push_token',
        (q) =>
          q.eq(
            'expoPushToken',
            expoPushToken,
          ),
      )
      .collect();

  for (
    const registration
    of registrations
  ) {
    if (
      registration
        .disabledAt !==
      undefined
    ) {
      continue;
    }

    await ctx.db.patch(
      registration._id,
      {
        disabledAt:
          now,

        updatedAt:
          now,
      },
    );
  }

  return {
    disabledCount:
      registrations.filter(
        (
          registration,
        ) =>
          registration
            .disabledAt ===
          undefined,
      ).length,
  };
}
