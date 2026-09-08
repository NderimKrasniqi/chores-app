import {
  ConvexError,
  v,
} from 'convex/values';

import type {
  Id,
} from '../../../_generated/dataModel';
import {
  internalMutation,
} from '../../../_generated/server';
import {
  findActiveChildAccessGrantForCredential,
  getUniqueActiveChildAccessGrantForAuthUser,
  listActiveChildAccessGrantsForAuthUser,
} from '../../../lib/childAccess/activeGrants';

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

async function expectFailure(
  operation:
    () => Promise<unknown>,
) {
  try {
    await operation();

    return false;
  } catch {
    return true;
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
      if (
        process.env
          .APP_ENV ===
        'production'
      ) {
        throw new ConvexError(
          'Developer smoke tests are disabled in production.',
        );
      }

      const now =
        Date.UTC(
          2032,
          0,
          15,
          12,
          0,
          0,
        );

      const authUserId =
        'task22-active-grant';

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Active Grant',

            timezone:
              'UTC',

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
              'Active Grant Child',

            createdAt:
              now,

            updatedAt:
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
              'task22-active-grant-qr',

            manualCodeHash:
              'task22-active-grant-manual',

            createdByAuthUserId:
              'task22-parent',

            createdAt:
              now,

            expiresAt:
              now + 60_000,

            manualAttemptCount:
              0,

            redeemedAt:
              now,

            redeemedByAuthUserId:
              authUserId,
          },
        );

      const grantIds:
        Id<'childDeviceAccessGrants'>[] =
        [];

      try {
        for (
          let index = 0;
          index < 40;
          index += 1
        ) {
          const grantId =
            await ctx.db.insert(
              'childDeviceAccessGrants',
              {
                householdId,

                childId,

                authUserId,

                pairingCredentialId:
                  credentialId,

                createdAt:
                  now -
                  1000 -
                  index,

                revokedAt:
                  now -
                  index,

                revokedByAuthUserId:
                  'task22-parent',
              },
            );

          grantIds.push(
            grantId,
          );
        }

        const activeGrantId =
          await ctx.db.insert(
            'childDeviceAccessGrants',
            {
              householdId,

              childId,

              authUserId,

              pairingCredentialId:
                credentialId,

              createdAt:
                now,
            },
          );

        grantIds.push(
          activeGrantId,
        );

        const activeGrants =
          await listActiveChildAccessGrantsForAuthUser(
            ctx,
            authUserId,
          );

        assert(
          activeGrants.length ===
            1 &&
          activeGrants[0]?._id ===
            activeGrantId,
          'Active lookup must ignore revoked history.',
        );

        const unique =
          await getUniqueActiveChildAccessGrantForAuthUser(
            ctx,
            authUserId,
          );

        assert(
          unique?._id ===
            activeGrantId,
          'Unique lookup returned the wrong grant.',
        );

        const retry =
          await findActiveChildAccessGrantForCredential(
            ctx,
            authUserId,
            credentialId,
          );

        assert(
          retry?._id ===
            activeGrantId,
          'Credential retry returned the wrong grant.',
        );

        await ctx.db.patch(
          activeGrantId,
          {
            revokedAt:
              now + 1,

            revokedByAuthUserId:
              'task22-parent',
          },
        );

        const afterRevocation =
          await getUniqueActiveChildAccessGrantForAuthUser(
            ctx,
            authUserId,
          );

        assert(
          afterRevocation ===
            null,
          'Revoked grant remained active.',
        );

        const duplicateOne =
          await ctx.db.insert(
            'childDeviceAccessGrants',
            {
              householdId,

              childId,

              authUserId,

              pairingCredentialId:
                credentialId,

              createdAt:
                now + 2,
            },
          );

        grantIds.push(
          duplicateOne,
        );

        const duplicateTwo =
          await ctx.db.insert(
            'childDeviceAccessGrants',
            {
              householdId,

              childId,

              authUserId,

              pairingCredentialId:
                credentialId,

              createdAt:
                now + 3,
            },
          );

        grantIds.push(
          duplicateTwo,
        );

        const duplicateRejected =
          await expectFailure(
            () =>
              getUniqueActiveChildAccessGrantForAuthUser(
                ctx,
                authUserId,
              ),
          );

        assert(
          duplicateRejected,
          'Multiple active grants must fail closed.',
        );

        return {
          passed:
            true,
        };
      } finally {
        for (
          const grantId of
          grantIds
        ) {
          const grant =
            await ctx.db.get(
              grantId,
            );

          if (grant) {
            await ctx.db.delete(
              grant._id,
            );
          }
        }

        await ctx.db.delete(
          credentialId,
        );

        await ctx.db.delete(
          childId,
        );

        await ctx.db.delete(
          householdId,
        );
      }
    },
  });
