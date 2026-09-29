import { ConvexError } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { enqueueNotificationEvent } from "../notifications/events";

/*
 * A Child high-fives a sibling's approved chore (J-11).
 *
 * The sender is always the already-authorized Child; the recipient is
 * whoever the approved submission belongs to. Only approved reviews in the
 * sender's own Household count, never your own win, never a removed
 * sibling, and one per win per sender (a repeat is a no-op). Carries no
 * money and reveals no balance.
 */
export async function sendCheer(
  ctx: MutationCtx,
  sender: { child: Doc<"children">; household: Doc<"households"> },
  activityId: Id<"choreReviews">,
  options: { now?: number; notify?: boolean } = {},
) {
  const { child, household } = sender;
  const now = options.now ?? Date.now();

  const review = await ctx.db.get(activityId);

  if (
    !review ||
    review.householdId !== household._id ||
    review.decision !== "approved"
  ) {
    throw new ConvexError("That win isn’t available any more.");
  }

  const submission = await ctx.db.get(review.submissionId);
  const occurrence = await ctx.db.get(review.occurrenceId);

  if (
    !submission ||
    !occurrence ||
    submission.childId === undefined ||
    submission.householdId !== household._id
  ) {
    throw new ConvexError("That win isn’t available any more.");
  }

  const recipient = await ctx.db.get(submission.childId);
  if (
    !recipient ||
    recipient.archivedAt !== undefined ||
    recipient.householdId !== household._id
  ) {
    throw new ConvexError("That win isn’t available any more.");
  }

  if (recipient._id === child._id) {
    throw new ConvexError("High-fives are for your brothers and sisters.");
  }

  const existing = await ctx.db
    .query("cheers")
    .withIndex("by_activityId_and_fromChildId", (q) =>
      q.eq("activityId", review._id).eq("fromChildId", child._id),
    )
    .unique();

  if (existing) {
    return { status: "already_sent" as const, cheerId: existing._id };
  }

  const cheerId = await ctx.db.insert("cheers", {
    householdId: household._id,
    activityId: review._id,
    fromChildId: child._id,
    toChildId: recipient._id,
    createdAt: now,
  });

  if (options.notify !== false) {
    await enqueueNotificationEvent(
      ctx,
      {
        eventKey: `cheer:${review._id}:${child._id}`,
        kind: "cheer",
        householdId: household._id,
        recipientKind: "child",
        childId: recipient._id,
        title: `${child.displayName} high-fived you`,
        body: `For ${occurrence.title}. Nice work!`,
        occurrenceId: occurrence._id,
      },
      { now },
    );
  }

  return { status: "sent" as const, cheerId };
}
