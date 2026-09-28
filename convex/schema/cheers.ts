import { defineTable } from "convex/server";
import { v } from "convex/values";

export const cheerTables = {
  /*
   * A sibling's high-five on an approved chore (J-11: celebrate household
   * progress). One per win per sender; carries no money.
   */
  cheers: defineTable({
    householdId: v.id("households"),

    /** The approved review the high-five is for. */
    activityId: v.id("choreReviews"),

    fromChildId: v.id("children"),

    toChildId: v.id("children"),

    createdAt: v.number(),
  })
    .index("by_activityId_and_fromChildId", ["activityId", "fromChildId"])
    .index("by_toChildId_and_createdAt", ["toChildId", "createdAt"])
    .index("by_fromChildId_and_createdAt", ["fromChildId", "createdAt"]),
};
