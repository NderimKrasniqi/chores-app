import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  enqueueNotificationEvent,
} from '../../../lib/notifications/events';
import {
  disableExpoPushTokenGlobally,
} from '../../../lib/notifications/registration';
import {
  resolveNotificationTargets,
} from '../../../lib/notifications/recipients';

function assert(
  condition:
    unknown,
  message:
    string,
): asserts condition {
  if (!condition) {
    throw new Error(
      message,
    );
  }
}

export const run =
  internalMutation({
    args: {},

    returns:
      v.object({
        passed:
          v.boolean(),
      }),

    handler: async (
      ctx,
    ) => {
      const now =
        1_893_456_000_000;

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK18 notification smoke',

            timezone:
              'Europe/Stockholm',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK18 Child',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const parentMembershipId =
        await ctx.db.insert(
          'householdMembers',
          {
            householdId,

            authUserId:
              'task18-parent',

            role:
              'parent',

            joinedAt:
              now,
          },
        );

      const credentialId =
        await ctx.db.insert(
          'childPairingCredentials',
          {
            householdId,

            childId,

            qrTokenHash:
              'task18-qr',

            manualCodeHash:
              'task18-code',

            createdByAuthUserId:
              'task18-parent',

            createdAt:
              now,

            expiresAt:
              now +
              900_000,

            manualAttemptCount:
              0,
          },
        );

      const activeGrantId =
        await ctx.db.insert(
          'childDeviceAccessGrants',
          {
            householdId,

            childId,

            authUserId:
              'task18-child-active',

            pairingCredentialId:
              credentialId,

            createdAt:
              now,
          },
        );

      const revokedGrantId =
        await ctx.db.insert(
          'childDeviceAccessGrants',
          {
            householdId,

            childId,

            authUserId:
              'task18-child-revoked',

            pairingCredentialId:
              credentialId,

            createdAt:
              now,

            revokedAt:
              now,

            revokedByAuthUserId:
              'task18-parent',
          },
        );

      const parentRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-parent',

            expoPushToken:
              'ExpoPushToken[parent-active]',

            platform:
              'ios',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const disabledParentRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-parent',

            expoPushToken:
              'ExpoPushToken[parent-disabled]',

            platform:
              'ios',

            createdAt:
              now,

            updatedAt:
              now,

            disabledAt:
              now,
          },
        );

      const activeChildRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-child-active',

            expoPushToken:
              'ExpoPushToken[child-active]',

            platform:
              'ios',

            childAccessGrantId:
              activeGrantId,

            childId,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const revokedChildRegistrationId =
        await ctx.db.insert(
          'pushRegistrations',
          {
            authUserId:
              'task18-child-revoked',

            expoPushToken:
              'ExpoPushToken[child-revoked]',

            platform:
              'ios',

            childAccessGrantId:
              revokedGrantId,

            childId,

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const parentEventResult =
        await enqueueNotificationEvent(
          ctx,
          {
            eventKey:
              'task18:parents',

            kind:
              'submission_review',

            householdId,

            recipientKind:
              'parents',

            title:
              'Review needed',

            body:
              'TASK18 Child submitted work.',
          },
          {
            now,

            scheduleDelivery:
              false,
          },
        );

      const duplicate =
        await enqueueNotificationEvent(
          ctx,
          {
            eventKey:
              'task18:parents',

            kind:
              'submission_review',

            householdId,

            recipientKind:
              'parents',

            title:
              'Duplicate',

            body:
              'Must not duplicate.',
          },
          {
            now,

            scheduleDelivery:
              false,
          },
        );

      assert(
        duplicate.eventId ===
          parentEventResult
            .eventId &&
          !duplicate.created,
        'Notification events must be idempotent by event key.',
      );

      const parentEvent =
        await ctx.db.get(
          parentEventResult
            .eventId,
        );

      assert(
        parentEvent,
        'Parent notification event missing.',
      );

      const parentTargets =
        await resolveNotificationTargets(
          ctx,
          parentEvent,
        );

      assert(
        parentTargets.length ===
          1 &&
          parentTargets[0]
            .registrationId ===
            parentRegistrationId,
        'Only active Parent push registrations should be targeted.',
      );

      const childEventResult =
        await enqueueNotificationEvent(
          ctx,
          {
            eventKey:
              'task18:child',

            kind:
              'approved',

            householdId,

            recipientKind:
              'child',

            childId,

            title:
              'Approved',

            body:
              'Your chore was approved.',
          },
          {
            now,

            scheduleDelivery:
              false,
          },
        );

      const childEvent =
        await ctx.db.get(
          childEventResult
            .eventId,
        );

      assert(
        childEvent,
        'Child notification event missing.',
      );

      const childTargets =
        await resolveNotificationTargets(
          ctx,
          childEvent,
        );

      assert(
        childTargets.length ===
          1 &&
          childTargets[0]
            .registrationId ===
            activeChildRegistrationId,
        'Revoked Child grants must never receive push notifications.',
      );

      await disableExpoPushTokenGlobally(
        ctx,
        'ExpoPushToken[child-active]',
        now +
          1,
      );

      const afterDisable =
        await resolveNotificationTargets(
          ctx,
          childEvent,
        );

      assert(
        afterDisable.length ===
          0,
        'DeviceNotRegistered cleanup must remove the token from future targeting.',
      );

      await ctx.db.delete(
        childEventResult
          .eventId,
      );

      await ctx.db.delete(
        parentEventResult
          .eventId,
      );

      await ctx.db.delete(
        revokedChildRegistrationId,
      );

      await ctx.db.delete(
        activeChildRegistrationId,
      );

      await ctx.db.delete(
        disabledParentRegistrationId,
      );

      await ctx.db.delete(
        parentRegistrationId,
      );

      await ctx.db.delete(
        revokedGrantId,
      );

      await ctx.db.delete(
        activeGrantId,
      );

      await ctx.db.delete(
        credentialId,
      );

      await ctx.db.delete(
        parentMembershipId,
      );

      await ctx.db.delete(
        childId,
      );

      await ctx.db.delete(
        householdId,
      );

      return {
        passed:
          true,
      };
    },
  });
