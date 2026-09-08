import {
  v,
} from 'convex/values';

import {
  mutation,
} from './_generated/server';
import { requireCurrentChildAccess } from './lib/auth/childAuthorization';
import { submitClaimableClaim } from './lib/claims/execution';
import {
  submitClaimableRedo,
} from './lib/redos/submission';

/*
 * Attempt 1.
 */
export const submit =
  mutation({
    args: {
      claimId:
        v.id(
          'choreClaims',
        ),

      evidenceUploadIntentId:
        v.optional(
          v.id(
            'submissionEvidenceUploads',
          ),
        ),
    },

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

      return await submitClaimableClaim(
        ctx,
        household._id,
        child._id,
        args.claimId,
        Date.now(),
        args
          .evidenceUploadIntentId,
      );
    },
  });

/*
 * Attempt 2 — the single Redo.
 */
export const submitRedo =
  mutation({
    args: {
      claimId:
        v.id(
          'choreClaims',
        ),

      evidenceUploadIntentId:
        v.optional(
          v.id(
            'submissionEvidenceUploads',
          ),
        ),
    },

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

      return await submitClaimableRedo(
        ctx,
        household._id,
        child._id,
        args.claimId,
        Date.now(),
        args
          .evidenceUploadIntentId,
      );
    },
  });
