import { useQuery } from "convex/react";
import { AppText, Surface } from "@/design-system";
import type { ReactNode } from "react";
import { useHourNow, useStickyValue } from "@/lib/use-hour-now";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { View } from "react-native";

import { ApprovalActivitySurface } from "./approval-activity";
import { ChildActivityFeed } from "./child-activity-feed";

export function ParentHouseholdActivity({
  householdId,
  showHistory,
  onAddChore,
  historyHeader,
}: {
  householdId: Id<"households">;

  showHistory: boolean;

  onAddChore?: () => void;
  historyHeader?: ReactNode;
}) {
  /*
   * Keep this query mounted even while the
   * Parent is in Reviews so a newly approved
   * chore can reactively produce celebration.
   */
  const feed = useQuery(api.householdActivity.listForParent, {
    householdId,
  });
  const now = useHourNow();
  const liveWeek = useQuery(
    api.householdActivity.weekForParent,
    showHistory ? { householdId, now } : "skip",
  );
  const week = useStickyValue(liveWeek);

  if (feed === undefined) {
    return (
      <>
        {historyHeader}
        <Surface className="mt-4 p-5">
          <AppText variant="cardTitle">Loading activity…</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            Approved chore wins will appear here.
          </AppText>
        </Surface>
      </>
    );
  }

  if (showHistory) {
    return (
      <>
        {historyHeader}
        <View className="mt-4">
          <ChildActivityFeed
            items={feed.items}
            timezone={feed.timezone}
            weekStars={week?.stars}
            seenKey={`parent.${householdId}`}
            onOpenChores={onAddChore}
            emptyTitle="No family wins yet"
            emptyBody="Every approved chore drops a star in today’s jar."
            emptyActionLabel="Add a chore"
          />
        </View>
      </>
    );
  }

  return (
    <ApprovalActivitySurface
      items={feed.items}
      timezone={feed.timezone}
      showHistory={showHistory}
      historyHeader={historyHeader}
      onOpenChores={onAddChore}
      celebrationStyle="parent"
      emptyActionLabel="Add a chore"
      emptyTitle="No family wins yet"
      emptyBody="When a chore is approved, the celebration will appear here."
      privacyCopy={
        "Rewards shown here are for each chore.\nBalances and payout details stay private."
      }
    />
  );
}
