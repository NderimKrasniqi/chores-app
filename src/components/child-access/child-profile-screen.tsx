import { OnboardingScreen } from "@/components/onboarding/onboarding-screen";
import { Icon } from "@/components/ui/icon";
import {
  childAvatarTone,
  Avatar,
} from "@/components/ui/avatar";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import { AppImage as Image } from "@/components/ui/app-image";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const familyArtwork = require("../../../assets/images/direction-c/household-family.png");

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

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
    <Pressable accessibilityRole="button" onPress={onPress} className="mt-2">
      <Surface className="min-h-[76px] flex-row items-center px-3 py-2">
        <View
          className={`h-14 w-14 items-center justify-center rounded-full ${tone === "mint" ? "bg-actionSoftStrong" : "bg-infoSoftStrong"}`}
        >
          <Icon
            name={icon}
            color={
              tone === "mint"
                ? themeColors.actionPressed
                : themeColors.ink
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
        <Icon name="chevron" color={themeColors.ink} size={22} />
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
        <Surface className="mt-2 min-h-[120px] flex-row items-center p-3">
          <Avatar
            source={childAvatar(childName)}
            tone={childAvatarTone(childName)}
            className="h-28 w-28"
            fallbackLabel={childName}
          />
          <View className="ml-4 flex-1">
            <AppText variant="screenTitle" numberOfLines={1}>
              {childName}
            </AppText>
            <AppText className="mt-1" color="ink-muted">
              Child profile
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-3">
          Household
        </AppText>
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-2 h-[108px] flex-row items-center overflow-hidden pr-3"
        >
          <Image
            source={familyArtwork}
            className="h-[108px] w-[152px]"
            contentFit="contain"
          />
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle" numberOfLines={1}>
              {householdName}
            </AppText>
            <AppText className="mt-1" color="ink-muted">
              Current household
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-3">
          This device
        </AppText>
        <Surface className="mt-2 min-h-[80px] flex-row items-center p-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-actionSoftStrong">
            <Icon
              name="checkShield"
              color={themeColors.actionPressed}
              size={28}
            />
          </View>
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">Device access</AppText>
            <AppText className="mt-1" color="ink-muted">
              Active for {childName}
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-3">
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
          testID="child-pin-use-another-profile"
          className="mt-3 border-ink"
          label="Lock / switch profile"
          tone="secondary"
          loading={locking}
          leading={
            <Icon
              name="lockSwitch"
              color={themeColors.ink}
              size={25}
            />
          }
          onPress={() => void lockAndSwitch()}
        />
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-1 text-center"
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
