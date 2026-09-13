import {
  DirectionCIcon,
  type DirectionCIconName,
} from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { AppText } from "@/design-system";
import { useQuery } from "convex/react";
import { Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type ParentSection = "home" | "chores" | "reviews" | "money" | "family";

const items: Array<{
  section: ParentSection;
  label: string;
  icon: DirectionCIconName;
}> = [
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
}: {
  householdId: Id<"households">;
  activeSection: ParentSection;
  onSelect: (section: ParentSection) => void;
}) {
  const personal = useQuery(api.personalChoreReviews.listPending, {
    householdId,
  });
  const claimable = useQuery(api.claimableChoreReviews.listPending, {
    householdId,
  });
  const redos = useQuery(api.redoChoreReviews.listPending, { householdId });
  const reviewCount =
    (personal?.length ?? 0) + (claimable?.length ?? 0) + (redos?.length ?? 0);

  return (
    <View className="min-h-bottom-navigation flex-row border-t border-line bg-surfaceRaised px-2 pt-2">
      {items.map((item) => {
        const active = activeSection === item.section;
        return (
          <Pressable
            key={item.section}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.section)}
            className="min-h-[64px] flex-1 items-center justify-start pt-1"
          >
            <View className="relative h-8 w-10 items-center justify-center">
              <DirectionCIcon
                name={item.icon}
                color={
                  active ? DirectionC.color.green : DirectionC.color.inkMuted
                }
                size={25}
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
              className="mt-0.5"
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
