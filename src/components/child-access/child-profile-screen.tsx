import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const avatar = require("../../../assets/images/direction-c/alex-avatar.png");
const familyArtwork = require("../../../assets/images/direction-c/onboarding-family.png");

function SettingsRow({
  title,
  subtitle,
  icon,
  tone,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: "bell" | "help";
  tone: "mint" | "lavender";
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="mt-3">
      <Surface className="min-h-[82px] flex-row items-center px-4 py-3">
        <View
          className={`h-14 w-14 items-center justify-center rounded-full ${tone === "mint" ? "bg-actionSoftStrong" : "bg-infoSoftStrong"}`}
        >
          <DirectionCIcon
            name={icon}
            color={
              tone === "mint"
                ? DirectionC.color.greenDeep
                : DirectionC.color.ink
            }
            size={28}
          />
        </View>
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle">{title}</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            {subtitle}
          </AppText>
        </View>
        <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={22} />
      </Surface>
    </Pressable>
  );
}

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
      <TopBar title="Profile" onBack={onClose} />
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Surface className="mt-2 min-h-[148px] flex-row items-center p-4">
          <Image
            source={avatar}
            className="h-32 w-32 rounded-full bg-rewardSoft"
            contentFit="cover"
          />
          <View className="ml-5 flex-1">
            <AppText variant="screenTitle" numberOfLines={1}>
              {childName}
            </AppText>
            <AppText className="mt-1" color="ink-muted">
              Child profile
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          Household
        </AppText>
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-2 h-[132px] flex-row items-center overflow-hidden pr-4"
        >
          <Image
            source={familyArtwork}
            className="h-[150px] w-[230px]"
            contentFit="cover"
            contentPosition="top"
          />
          <View className="ml-2 flex-1">
            <AppText variant="cardTitle" numberOfLines={2}>
              {householdName}
            </AppText>
            <AppText className="mt-1" color="ink-muted">
              Current household
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          This device
        </AppText>
        <Surface className="mt-2 min-h-[92px] flex-row items-center p-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-actionSoftStrong">
            <DirectionCIcon
              name="checkShield"
              color={DirectionC.color.greenDeep}
              size={32}
            />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="cardTitle">Device access</AppText>
            <AppText className="mt-1" color="ink-muted">
              Active for {childName}
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-5">
          Help & settings
        </AppText>
        <SettingsRow
          title="Notifications"
          subtitle="Manage device notification settings"
          icon="bell"
          tone="mint"
          onPress={() => void Linking.openSettings()}
        />
        <SettingsRow
          title="Help & onboarding"
          subtitle="Review how the app works"
          icon="help"
          tone="lavender"
          onPress={() => setShowOnboarding(true)}
        />

        <ActionButton
          className="mt-5"
          label="Lock / switch profile"
          tone="secondary"
          loading={locking}
          leading={
            <DirectionCIcon
              name="lockSwitch"
              color={DirectionC.color.ink}
              size={25}
            />
          }
          onPress={() => void lockAndSwitch()}
        />
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-3 text-center"
        >
          You’ll need your PIN to open {childName} again.{`\n`}This profile
          stays saved on this device.
        </AppText>
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
