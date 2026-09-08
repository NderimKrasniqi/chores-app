import {
  ConvexError,
} from 'convex/values';

import type {
  Id,
} from '../../_generated/dataModel';
import type {
  MutationCtx,
  QueryCtx,
} from '../../_generated/server';
import {
  authComponent,
} from '../../auth';
import {
  isAnonymousAuthUser,
} from '../auth/parentAuthorization';
import {
  getUniqueActiveChildAccessGrantForAuthUser,
} from '../childAccess/activeGrants';

type DatabaseCtx =
  | MutationCtx
  | QueryCtx;

const viewTokenLifetimeMs =
  60 * 1000;

function bytesToHex(
  bytes:
    ArrayBuffer,
) {
  return Array.from(
    new Uint8Array(
      bytes,
    ),
  )
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(
            2,
            '0',
          ),
    )
    .join('');
}

export async function hashEvidenceViewToken(
  token: string,
) {
  const normalized =
    token.trim();

  if (!normalized) {
    throw new Error(
      'Evidence view token cannot be empty.',
    );
  }

  const digest =
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        normalized,
      ),
    );

  return bytesToHex(
    digest,
  );
}

function createRawViewToken() {
  const bytes =
    new Uint8Array(
      32,
    );

  crypto.getRandomValues(
    bytes,
  );

  return Array.from(
    bytes,
  )
    .map(
      (value) =>
        value
          .toString(16)
          .padStart(
            2,
            '0',
          ),
    )
    .join('');
}

export async function createEvidenceViewToken(
  ctx: MutationCtx,
  submissionId:
    Id<'choreSubmissions'>,
  now = Date.now(),
) {
  const authUser =
    await authComponent
      .safeGetAuthUser(
        ctx,
      );

  if (!authUser) {
    throw new ConvexError(
      'Authentication required.',
    );
  }

  const submission =
    await ctx.db.get(
      submissionId,
    );

  if (!submission) {
    throw new ConvexError(
      'Submission not found.',
    );
  }

  if (
    submission.evidenceStorageId ===
    undefined
  ) {
    throw new ConvexError(
      'This submission has no photo evidence.',
    );
  }

  const parentMembership =
    isAnonymousAuthUser(
      authUser,
    )
      ? null
      : await ctx.db
          .query(
            'householdMembers',
          )
          .withIndex(
            'by_household_auth_user',
            (q) =>
              q
                .eq(
                  'householdId',
                  submission
                    .householdId,
                )
                .eq(
                  'authUserId',
                  authUser._id,
                ),
          )
          .unique();

  const hasParentAccess =
    parentMembership?.role ===
    'parent';

  let viewerChildId:
    | Id<'children'>
    | undefined;

  if (
    !hasParentAccess
  ) {
    const matchingGrant =
      await getUniqueActiveChildAccessGrantForAuthUser(
        ctx,
        authUser._id,
      );

    if (
      !matchingGrant ||
      matchingGrant.householdId !==
        submission.householdId ||
      matchingGrant.childId !==
        submission.childId
    ) {
      throw new ConvexError(
        'You are not authorized to view this evidence.',
      );
    }

    viewerChildId =
      matchingGrant.childId;
  }

  const previousTokens =
    await ctx.db
      .query(
        'submissionEvidenceViewTokens',
      )
      .withIndex(
        'by_viewer_auth_user',
        (q) =>
          q.eq(
            'viewerAuthUserId',
            authUser._id,
          ),
      )
      .collect();

  for (
    const token of
    previousTokens
  ) {
    if (
      token.expiresAt <=
        now ||
      token.submissionId ===
        submission._id
    ) {
      await ctx.db.delete(
        token._id,
      );
    }
  }

  const rawToken =
    createRawViewToken();

  const tokenHash =
    await hashEvidenceViewToken(
      rawToken,
    );

  const expiresAt =
    now +
    viewTokenLifetimeMs;

  await ctx.db.insert(
    'submissionEvidenceViewTokens',
    {
      tokenHash,

      householdId:
        submission
          .householdId,

      submissionId:
        submission._id,

      storageId:
        submission
          .evidenceStorageId,

      viewerAuthUserId:
        authUser._id,

      ...(viewerChildId !==
      undefined
        ? {
            viewerChildId,
          }
        : {}),

      createdAt:
        now,

      expiresAt,
    },
  );

  return {
    path:
      `/submission-evidence?token=${rawToken}`,

    expiresAt,
  };
}

export async function resolveEvidenceViewToken(
  ctx: DatabaseCtx,
  tokenHash:
    string,
  now = Date.now(),
) {
  const token =
    await ctx.db
      .query(
        'submissionEvidenceViewTokens',
      )
      .withIndex(
        'by_token_hash',
        (q) =>
          q.eq(
            'tokenHash',
            tokenHash,
          ),
      )
      .unique();

  if (
    !token ||
    now >
      token.expiresAt
  ) {
    return null;
  }

  const submission =
    await ctx.db.get(
      token.submissionId,
    );

  if (
    !submission ||
    submission.householdId !==
      token.householdId ||
    submission.evidenceStorageId !==
      token.storageId
  ) {
    return null;
  }

  if (
    token.viewerChildId ===
    undefined
  ) {
    const membership =
      await ctx.db
        .query(
          'householdMembers',
        )
        .withIndex(
          'by_household_auth_user',
          (q) =>
            q
              .eq(
                'householdId',
                token.householdId,
              )
              .eq(
                'authUserId',
                token
                  .viewerAuthUserId,
              ),
        )
        .unique();

    if (
      !membership ||
      membership.role !==
        'parent'
    ) {
      return null;
    }
  } else {
    if (
      token.viewerChildId !==
      submission.childId
    ) {
      return null;
    }

    const activeGrant =
      await getUniqueActiveChildAccessGrantForAuthUser(
        ctx,
        token.viewerAuthUserId,
      );

    if (
      !activeGrant ||
      activeGrant.householdId !==
        token.householdId ||
      activeGrant.childId !==
        token.viewerChildId
    ) {
      return null;
    }
  }

  return {
    storageId:
      token.storageId,
  };
}
