import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ApprovalActivitySurface } from "./approval-activity";

export function ChildHouseholdActivity({
  viewerChildId,
  onOpenChores,
}: {
  viewerChildId: Id<"children">;
  onOpenChores?: () => void;
}) {
  const feed = useQuery(api.householdActivity.listForCurrentChild);

  if (feed === undefined) {
    return null;
  }

  return (
    <ApprovalActivitySurface
      items={feed.items}
      timezone={feed.timezone}
      viewerChildId={viewerChildId}
      showHistory
      onOpenChores={onOpenChores}
    />
  );
}
