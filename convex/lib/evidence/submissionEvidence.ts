import {
  ConvexError,
} from 'convex/values';

import type {
  Doc,
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
} from '../../_generated/server';

const uploadIntentLifetimeMs =
  15 * 60 * 1000;

const maximumEvidenceBytes =
  3_000_000;

function requireAttemptNumber(
  value: number,
): asserts value is 1 | 2 {
  if (
    value !== 1 &&
    value !== 2
  ) {
    throw new ConvexError(
      'Evidence attempt must be 1 or 2.',
    );
  }
}

async function resolveUploadDeadline(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  occurrence:
    Doc<'choreOccurrences'>,
  attemptNumber:
    1 | 2,
  now: number,
) {
  if (
    occurrence.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'Evidence target belongs to another Household.',
    );
  }

  if (
    attemptNumber ===
    1
  ) {
    if (
      occurrence.state !==
      'available'
    ) {
      throw new ConvexError(
        'This Chore is not available for submission.',
      );
    }

    if (
      now <
      occurrence
        .availabilityStartsAt
    ) {
      throw new ConvexError(
        'This Chore is not available yet.',
      );
    }

    if (
      now >
      occurrence.deadlineAt
    ) {
      throw new ConvexError(
        'The submission deadline has passed.',
      );
    }

    return occurrence
      .deadlineAt;
  }

  if (
    occurrence.state !==
    'redo_required'
  ) {
    throw new ConvexError(
      'This Chore is not awaiting a Redo.',
    );
  }

  const redo =
    await ctx.db
      .query(
        'choreRedos',
      )
      .withIndex(
        'by_occurrence',
        (q) =>
          q.eq(
            'occurrenceId',
            occurrence._id,
          ),
      )
      .unique();

  if (!redo) {
    throw new ConvexError(
      'Redo opportunity not found.',
    );
  }

  if (
    redo.householdId !==
    householdId
  ) {
    throw new ConvexError(
      'Redo Household mismatch.',
    );
  }

  if (
    now <
    redo.createdAt
  ) {
    throw new ConvexError(
      'This Redo is not available yet.',
    );
  }

  if (
    now >
    redo.deadlineAt
  ) {
    throw new ConvexError(
      'The Redo deadline has passed.',
    );
  }

  return redo.deadlineAt;
}

async function validateEvidenceTarget(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  occurrenceId:
    Id<'choreOccurrences'>,
  attemptNumber:
    1 | 2,
  now: number,
) {
  const occurrence =
    await ctx.db.get(
      occurrenceId,
    );

  if (!occurrence) {
    throw new ConvexError(
      'Chore occurrence not found.',
    );
  }

  if (
    occurrence.kind ===
    'personal'
  ) {
    if (
      occurrence
        .personalChildId !==
      childId
    ) {
      throw new ConvexError(
        'This Personal Chore belongs to another Child.',
      );
    }
  } else {
    const claims =
      await ctx.db
        .query(
          'choreClaims',
        )
        .withIndex(
          'by_occurrence',
          (q) =>
            q.eq(
              'occurrenceId',
              occurrence._id,
            ),
        )
        .collect();

    const expectedState =
      attemptNumber === 1
        ? 'claimed'
        : 'redo_required';

    const ownedClaim =
      claims.find(
        (claim) =>
          claim.householdId ===
            householdId &&
          claim.childId ===
            childId &&
          claim.state ===
            expectedState,
      );

    if (!ownedClaim) {
      throw new ConvexError(
        'This Child does not own the required Claim.',
      );
    }
  }

  const existingSubmission =
    await ctx.db
      .query(
        'choreSubmissions',
      )
      .withIndex(
        'by_occurrence_attempt',
        (q) =>
          q
            .eq(
              'occurrenceId',
              occurrence._id,
            )
            .eq(
              'attemptNumber',
              attemptNumber,
            ),
      )
      .unique();

  if (existingSubmission) {
    throw new ConvexError(
      'This submission attempt already exists.',
    );
  }

  const deadlineAt =
    await resolveUploadDeadline(
      ctx,
      householdId,
      childId,
      occurrence,
      attemptNumber,
      now,
    );

  return {
    occurrence,
    deadlineAt,
  };
}

export async function createEvidenceUploadIntent(
  ctx: MutationCtx,
  householdId:
    Id<'households'>,
  childId:
    Id<'children'>,
  occurrenceId:
    Id<'choreOccurrences'>,
  attemptNumberValue:
    number,
  now = Date.now(),
) {
  if (
    !Number.isFinite(
      now,
    )
  ) {
    throw new ConvexError(
      'Upload time must be finite.',
    );
  }

  requireAttemptNumber(
    attemptNumberValue,
  );

  const {
    occurrence,
    deadlineAt,
  } =
    await validateEvidenceTarget(
      ctx,
      householdId,
      childId,
      occurrenceId,
      attemptNumberValue,
      now,
    );

  const expiresAt =
    Math.min(
      now +
        uploadIntentLifetimeMs,
      deadlineAt,
    );

  const uploadUrl =
    await ctx.storage
      .generateUploadUrl();

  const uploadIntentId =
    await ctx.db.insert(
      'submissionEvidenceUploads',
      {
        householdId,

        childId,

        occurrenceId:
          occurrence._id,

        attemptNumber:
          attemptNumberValue,

        createdAt:
          now,

        expiresAt,
      },
    );

  return {
    uploadIntentId,

    uploadUrl,

    expiresAt,
  };
}

export async function registerEvidenceUpload(
  ctx: MutationCtx,
  childId:
    Id<'children'>,
  uploadIntentId:
    Id<'submissionEvidenceUploads'>,
  storageId:
    Id<'_storage'>,
  now = Date.now(),
) {
  const intent =
    await ctx.db.get(
      uploadIntentId,
    );

  if (!intent) {
    throw new ConvexError(
      'Evidence upload intent not found.',
    );
  }

  if (
    intent.childId !==
    childId
  ) {
    throw new ConvexError(
      'This evidence upload belongs to another Child.',
    );
  }

  if (
    intent.consumedAt !==
      undefined ||
    intent.discardedAt !==
      undefined
  ) {
    throw new ConvexError(
      'This evidence upload is no longer active.',
    );
  }

  if (
    now >
    intent.expiresAt
  ) {
    throw new ConvexError(
      'This evidence upload has expired.',
    );
  }

  if (
    intent.storageId !==
    undefined
  ) {
    if (
      intent.storageId ===
      storageId
    ) {
      return {
        accepted:
          true,

        reason:
          null,
      };
    }

    throw new ConvexError(
      'This evidence upload already has a different file.',
    );
  }

  const metadata =
    await ctx.db.system.get(
      '_storage',
      storageId,
    );

  if (!metadata) {
    return {
      accepted:
        false,

      reason:
        'Uploaded photo was not found.',
    };
  }

  const validImage =
    metadata.contentType ===
      'image/jpeg' &&
    metadata.size >
      0 &&
    metadata.size <=
      maximumEvidenceBytes;

  if (!validImage) {
    await ctx.storage.delete(
      storageId,
    );

    await ctx.db.patch(
      intent._id,
      {
        discardedAt:
          now,
      },
    );

    return {
      accepted:
        false,

      reason:
        'Photo must be a JPEG smaller than 3 MB.',
    };
  }

  await ctx.db.patch(
    intent._id,
    {
      storageId,

      registeredAt:
        now,
    },
  );

  return {
    accepted:
      true,

    reason:
      null,
  };
}

export async function discardEvidenceUpload(
  ctx: MutationCtx,
  childId:
    Id<'children'>,
  uploadIntentId:
    Id<'submissionEvidenceUploads'>,
  now = Date.now(),
) {
  const intent =
    await ctx.db.get(
      uploadIntentId,
    );

  if (!intent) {
    return {
      discarded:
        true,
    };
  }

  if (
    intent.childId !==
    childId
  ) {
    throw new ConvexError(
      'This evidence upload belongs to another Child.',
    );
  }

  if (
    intent.consumedAt !==
    undefined
  ) {
    throw new ConvexError(
      'Submitted evidence cannot be discarded.',
    );
  }

  if (
    intent.discardedAt !==
    undefined
  ) {
    return {
      discarded:
        true,
    };
  }

  if (
    intent.storageId !==
    undefined
  ) {
    await ctx.storage.delete(
      intent.storageId,
    );
  }

  await ctx.db.patch(
    intent._id,
    {
      discardedAt:
        now,
    },
  );

  return {
    discarded:
      true,
  };
}

export async function consumeEvidenceUploadIntent(
  ctx: MutationCtx,
  evidenceUploadIntentId:
    | Id<'submissionEvidenceUploads'>
    | undefined,
  expected: {
    householdId:
      Id<'households'>;

    childId:
      Id<'children'>;

    occurrenceId:
      Id<'choreOccurrences'>;

    attemptNumber:
      1 | 2;
  },
  now: number,
) {
  if (
    evidenceUploadIntentId ===
    undefined
  ) {
    return undefined;
  }

  const intent =
    await ctx.db.get(
      evidenceUploadIntentId,
    );

  if (!intent) {
    throw new ConvexError(
      'Evidence upload intent not found.',
    );
  }

  if (
    intent.householdId !==
      expected.householdId ||
    intent.childId !==
      expected.childId ||
    intent.occurrenceId !==
      expected.occurrenceId ||
    intent.attemptNumber !==
      expected.attemptNumber
  ) {
    throw new ConvexError(
      'Evidence upload does not match this submission.',
    );
  }

  if (
    intent.discardedAt !==
      undefined ||
    intent.consumedAt !==
      undefined
  ) {
    throw new ConvexError(
      'Evidence upload is no longer available.',
    );
  }

  if (
    now >
    intent.expiresAt
  ) {
    throw new ConvexError(
      'Evidence upload has expired. Submit without it or add a new photo.',
    );
  }

  if (
    intent.storageId ===
      undefined ||
    intent.registeredAt ===
      undefined
  ) {
    throw new ConvexError(
      'Evidence photo has not finished uploading.',
    );
  }

  const metadata =
    await ctx.db.system.get(
      '_storage',
      intent.storageId,
    );

  if (
    !metadata ||
    metadata.contentType !==
      'image/jpeg' ||
    metadata.size <=
      0 ||
    metadata.size >
      maximumEvidenceBytes
  ) {
    throw new ConvexError(
      'Evidence photo is unavailable or invalid.',
    );
  }

  await ctx.db.patch(
    intent._id,
    {
      consumedAt:
        now,
    },
  );

  return intent.storageId;
}
