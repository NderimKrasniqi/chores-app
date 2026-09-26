import { useQuery } from "convex/react";
import { View } from "react-native";

import { FamilySky } from "@/components/art";
import { AppText } from "@/design-system";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ApprovalActivityItem } from "./approval-activity";
import { ChildActivityFeed } from "./child-activity-feed";

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
      <View testID="child-activity-loading" className="pb-6">
        <FamilySky stars={[]} owners={[]} />
        <AppText color="ink-muted" className="mt-3 text-center font-body-bold">
          Looking up at the family sky…
        </AppText>
      </View>
    );
  }

  return (
    <ChildActivityFeed
      items={feed.items}
      timezone={feed.timezone}
      viewerChildId={viewerChildId}
      onOpenChores={onOpenChores}
    />
  );
}
