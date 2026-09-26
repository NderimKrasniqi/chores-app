import { Icon } from "@/components/ui/icon";
import { AppImage as Image } from "@/components/ui/app-image";
import { homeTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, DesignTokens, Surface } from "@/design-system";
import { markOnboardingComplete } from "@/lib/onboarding";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const familyArtwork = require("../../../assets/images/direction-c/onboarding-family.png");
const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");
const roleParentArtwork = require("../../../assets/images/direction-c/onboarding-parent-role.png");
const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const bedroomArtwork = require("../../../assets/images/direction-c/chore-bedroom.png");
const extrasArtwork = require("../../../assets/images/direction-c/extras-unlocked.png");
const submitPhotoArtwork = require("../../../assets/images/direction-c/onboarding-submit-photo.png");
const rewardsArtwork = require("../../../assets/images/direction-c/onboarding-rewards.png");

type OnboardingScreenProps = {
  onChooseParent: () => void;
  onChooseChild: () => void;
  reviewMode?: boolean;
  onDone?: () => void;
  initialPage?: 0 | 1 | 2 | 3;
};

export function OnboardingScreen({
  onChooseParent,
  onChooseChild,
  reviewMode = false,
  onDone,
  initialPage = 0,
}: OnboardingScreenProps) {
  const [page, setPage] = useState<number>(initialPage);
  const [finishing, setFinishing] = useState(false);

  async function finish(next: () => void) {
    setFinishing(true);

    try {
      await markOnboardingComplete();
      next();
    } catch (error) {
      Alert.alert(
        "Could not save onboarding",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setFinishing(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous onboarding page"
          disabled={page === 0}
          onPress={() => setPage((current) => Math.max(0, current - 1))}
          className={`h-11 w-11 items-center justify-center ${page === 0 ? "opacity-0" : ""}`}
        >
          <Icon name="back" color={themeColors.ink} size={24} />
        </Pressable>

        <View
          accessibilityLabel={`Page ${page + 1} of 4`}
          className="flex-row gap-2"
        >
          {[0, 1, 2, 3].map((dot) => (
            <View
              key={dot}
              className={`h-2.5 w-2.5 rounded-full ${dot === page ? "bg-action" : "border border-line bg-surface"}`}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            reviewMode ? "Close onboarding" : "Skip to choose your role"
          }
          disabled={!reviewMode && page === 3}
          onPress={() => (reviewMode ? onDone?.() : setPage(3))}
          className={`min-h-target min-w-11 items-center justify-center ${!reviewMode && page === 3 ? "opacity-0" : ""}`}
        >
          <AppText variant="bodySmall">{reviewMode ? "Close" : "Skip"}</AppText>
        </Pressable>
      </View>

      {page === 0 ? <WelcomePage /> : null}
      {page === 1 ? <HowItWorksPage /> : null}
      {page === 2 ? <RealRewardsPage /> : null}
      {page === 3 && reviewMode ? (
        <ReviewCompletePage onDone={() => onDone?.()} />
      ) : null}
      {page === 3 && !reviewMode ? (
        <ChooseRolePage
          disabled={finishing}
          onChooseParent={() => void finish(onChooseParent)}
          onChooseChild={() => void finish(onChooseChild)}
        />
      ) : null}

      {page < 3 ? (
        <View className="px-5 pb-1 pt-3">
          <ActionButton
            label="Continue"
            onPress={() => setPage((current) => Math.min(3, current + 1))}
            trailing={
              <Icon
                name="chevron"
                color={themeColors.onAction}
                size={22}
              />
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ReviewCompletePage({ onDone }: { onDone: () => void }) {
  return (
    <View className="flex-1 items-center px-5 pt-8">
      <Image
        source={familyArtwork}
        className="h-[300px] w-full"
        contentFit="contain"
      />
      <AppText variant="screenTitle" className="mt-4 text-center">
        That’s how Chores works
      </AppText>
      <AppText className="mt-3 text-center">
        Chores are completed, submitted, approved, and settled in real SEK each
        payout week.
      </AppText>
      <ActionButton className="mt-8 w-full" label="Done" onPress={onDone} />
    </View>
  );
}

function WelcomePage() {
  return (
    <View className="flex-1 px-5">
      <AppText
        variant="screenTitle"
        className="mt-3 text-[28px] leading-[32px]"
      >
        A happier way{`\n`}to share chores
      </AppText>
      <AppText className="mt-2">
        Build responsibility, help at home, and celebrate progress together.
      </AppText>
      <View className="mt-4 flex-1 overflow-hidden rounded-large bg-[#F6E8D8]">
        <Image
          source={familyArtwork}
          className="h-full w-full"
          contentFit="cover"
          accessible={false}
        />
      </View>
    </View>
  );
}

function HowItWorksPage() {
  const steps = [
    {
      number: "1",
      title: "Do the chore",
      body: "Complete your assigned chore.",
      art: bedroomArtwork,
      tone: "bg-actionSoftStrong",
    },
    {
      number: "2",
      title: "Send it for review",
      body: "Add an optional photo, then submit for approval.",
      art: submitPhotoArtwork,
      tone: "bg-urgencySoft",
    },
    {
      number: "3",
      title: "Parent approves",
      body: "A Parent checks your work, then it counts toward your earnings.",
      art: parentAvatar,
      tone: "bg-infoSoftStrong",
    },
  ];

  return (
    <View className="flex-1 px-5">
      <AppText
        variant="screenTitle"
        className="mt-3 text-center text-[28px] leading-[32px]"
      >
        Complete. Submit.{`\n`}Get approved.
      </AppText>
      <AppText className="mt-2 text-center">
        Earnings count only after approval.
      </AppText>

      <View className="mt-5 flex-1 justify-around gap-3">
        {steps.map((step) => (
          <Surface
            key={step.number}
            className="min-h-[126px] flex-row items-center p-3"
          >
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${step.tone}`}
            >
              <AppText variant="cardTitle">{step.number}</AppText>
            </View>
            <View className="mx-3 h-[102px] w-[102px] overflow-hidden rounded-control bg-[#F7EDDF]">
              <Image
                source={step.art}
                className="h-full w-full"
                contentFit="contain"
                accessible={false}
              />
            </View>
            <View className="flex-1">
              <AppText variant="cardTitle">{step.title}</AppText>
              <AppText variant="bodySmall" color="ink-muted" className="mt-1">
                {step.body}
              </AppText>
            </View>
          </Surface>
        ))}
      </View>
    </View>
  );
}

function RealRewardsPage() {
  return (
    <View className="flex-1 px-5">
      <AppText
        variant="screenTitle"
        className="mt-3 text-center text-[28px] leading-[32px]"
      >
        Real effort. Real SEK.
      </AppText>
      <AppText className="mt-2 text-center">
        Get your Parent-chosen Unlock Chore approved to open Extras.
      </AppText>

      <Surface
        tone="mint"
        elevated={false}
        className="mt-6 flex-row items-center p-4"
      >
        <View className="h-16 w-16 items-center justify-center rounded-full bg-action">
          <Icon
            name="money"
            color={themeColors.onAction}
            size={30}
          />
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="bodySmall">Your balance</AppText>
          <AppText variant="amount">240 kr</AppText>
        </View>
        <Icon name="chevron" color={themeColors.ink} size={22} />
      </Surface>

      <View className="mt-6 flex-1 items-center justify-center">
        <Image
          source={rewardsArtwork}
          className="h-64 w-full"
          contentFit="contain"
          accessible={false}
        />
      </View>

      <Surface className="mb-2 flex-row items-center p-4">
        <Image
          source={extrasArtwork}
          className="h-24 w-28"
          contentFit="contain"
          accessible={false}
        />
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle">Extras</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            An approved Unlock Chore opens Extras.
          </AppText>
        </View>
        <Icon name="chevron" color={themeColors.ink} size={22} />
      </Surface>
    </View>
  );
}

function ChooseRolePage({
  disabled,
  onChooseParent,
  onChooseChild,
}: {
  disabled: boolean;
  onChooseParent: () => void;
  onChooseChild: () => void;
}) {
  return (
    <View className="flex-1 px-5">
      <AppText
        variant="screenTitle"
        className="mt-3 text-center text-[28px] leading-[32px]"
      >
        How will you{`\n`}use the app?
      </AppText>
      <AppText className="mt-2 text-center">
        Your experience is tailored to your role.
      </AppText>

      <View className="mt-16 gap-4">
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onChooseParent}
          className="min-h-[168px] flex-row items-center rounded-large border-2 border-actionSoftStrong bg-actionSoft p-3"
          style={DesignTokens.shadowStyle.card}
        >
          <Image
            source={roleParentArtwork}
            className="h-32 w-32"
            contentFit="contain"
            accessible={false}
          />
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">I’m a parent</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-2">
              Set chores, review work, and manage payouts.
            </AppText>
          </View>
          <Icon
            name="chevron"
            color={themeColors.ink}
            size={22}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onChooseChild}
          className="min-h-[168px] flex-row items-center rounded-large border-2 border-infoSoftStrong bg-infoSoft p-3"
          style={DesignTokens.shadowStyle.card}
        >
          <Image
            source={childAvatar}
            className="h-32 w-32"
            contentFit="contain"
            accessible={false}
          />
          <View className="ml-3 flex-1">
            <AppText variant="cardTitle">I’m a child</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-2">
              See chores, submit work, and track earnings.
            </AppText>
          </View>
          <Icon
            name="chevron"
            color={themeColors.ink}
            size={22}
          />
        </Pressable>
      </View>
      <View className="flex-1 justify-end">
        <Image
          source={rewardsArtwork}
          className="h-56 w-full"
          contentFit="contain"
          accessible={false}
        />
      </View>
    </View>
  );
}
