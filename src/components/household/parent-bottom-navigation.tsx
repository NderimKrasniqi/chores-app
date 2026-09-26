import {
  Icon,
  type IconName,
} from "@/components/ui/icon";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText } from "@/design-system";
import { useQuery } from "convex/react";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type ParentSection = "home" | "chores" | "reviews" | "money" | "family";

const items: {
  section: ParentSection;
  label: string;
  icon: IconName;
}[] = [
  { section: "home", label: "Home", icon: "home" },
  { section: "chores", label: "Chores", icon: "chores" },
  { section: "reviews", label: "Reviews", icon: "reviews" },
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

  return (
    <View className="min-h-[48px] flex-row rounded-t-sheet bg-surfaceRaised px-1.5 pt-1">
      {items.map((item) => {
        const active = activeSection === item.section;
        return (
          <Pressable
            key={item.section}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.section)}
            className="min-h-[46px] flex-1 items-center justify-center"
          >
            <View className="relative h-7 w-10 items-center justify-center">
              <Icon
                name={
                  active
                    ? item.icon
                    : item.icon === "home"
                      ? "home"
                      : item.icon === "chores"
                        ? "choresOutline"
                        : item.icon === "reviews"
                          ? "reviewsOutline"
                          : item.icon === "money"
                            ? "moneyOutline"
                            : "familyOutline"
                }
                color={
                  active ? themeColors.action : themeColors.inkMuted
                }
                size={26}
              />
              {item.section === "reviews" && reviewCount > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-urgency px-1 py-0.5">
                  <AppText variant="caption" color="white">
                    {reviewCount > 99 ? "99+" : reviewCount}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              variant="caption"
              color={active ? "action" : "ink-muted"}
              className={`mt-0.5 ${active ? "font-black" : ""}`}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
