import { useQuery } from "convex/react";
import { View } from "react-native";

import { StarShelf } from "@/components/art";
import { useHourNow, useStickyValue } from "@/lib/use-hour-now";
import { AppText } from "@/design-system";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ApprovalActivityItem } from "./approval-activity";
import { ChildActivityFeed } from "./child-activity-feed";

const EMPTY_WEEK = ["M", "T", "W", "T", "F", "S", "S"].map((label, i) => ({
  key: String(i),
  label,
  isToday: i === 6,
  stars: [],
}));

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
  const now = useHourNow();
  const liveWeek = useQuery(
    api.householdActivity.weekForCurrentChild,
    visualFixture ? "skip" : { now },
  );
  const week = useStickyValue(liveWeek);
  const feed = visualFixture?.loading
    ? undefined
    : (visualFixture ?? queriedFeed);

  if (feed === undefined) {
    return (
      <View testID="child-activity-loading" className="pb-6">
        <StarShelf days={EMPTY_WEEK} />
        <AppText color="ink-muted" className="mt-3 text-center font-body-bold">
          Counting the family’s stars…
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
      weekStars={week?.stars}
      seenKey={visualFixture ? undefined : `child.${viewerChildId}`}
    />
  );
}
