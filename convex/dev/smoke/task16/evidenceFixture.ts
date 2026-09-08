import {
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  consumeEvidenceUploadIntent,
  createEvidenceUploadIntent,
  registerEvidenceUpload,
} from '../../../lib/evidence/submissionEvidence';
import {
  hashEvidenceViewToken,
  resolveEvidenceViewToken,
} from '../../../lib/evidence/viewEvidence';
import {
  resolveLocalDateTimeToEpochMs,
} from '../../../lib/scheduling/choreScheduling';

function assert(
  condition: unknown,
  message: string,
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
  message: string,
) {
  try {
    await operation();
  } catch {
    return;
  }

  throw new Error(
    message,
  );
}

export const run =
  internalMutation({
    args: {
      storageId:
        v.id('_storage'),
    },

    returns:
      v.object({
        passed:
          v.boolean(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      const timezone =
        'Europe/Stockholm';

      const now =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '12:00',
          timezone,
        );

      const deadlineAt =
        resolveLocalDateTimeToEpochMs(
          '2030-01-16',
          '18:00',
          timezone,
        );

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK16 evidence smoke',

            timezone,

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

      const childA =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK16 Child A',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const childB =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'TASK16 Child B',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const membershipId =
        await ctx.db.insert(
          'householdMembers',
          {
            householdId,

            authUserId:
              'task16-parent',

            role:
              'parent',

            joinedAt:
              now,
          },
        );

      const definitionId =
        await ctx.db.insert(
          'choreDefinitions',
          {
            householdId,

            kind:
              'personal',

            title:
              'TASK16 evidence fixture',

            valueSek:
              75,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2030-01-16',
            },

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childA,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task16-parent',

            createdAt:
              now,

            updatedAt:
              now,
          },
        );

      const occurrenceId =
        await ctx.db.insert(
          'choreOccurrences',
          {
            householdId,

            choreDefinitionId:
              definitionId,

            kind:
              'personal',

            title:
              'TASK16 evidence fixture',

            valueSek:
              75,

            scheduledLocalDate:
              '2030-01-16',

            timezone,

            deadlineLocalTime:
              '18:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              now,

            deadlineAt,

            personalChildId:
              childA,

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              now,
          },
        );

      const upload =
        await createEvidenceUploadIntent(
          ctx,
          householdId,
          childA,
          occurrenceId,
          1,
          now,
        );

      await expectFailure(
        () =>
          registerEvidenceUpload(
            ctx,
            childB,
            upload
              .uploadIntentId,
            args.storageId,
            now,
          ),
        'Another Child must not register this evidence upload.',
      );

      const registration =
        await registerEvidenceUpload(
          ctx,
          childA,
          upload
            .uploadIntentId,
          args.storageId,
          now,
        );

      assert(
        registration.accepted,
        'Valid JPEG evidence was not accepted.',
      );

      const storageId =
        await consumeEvidenceUploadIntent(
          ctx,
          upload
            .uploadIntentId,
          {
            householdId,

            childId:
              childA,

            occurrenceId,

            attemptNumber:
              1,
          },
          now,
        );

      assert(
        storageId ===
          args.storageId,
        'Consumed evidence storage ID mismatch.',
      );

      await expectFailure(
        () =>
          consumeEvidenceUploadIntent(
            ctx,
            upload
              .uploadIntentId,
            {
              householdId,

              childId:
                childA,

              occurrenceId,

              attemptNumber:
                1,
            },
            now,
          ),
        'Evidence upload must be consumable only once.',
      );

      const submissionId =
        await ctx.db.insert(
          'choreSubmissions',
          {
            householdId,

            occurrenceId,

            childId:
              childA,

            attemptNumber:
              1,

            submittedAt:
              now,

            evidenceStorageId:
              args.storageId,
          },
        );

      await ctx.db.patch(
        occurrenceId,
        {
          state:
            'submitted',
        },
      );

      const rawToken =
        'task16-private-view-token';

      const tokenHash =
        await hashEvidenceViewToken(
          rawToken,
        );

      const viewTokenId =
        await ctx.db.insert(
          'submissionEvidenceViewTokens',
          {
            tokenHash,

            householdId,

            submissionId,

            storageId:
              args.storageId,

            viewerAuthUserId:
              'task16-parent',

            createdAt:
              now,

            expiresAt:
              now +
              60_000,
          },
        );

      const authorized =
        await resolveEvidenceViewToken(
          ctx,
          tokenHash,
          now,
        );

      assert(
        authorized
          ?.storageId ===
          args.storageId,
        'Authorized Parent could not resolve private evidence.',
      );

      await ctx.db.delete(
        membershipId,
      );

      const afterRevocation =
        await resolveEvidenceViewToken(
          ctx,
          tokenHash,
          now,
        );

      assert(
        afterRevocation ===
          null,
        'Evidence authorization must be re-checked after Parent access is removed.',
      );

      await ctx.db.delete(
        viewTokenId,
      );

      await ctx.db.delete(
        submissionId,
      );

      await ctx.db.delete(
        upload
          .uploadIntentId,
      );

      await ctx.storage.delete(
        args.storageId,
      );

      await ctx.db.delete(
        occurrenceId,
      );

      await ctx.db.delete(
        definitionId,
      );

      await ctx.db.delete(
        childA,
      );

      await ctx.db.delete(
        childB,
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
