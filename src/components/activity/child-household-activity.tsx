import { useQuery } from "convex/react";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";

import { StarBuddy } from "@/components/art";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useHourNow, useStickyValue } from "@/lib/use-hour-now";
import { userErrorMessage } from "@/lib/errors";
import { AppText } from "@/design-system";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ApprovalActivityItem } from "./approval-activity";
import { ChildActivityFeed } from "./child-activity-feed";

export function ChildHouseholdActivity({
  viewerChildId,
  viewerName,
  onOpenChores,
  visualFixture,
}: {
  viewerChildId: Id<"children">;
  viewerName?: string;
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
  const cheers = useQuery(api.cheers.listMine, visualFixture ? "skip" : {});
  const sendCheer = useServerConfirmedMutation(api.cheers.send);
  // Shown as sent straight away; the server confirms (or we put it back).
  const [justCheered, setJustCheered] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const cheered = useMemo(
    () => new Set([...(cheers?.givenActivityIds ?? []), ...justCheered]),
    [cheers, justCheered],
  );

  const feed = visualFixture?.loading
    ? undefined
    : (visualFixture ?? queriedFeed);

  async function handleCheer(activityId: Id<"choreReviews">) {
    setJustCheered((current) => new Set(current).add(activityId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (visualFixture) return;
    try {
      await sendCheer({ activityId });
    } catch (error) {
      setJustCheered((current) => {
        const next = new Set(current);
        next.delete(activityId);
        return next;
      });
      Alert.alert(
        "Couldn’t send the high-five",
        userErrorMessage(error, "Please try again."),
      );
    }
  }

  if (feed === undefined) {
    return (
      <View testID="child-activity-loading" className="items-center pb-6 pt-8">
        <StarBuddy size={64} mood="hop" />
        <AppText color="ink-muted" className="mt-3 text-center font-body-bold">
          Gathering the crew…
        </AppText>
      </View>
    );
  }

  return (
    <ChildActivityFeed
      items={feed.items}
      timezone={feed.timezone}
      viewerChildId={viewerChildId}
      viewerName={viewerName}
      onOpenChores={onOpenChores}
      weekStars={week?.stars}
      seenKey={visualFixture ? undefined : `child.${viewerChildId}`}
      cheered={cheered}
      onCheer={handleCheer}
    />
  );
}
