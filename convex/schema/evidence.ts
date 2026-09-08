import {
  defineTable,
} from 'convex/server';
import {
  v,
} from 'convex/values';

export const evidenceTables = {
  submissionEvidenceUploads:
    defineTable({
      householdId:
        v.id('households'),

      childId:
        v.id('children'),

      occurrenceId:
        v.id(
          'choreOccurrences',
        ),

      attemptNumber:
        v.number(),

      storageId:
        v.optional(
          v.id('_storage'),
        ),

      createdAt:
        v.number(),

      expiresAt:
        v.number(),

      registeredAt:
        v.optional(
          v.number(),
        ),

      consumedAt:
        v.optional(
          v.number(),
        ),

      discardedAt:
        v.optional(
          v.number(),
        ),
    })
      .index(
        'by_child_created_at',
        [
          'childId',
          'createdAt',
        ],
      )
      .index(
        'by_occurrence_attempt',
        [
          'occurrenceId',
          'attemptNumber',
        ],
      ),

  submissionEvidenceViewTokens:
    defineTable({
      tokenHash:
        v.string(),

      householdId:
        v.id('households'),

      submissionId:
        v.id(
          'choreSubmissions',
        ),

      storageId:
        v.id('_storage'),

      viewerAuthUserId:
        v.string(),

      viewerChildId:
        v.optional(
          v.id('children'),
        ),

      createdAt:
        v.number(),

      expiresAt:
        v.number(),
    })
      .index(
        'by_token_hash',
        [
          'tokenHash',
        ],
      )
      .index(
        'by_viewer_auth_user',
        [
          'viewerAuthUserId',
        ],
      ),
};
