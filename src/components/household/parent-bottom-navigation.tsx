import { Icon, type IconName } from "@/components/ui/icon";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText } from "@/design-system";
import { useQuery } from "convex/react";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/** "reviews" opens from Home (the deck); it has no tab of its own. */
export type ParentSection = "home" | "chores" | "reviews" | "money" | "family";

const items: {
  section: ParentSection;
  label: string;
  icon: IconName;
}[] = [
  { section: "home", label: "Home", icon: "home" },
  { section: "chores", label: "Chores", icon: "chores" },
  { section: "money", label: "Money", icon: "money" },
  { section: "family", label: "Family", icon: "family" },
];

export function ParentBottomNavigation({
  householdId,
  activeSection,
  onSelect,
  visualReviewCount,
}: {
  householdId: Id<"households">;
  activeSection: ParentSection;
  onSelect: (section: ParentSection) => void;
  visualReviewCount?: number;
}) {
  const queryArgs = visualReviewCount === undefined ? { householdId } : "skip";
  const personal = useQuery(api.personalChoreReviews.listPending, queryArgs);
  const claimable = useQuery(api.claimableChoreReviews.listPending, queryArgs);
  const redos = useQuery(api.redoChoreReviews.listPending, queryArgs);
  const reviewCount =
    visualReviewCount ??
    (personal?.length ?? 0) + (claimable?.length ?? 0) + (redos?.length ?? 0);

  // Reviews live on Home now, so Home carries the badge.
  const badgeSection: ParentSection = "home";
  const current = activeSection === "reviews" ? "home" : activeSection;

  return (
    <View className="px-4 pb-1 pt-2">
      <View
        className="flex-row rounded-full p-1.5"
        style={{
          backgroundColor: themeColors.ink,
          shadowColor: "#2B1B4A",
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {items.map((item) => {
          const active = current === item.section;
          return (
            <Pressable
              key={item.section}
              accessibilityRole="tab"
              accessibilityLabel={
                item.section === badgeSection && reviewCount > 0
                  ? `${item.label}, ${reviewCount} to check`
                  : item.label
              }
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(item.section)}
              className="min-h-[48px] flex-1 flex-row items-center justify-center gap-1.5 rounded-full"
              style={{
                backgroundColor: active ? themeColors.action : "transparent",
              }}
            >
              <View>
                <Icon
                  name={item.icon}
                  color={active ? themeColors.onAction : themeColors.surface}
                  size={22}
                />
                {item.section === badgeSection && reviewCount > 0 ? (
                  <View className="absolute -right-2 -top-1.5 min-w-4 items-center rounded-full bg-urgency px-1">
                    <AppText variant="caption" color="white">
                      {reviewCount > 99 ? "99+" : reviewCount}
                    </AppText>
                  </View>
                ) : null}
              </View>
              {active ? (
                <AppText
                  variant="label"
                  style={{ color: themeColors.onAction }}
                >
                  {item.label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
