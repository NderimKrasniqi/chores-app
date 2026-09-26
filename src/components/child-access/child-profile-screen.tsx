import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { PopIn, Starfield } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { Icon, type IconName } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { AvatarPlanet } from "./child-pin-unlock-screen";

/** A round "device linked" stamp pressed onto the passport. */
function LinkedStamp() {
  const { tokens } = useTheme();
  return (
    <PopIn delay={250}>
      <View
        accessible
        accessibilityLabel="This device is linked"
        style={{ transform: [{ rotate: "-12deg" }] }}
        className="h-[78px] w-[78px] items-center justify-center"
      >
        <Svg
          width={78}
          height={78}
          viewBox="0 0 78 78"
          style={{ position: "absolute" }}
        >
          <Circle
            cx={39}
            cy={39}
            r={35}
            fill="none"
            stroke={tokens.primary}
            strokeWidth={3}
          />
          <Circle
            cx={39}
            cy={39}
            r={29}
            fill="none"
            stroke={tokens.primary}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <Path
            d="M28 40l7 7 15-16"
            fill="none"
            stroke={tokens.primary}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <AppText
          className="absolute bottom-[9px] font-body-heavy text-[8px] uppercase tracking-[1px]"
          color="primary"
        >
          Linked
        </AppText>
      </View>
    </PopIn>
  );
}

function ShipTile({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      className="flex-1"
    >
      {({ pressed }) => (
        <Animated.View
          className="min-h-[120px] justify-between rounded-large bg-surface p-4"
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-nightRaised">
            <Icon name={icon} color={tokens.gold} size={22} />
          </View>
          <View>
            <AppText className="font-body-heavy text-[16px]">{title}</AppText>
            <AppText variant="caption" color="ink-muted" className="mt-0.5">
              {subtitle}
            </AppText>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * The child's quest passport: who they are, which crew (household) they fly
 * with, a stamp showing this device is linked, and the airlock to lock the
 * profile and hand the device over.
 */
export function ChildProfileScreen({
  childName,
  householdName,
  onClose,
  onLockAndSwitch,
}: {
  childName: string;
  householdName: string;
  onClose: () => void;
  onLockAndSwitch: () => Promise<void>;
}) {
  const { tokens } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [locking, setLocking] = useState(false);

  async function lockAndSwitch() {
    setLocking(true);
    try {
      await onLockAndSwitch();
    } finally {
      setLocking(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <Starfield seed={childName.length + 23} />
      <View className="flex-row items-center justify-between px-5 pb-1 pt-3">
        <AppText variant="screenTitle">Passport</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close profile"
          onPress={onClose}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" color={tokens.ink} size={18} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-3 overflow-hidden rounded-large bg-surface">
          <View className="flex-row">
            <View className="h-2 flex-1 bg-pink" />
            <View className="h-2 flex-1 bg-gold" />
            <View className="h-2 flex-1 bg-accent" />
            <View className="h-2 flex-1 bg-primary" />
          </View>
          <View className="p-4">
            <AppText
              variant="label"
              color="ink-muted"
              className="uppercase tracking-[1.6px]"
            >
              Quest passport
            </AppText>
            <View className="mt-3 flex-row items-center gap-4">
              <AvatarPlanet name={childName} size={72} />
              <View className="flex-1">
                <AppText variant="screenTitle" numberOfLines={1}>
                  {childName}
                </AppText>
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  className="mt-0.5 font-body-bold"
                  numberOfLines={2}
                >
                  Crew of {householdName}
                </AppText>
              </View>
            </View>
            <View className="mt-3 flex-row items-end justify-between">
              <View className="flex-1 pr-3">
                <AppText variant="caption" color="ink-muted">
                  This device
                </AppText>
                <AppText className="font-body-heavy text-[15px]">
                  Active for {childName}
                </AppText>
              </View>
              <LinkedStamp />
            </View>
          </View>
        </View>

        <AppText variant="sectionTitle" className="mt-6">
          Your ship
        </AppText>
        <View className="mt-3 flex-row gap-3">
          <ShipTile
            icon="bell"
            title="Alerts"
            subtitle="Phone notification settings"
            onPress={() => void Linking.openSettings()}
          />
          <ShipTile
            icon="help"
            title="How it works"
            subtitle="Replay the quest guide"
            onPress={() => setShowOnboarding(true)}
          />
        </View>

        <View className="mt-6 rounded-large border-2 border-dashed border-nightRaised p-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-nightRaised">
              <Icon name="lockSwitch" color={tokens.ink} size={22} />
            </View>
            <View className="flex-1">
              <AppText className="font-body-heavy text-[16px]">Airlock</AppText>
              <AppText variant="caption" color="ink-muted" className="mt-0.5">
                Lock your profile so someone else can use this device. Your star
                code opens it again.
              </AppText>
            </View>
          </View>
          <ActionButton
            testID="child-pin-use-another-profile"
            className="mt-4"
            label="Lock & switch"
            tone="secondary"
            loading={locking}
            leading={<Icon name="lock" color={tokens.ink} size={18} />}
            onPress={() => void lockAndSwitch()}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showOnboarding}
        animationType="slide"
        onRequestClose={() => setShowOnboarding(false)}
      >
        <OnboardingScreen
          reviewMode
          onChooseParent={() => {}}
          onChooseChild={() => {}}
          onDone={() => setShowOnboarding(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}
