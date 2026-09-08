import type {
  Doc,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

export type NotificationTarget = {
  registrationId:
    Doc<'pushRegistrations'>['_id'];

  expoPushToken:
    string;
};

function deduplicateTargets(
  targets:
    NotificationTarget[],
) {
  const byToken =
    new Map<
      string,
      NotificationTarget
    >();

  for (
    const target
    of targets
  ) {
    if (
      !byToken.has(
        target.expoPushToken,
      )
    ) {
      byToken.set(
        target.expoPushToken,
        target,
      );
    }
  }

  return [
    ...byToken.values(),
  ];
}

async function resolveParentTargets(
  ctx:
    DatabaseCtx,
  event:
    Doc<'notificationEvents'>,
) {
  const memberships =
    await ctx.db
      .query(
        'householdMembers',
      )
      .withIndex(
        'by_household',
        (q) =>
          q.eq(
            'householdId',
            event.householdId,
          ),
      )
      .collect();

  const targets:
    NotificationTarget[] =
    [];

  for (
    const membership
    of memberships
  ) {
    const registrations =
      await ctx.db
        .query(
          'pushRegistrations',
        )
        .withIndex(
          'by_auth_user',
          (q) =>
            q.eq(
              'authUserId',
              membership
                .authUserId,
            ),
        )
        .collect();

    for (
      const registration
      of registrations
    ) {
      /*
       * Parent registrations are not
       * associated with a Child grant.
       */
      if (
        registration
          .disabledAt !==
          undefined ||
        registration
          .childId !==
          undefined ||
        registration
          .childAccessGrantId !==
          undefined
      ) {
        continue;
      }

      targets.push({
        registrationId:
          registration._id,

        expoPushToken:
          registration
            .expoPushToken,
      });
    }
  }

  return deduplicateTargets(
    targets,
  );
}

async function resolveChildTargets(
  ctx:
    DatabaseCtx,
  event:
    Doc<'notificationEvents'>,
) {
  if (!event.childId) {
    return [];
  }

  const child =
    await ctx.db.get(
      event.childId,
    );

  if (
    !child ||
    child.householdId !==
      event.householdId
  ) {
    return [];
  }

  const registrations =
    await ctx.db
      .query(
        'pushRegistrations',
      )
      .withIndex(
        'by_child',
        (q) =>
          q.eq(
            'childId',
            child._id,
          ),
      )
      .collect();

  const targets:
    NotificationTarget[] =
    [];

  for (
    const registration
    of registrations
  ) {
    if (
      registration
        .disabledAt !==
        undefined ||
      !registration
        .childAccessGrantId
    ) {
      continue;
    }

    const grant =
      await ctx.db.get(
        registration
          .childAccessGrantId,
      );

    if (
      !grant ||
      grant.revokedAt !==
        undefined ||
      grant.childId !==
        child._id ||
      grant.householdId !==
        event.householdId ||
      grant.authUserId !==
        registration
          .authUserId
    ) {
      continue;
    }

    targets.push({
      registrationId:
        registration._id,

      expoPushToken:
        registration
          .expoPushToken,
    });
  }

  return deduplicateTargets(
    targets,
  );
}

export async function resolveNotificationTargets(
  ctx:
    DatabaseCtx,
  event:
    Doc<'notificationEvents'>,
) {
  if (
    event.recipientKind ===
    'parents'
  ) {
    return await resolveParentTargets(
      ctx,
      event,
    );
  }

  return await resolveChildTargets(
    ctx,
    event,
  );
}
