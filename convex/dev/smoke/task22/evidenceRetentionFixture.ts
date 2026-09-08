import {
  ConvexError,
  v,
} from 'convex/values';

import {
  internalMutation,
} from '../../../_generated/server';
import {
  cleanupExpiredEvidenceUploadIntents,
  cleanupExpiredEvidenceViewTokens,
  reconcileOrphanEvidenceStorage,
} from '../../../lib/evidence/maintenance';
import {
  createEvidenceUploadIntent,
  registerEvidenceUpload,
} from '../../../lib/evidence/submissionEvidence';

export const run =
  internalMutation({
    args: {
      abandonedStorageId:
        v.id(
          '_storage',
        ),

      orphanStorageId:
        v.id(
          '_storage',
        ),

      referencedStorageId:
        v.id(
          '_storage',
        ),
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
      if (
        process.env
          .APP_ENV ===
        'production'
      ) {
        throw new ConvexError(
          'Developer smoke tests are disabled in production.',
        );
      }

      const maintenanceNow =
        Date.now();

      const uploadCreatedAt =
        maintenanceNow -
        30 *
          60 *
          1000;

      const householdId =
        await ctx.db.insert(
          'households',
          {
            name:
              'TASK22 Evidence Retention',

            timezone:
              'UTC',

            payoutWeekday:
              'friday',

            weeklyUnclaimAllowance:
              2,

            createdAt:
              uploadCreatedAt,

            updatedAt:
              uploadCreatedAt,
          },
        );

      const childId =
        await ctx.db.insert(
          'children',
          {
            householdId,

            displayName:
              'Evidence Child',

            createdAt:
              uploadCreatedAt,

            updatedAt:
              uploadCreatedAt,
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
              'Evidence retention fixture',

            valueSek:
              50,

            recurrence: {
              kind:
                'one_off',

              scheduledDate:
                '2031-01-01',
            },

            deadlineLocalTime:
              '23:00',

            deadlineDayOffset:
              0,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            createdByAuthUserId:
              'task22-smoke',

            createdAt:
              uploadCreatedAt,

            updatedAt:
              uploadCreatedAt,
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
              'Evidence retention fixture',

            valueSek:
              50,

            scheduledLocalDate:
              '2031-01-01',

            timezone:
              'UTC',

            deadlineLocalTime:
              '23:00',

            deadlineDayOffset:
              0,

            availabilityStartsAt:
              uploadCreatedAt -
              60 *
                60 *
                1000,

            availabilityReachedAt:
              uploadCreatedAt -
              60 *
                60 *
                1000,

            deadlineAt:
              maintenanceNow +
              60 *
                60 *
                1000,

            personalChildId:
              childId,

            isUnlockChore:
              false,

            state:
              'available',

            createdAt:
              uploadCreatedAt,
          },
        );

      let uploadIntentId:
        | Awaited<
            ReturnType<
              typeof createEvidenceUploadIntent
            >
          >['uploadIntentId']
        | null =
        null;

      let submissionId:
        | Awaited<
            ReturnType<
              typeof ctx.db.insert<
                'choreSubmissions'
              >
            >
          >
        | null =
        null;

      let viewTokenId:
        | Awaited<
            ReturnType<
              typeof ctx.db.insert<
                'submissionEvidenceViewTokens'
              >
            >
          >
        | null =
        null;

      try {
        const upload =
          await createEvidenceUploadIntent(
            ctx,
            householdId,
            childId,
            occurrenceId,
            1,
            uploadCreatedAt,
          );

        uploadIntentId =
          upload.uploadIntentId;

        const registration =
          await registerEvidenceUpload(
            ctx,
            childId,
            upload.uploadIntentId,
            args.abandonedStorageId,
            uploadCreatedAt +
              1,
          );

        if (
          !registration.accepted
        ) {
          throw new Error(
            'Fixture JPEG could not be registered.',
          );
        }

        const intentCleanup =
          await cleanupExpiredEvidenceUploadIntents(
            ctx,
            maintenanceNow,
          );

        const deletedIntent =
          await ctx.db.get(
            upload.uploadIntentId,
          );

        const deletedFile =
          await ctx.db.system.get(
            '_storage',
            args.abandonedStorageId,
          );

        if (
          intentCleanup
            .deletedFiles <
            1 ||
          deletedIntent !==
            null ||
          deletedFile !==
            null
        ) {
          throw new Error(
            'Expired abandoned evidence was not deleted.',
          );
        }

        uploadIntentId =
          null;

        submissionId =
          await ctx.db.insert(
            'choreSubmissions',
            {
              householdId,

              occurrenceId,

              childId,

              attemptNumber:
                1,

              submittedAt:
                maintenanceNow,

              evidenceStorageId:
                args
                  .referencedStorageId,
            },
          );

        viewTokenId =
          await ctx.db.insert(
            'submissionEvidenceViewTokens',
            {
              tokenHash:
                'task22-expired-token',

              householdId,

              submissionId,

              storageId:
                args
                  .referencedStorageId,

              viewerAuthUserId:
                'task22-viewer',

              createdAt:
                maintenanceNow -
                60_000,

              expiresAt:
                maintenanceNow -
                1,
            },
          );

        const tokenCleanup =
          await cleanupExpiredEvidenceViewTokens(
            ctx,
            maintenanceNow,
          );

        const expiredToken =
          await ctx.db.get(
            viewTokenId,
          );

        if (
          tokenCleanup
            .deletedTokens <
            1 ||
          expiredToken !==
            null
        ) {
          throw new Error(
            'Expired evidence view token was not deleted.',
          );
        }

        viewTokenId =
          null;

        const orphan =
          await reconcileOrphanEvidenceStorage(
            ctx,
            args.orphanStorageId,
            maintenanceNow,
            0,
          );

        const orphanMetadata =
          await ctx.db.system.get(
            '_storage',
            args.orphanStorageId,
          );

        if (
          !orphan.deleted ||
          orphanMetadata !==
            null
        ) {
          throw new Error(
            'Unreferenced evidence orphan was not deleted.',
          );
        }

        const referenced =
          await reconcileOrphanEvidenceStorage(
            ctx,
            args
              .referencedStorageId,
            maintenanceNow,
            0,
          );

        const referencedMetadata =
          await ctx.db.system.get(
            '_storage',
            args
              .referencedStorageId,
          );

        if (
          referenced.deleted ||
          referenced.reason !==
            'referenced' ||
          referencedMetadata ===
            null
        ) {
          throw new Error(
            'Referenced submission evidence was incorrectly deleted.',
          );
        }

        return {
          passed:
            true,
        };
      } finally {
        if (viewTokenId) {
          const token =
            await ctx.db.get(
              viewTokenId,
            );

          if (token) {
            await ctx.db.delete(
              token._id,
            );
          }
        }

        if (submissionId) {
          const submission =
            await ctx.db.get(
              submissionId,
            );

          if (submission) {
            await ctx.db.delete(
              submission._id,
            );
          }
        }

        if (uploadIntentId) {
          const intent =
            await ctx.db.get(
              uploadIntentId,
            );

          if (intent) {
            await ctx.db.delete(
              intent._id,
            );
          }
        }

        for (
          const storageId of
          [
            args
              .abandonedStorageId,
            args
              .orphanStorageId,
            args
              .referencedStorageId,
          ]
        ) {
          const metadata =
            await ctx.db.system.get(
              '_storage',
              storageId,
            );

          if (metadata) {
            await ctx.storage.delete(
              storageId,
            );
          }
        }

        await ctx.db.delete(
          occurrenceId,
        );

        await ctx.db.delete(
          definitionId,
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
