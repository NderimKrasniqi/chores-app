import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

const expiredIntentBatchSize =
  50;

const expiredTokenBatchSize =
  100;

const storageScanBatchSize =
  50;

/*
 * Unregistered uploads have no application
 * row linking them to an upload intent.
 *
 * Only old, unreferenced JPEGs are eligible
 * for automatic orphan deletion.
 *
 * This grace window avoids racing a client
 * between upload completion and
 * registerUpload.
 */
export const evidenceOrphanGraceMs =
  24 *
  60 *
  60 *
  1000;

async function storageExists(
  ctx:
    MutationCtx,
  storageId:
    Id<'_storage'>,
) {
  return (
    await ctx.db.system.get(
      '_storage',
      storageId,
    )
  ) !== null;
}

export async function isEvidenceStorageReferenced(
  ctx:
    MutationCtx,
  storageId:
    Id<'_storage'>,
) {
  const [
    uploadIntent,
    submission,
    viewToken,
  ] =
    await Promise.all([
      ctx.db
        .query(
          'submissionEvidenceUploads',
        )
        .withIndex(
          'by_storage_id',
          (q) =>
            q.eq(
              'storageId',
              storageId,
            ),
        )
        .first(),

      ctx.db
        .query(
          'choreSubmissions',
        )
        .withIndex(
          'by_evidence_storage_id',
          (q) =>
            q.eq(
              'evidenceStorageId',
              storageId,
            ),
        )
        .first(),

      ctx.db
        .query(
          'submissionEvidenceViewTokens',
        )
        .withIndex(
          'by_storage_id',
          (q) =>
            q.eq(
              'storageId',
              storageId,
            ),
        )
        .first(),
    ]);

  return (
    uploadIntent !==
      null ||
    submission !==
      null ||
    viewToken !==
      null
  );
}

export async function reconcileOrphanEvidenceStorage(
  ctx:
    MutationCtx,
  storageId:
    Id<'_storage'>,
  now =
    Date.now(),
  minimumAgeMs =
    evidenceOrphanGraceMs,
) {
  const metadata =
    await ctx.db.system.get(
      '_storage',
      storageId,
    );

  if (!metadata) {
    return {
      deleted:
        false,

      reason:
        'missing' as const,
    };
  }

  /*
   * Conservative automated scope.
   *
   * Submission evidence is normalized to
   * JPEG before registration.
   *
   * Do not assume every future Convex
   * Storage object belongs to evidence.
   */
  if (
    metadata.contentType !==
    'image/jpeg'
  ) {
    return {
      deleted:
        false,

      reason:
        'unsupported_type' as const,
    };
  }

  if (
    now -
      metadata._creationTime <
    minimumAgeMs
  ) {
    return {
      deleted:
        false,

      reason:
        'grace_period' as const,
    };
  }

  if (
    await isEvidenceStorageReferenced(
      ctx,
      storageId,
    )
  ) {
    return {
      deleted:
        false,

      reason:
        'referenced' as const,
    };
  }

  await ctx.storage.delete(
    storageId,
  );

  return {
    deleted:
      true,

    reason:
      'orphan' as const,
  };
}

export async function cleanupExpiredEvidenceUploadIntents(
  ctx:
    MutationCtx,
  now =
    Date.now(),
) {
  const intents =
    await ctx.db
      .query(
        'submissionEvidenceUploads',
      )
      .withIndex(
        'by_expires_at',
        (q) =>
          q.lte(
            'expiresAt',
            now,
          ),
      )
      .take(
        expiredIntentBatchSize,
      );

  let deletedFiles =
    0;

  for (
    const intent of
    intents
  ) {
    if (
      intent.storageId !==
      undefined
    ) {
      /*
       * A successfully consumed upload is
       * durable through
       * choreSubmissions.evidenceStorageId.
       *
       * Anything else still pointing only
       * at the expired upload intent is
       * abandoned.
       */
      const submission =
        await ctx.db
          .query(
            'choreSubmissions',
          )
          .withIndex(
            'by_evidence_storage_id',
            (q) =>
              q.eq(
                'evidenceStorageId',
                intent.storageId,
              ),
          )
          .first();

      if (
        !submission &&
        await storageExists(
          ctx,
          intent.storageId,
        )
      ) {
        await ctx.storage.delete(
          intent.storageId,
        );

        deletedFiles +=
          1;
      }
    }

    /*
     * Upload intents are transient
     * coordination records, not durable
     * business history.
     */
    await ctx.db.delete(
      intent._id,
    );
  }

  return {
    processed:
      intents.length,

    deletedIntents:
      intents.length,

    deletedFiles,
  };
}

export async function cleanupExpiredEvidenceViewTokens(
  ctx:
    MutationCtx,
  now =
    Date.now(),
) {
  const tokens =
    await ctx.db
      .query(
        'submissionEvidenceViewTokens',
      )
      .withIndex(
        'by_expires_at',
        (q) =>
          q.lte(
            'expiresAt',
            now,
          ),
      )
      .take(
        expiredTokenBatchSize,
      );

  for (
    const token of
    tokens
  ) {
    await ctx.db.delete(
      token._id,
    );
  }

  return {
    deletedTokens:
      tokens.length,
  };
}

async function getStorageScanCursor(
  ctx:
    MutationCtx,
) {
  const state =
    await ctx.db
      .query(
        'evidenceMaintenanceState',
      )
      .withIndex(
        'by_key',
        (q) =>
          q.eq(
            'key',
            'storage_orphan_scan',
          ),
      )
      .unique();

  return state;
}

async function scanStorageOrphanPage(
  ctx:
    MutationCtx,
  now:
    number,
) {
  const state =
    await getStorageScanCursor(
      ctx,
    );

  const cursor =
    state?.storageCursor ??
    null;

  const page =
    await ctx.db.system
      .query(
        '_storage',
      )
      .order(
        'asc',
      )
      .paginate({
        numItems:
          storageScanBatchSize,

        cursor,
      });

  let deletedOrphans =
    0;

  for (
    const metadata of
    page.page
  ) {
    const result =
      await reconcileOrphanEvidenceStorage(
        ctx,
        metadata._id,
        now,
      );

    if (
      result.deleted
    ) {
      deletedOrphans +=
        1;
    }
  }

  const nextCursor =
    page.isDone
      ? null
      : page.continueCursor;

  if (state) {
    await ctx.db.patch(
      state._id,
      {
        storageCursor:
          nextCursor,

        updatedAt:
          now,
      },
    );
  } else {
    await ctx.db.insert(
      'evidenceMaintenanceState',
      {
        key:
          'storage_orphan_scan',

        storageCursor:
          nextCursor,

        updatedAt:
          now,
      },
    );
  }

  return {
    scannedStorageObjects:
      page.page.length,

    deletedOrphans,

    completedStorageCycle:
      page.isDone,
  };
}

export async function runEvidenceMaintenance(
  ctx:
    MutationCtx,
  now =
    Date.now(),
) {
  const intents =
    await cleanupExpiredEvidenceUploadIntents(
      ctx,
      now,
    );

  const tokens =
    await cleanupExpiredEvidenceViewTokens(
      ctx,
      now,
    );

  const storage =
    await scanStorageOrphanPage(
      ctx,
      now,
    );

  return {
    expiredIntentsProcessed:
      intents.processed,

    expiredIntentFilesDeleted:
      intents.deletedFiles,

    expiredViewTokensDeleted:
      tokens.deletedTokens,

    storageObjectsScanned:
      storage
        .scannedStorageObjects,

    orphanFilesDeleted:
      storage
        .deletedOrphans,

    completedStorageCycle:
      storage
        .completedStorageCycle,
  };
}
