import {
  v,
} from 'convex/values';

import {
  internalQuery,
  mutation,
} from './_generated/server';
import {
  requireCurrentChildAccess,
} from './lib/auth/childAuthorization';
import {
  createEvidenceUploadIntent,
  discardEvidenceUpload,
  registerEvidenceUpload,
} from './lib/evidence/submissionEvidence';
import {
  createEvidenceViewToken,
  resolveEvidenceViewToken,
} from './lib/evidence/viewEvidence';

export const generateUploadUrl =
  mutation({
    args: {
      occurrenceId:
        v.id(
          'choreOccurrences',
        ),

      attemptNumber:
        v.number(),
    },

    returns:
      v.object({
        uploadIntentId:
          v.id(
            'submissionEvidenceUploads',
          ),

        uploadUrl:
          v.string(),

        expiresAt:
          v.number(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      const {
        child,
        household,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await createEvidenceUploadIntent(
        ctx,
        household._id,
        child._id,
        args.occurrenceId,
        args.attemptNumber,
      );
    },
  });

export const registerUpload =
  mutation({
    args: {
      uploadIntentId:
        v.id(
          'submissionEvidenceUploads',
        ),

      storageId:
        v.id('_storage'),
    },

    returns:
      v.object({
        accepted:
          v.boolean(),

        reason:
          v.union(
            v.string(),
            v.null(),
          ),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      const {
        child,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await registerEvidenceUpload(
        ctx,
        child._id,
        args.uploadIntentId,
        args.storageId,
      );
    },
  });

export const discardUpload =
  mutation({
    args: {
      uploadIntentId:
        v.id(
          'submissionEvidenceUploads',
        ),
    },

    returns:
      v.object({
        discarded:
          v.boolean(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      const {
        child,
      } =
        await requireCurrentChildAccess(
          ctx,
        );

      return await discardEvidenceUpload(
        ctx,
        child._id,
        args.uploadIntentId,
      );
    },
  });

export const createViewToken =
  mutation({
    args: {
      submissionId:
        v.id(
          'choreSubmissions',
        ),
    },

    returns:
      v.object({
        path:
          v.string(),

        expiresAt:
          v.number(),
      }),

    handler: async (
      ctx,
      args,
    ) => {
      return await createEvidenceViewToken(
        ctx,
        args.submissionId,
      );
    },
  });

export const resolveViewToken =
  internalQuery({
    args: {
      tokenHash:
        v.string(),
    },

    returns:
      v.union(
        v.object({
          storageId:
            v.id(
              '_storage',
            ),
        }),
        v.null(),
      ),

    handler: async (
      ctx,
      args,
    ) => {
      return await resolveEvidenceViewToken(
        ctx,
        args.tokenHash,
      );
    },
  });
