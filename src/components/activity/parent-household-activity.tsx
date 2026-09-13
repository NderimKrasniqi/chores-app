import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ApprovalActivitySurface } from "./approval-activity";

export function ParentHouseholdActivity({
  householdId,
  showHistory,
  onAddChore,
}: {
  householdId: Id<"households">;

  showHistory: boolean;

  onAddChore?: () => void;
}) {
  /*
   * Keep this query mounted even while the
   * Parent is in Reviews so a newly approved
   * chore can reactively produce celebration.
   */
  const feed = useQuery(api.householdActivity.listForParent, {
    householdId,
  });

  if (feed === undefined) {
    return null;
  }

  return (
    <ApprovalActivitySurface
      items={feed.items}
      timezone={feed.timezone}
      showHistory={showHistory}
      onOpenChores={onAddChore}
      emptyActionLabel="Add a chore"
      emptyTitle="No family wins yet"
      emptyBody="When a chore is approved, the celebration will appear here."
      privacyCopy={
        "Rewards shown here are for each chore.\nBalances and payout details stay private."
      }
    />
  );
}
