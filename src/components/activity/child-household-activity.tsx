import { useQuery } from "convex/react";
import { AppText, Surface } from "@/design-system";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ApprovalActivitySurface,
  type ApprovalActivityItem,
} from "./approval-activity";

export function ChildHouseholdActivity({
  viewerChildId,
  onOpenChores,
  visualFixture,
}: {
  viewerChildId: Id<"children">;
  onOpenChores?: () => void;
  visualFixture?: {
    loading?: boolean;
    items: ApprovalActivityItem[];
    timezone: string;
  };
}) {
  const queriedFeed = useQuery(
    api.householdActivity.listForCurrentChild,
    visualFixture ? "skip" : {},
  );
  const feed = visualFixture?.loading
    ? undefined
    : (visualFixture ?? queriedFeed);

  if (feed === undefined) {
    return (
      <Surface testID="child-activity-loading" className="mt-4 p-5">
        <AppText variant="cardTitle">Loading activity…</AppText>
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Your household wins will appear here.
        </AppText>
      </Surface>
    );
  }

  return (
    <ApprovalActivitySurface
      items={feed.items}
      timezone={feed.timezone}
      viewerChildId={viewerChildId}
      showHistory
      onOpenChores={onOpenChores}
      showCelebration={false}
    />
  );
}
