import { v } from "convex/values";

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

export const seedReviewsQueue = internalAction({
  args: {
    householdId: v.id("households"),
    expectedParentAuthUserId: v.string(),
  },
  returns: v.object({
    scenario: v.literal("reviews_queue"),
    householdId: v.id("households"),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    scenario: "reviews_queue";
    householdId: Id<"households">;
  }> => {
    await ctx.runQuery(internal.dev.visualFixtures.validateTarget, args);

    const evidenceStorageId = await ctx.storage.store(
      new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
        type: "image/jpeg",
      }),
    );

    try {
      return await ctx.runMutation(
        internal.dev.visualFixtures.seedReviewsQueueWithEvidence,
        { ...args, evidenceStorageId },
      );
    } catch (error) {
      await ctx.storage.delete(evidenceStorageId);
      throw error;
    }
  },
});
