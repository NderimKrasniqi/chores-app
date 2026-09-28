import {
  BalanceOrb,
  ChoreIcon,
  Scene,
  StarBuddy,
  Starfield,
  Airlock,
} from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText, ThemeScope, useTheme } from "@/design-system";
import { markOnboardingComplete } from "@/lib/onboarding";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

type OnboardingScreenProps = {
  onChooseParent: () => void;
  onChooseChild: () => void;
  reviewMode?: boolean;
  onDone?: () => void;
  initialPage?: 0 | 1 | 2 | 3;
};

export function OnboardingScreen(props: OnboardingScreenProps) {
  return (
    <ThemeScope mode="quest">
      <OnboardingContent {...props} />
    </ThemeScope>
  );
}

function OnboardingContent({
  onChooseParent,
  onChooseChild,
  reviewMode = false,
  onDone,
  initialPage = 0,
}: OnboardingScreenProps) {
  const { tokens } = useTheme();
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
        userErrorMessage(error, "Please try again."),
      );
    } finally {
      setFinishing(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="light" />
      <Starfield seed={page + 3} />

      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous onboarding page"
          disabled={page === 0}
          onPress={() => setPage((current) => Math.max(0, current - 1))}
          className={`h-11 w-11 items-center justify-center ${page === 0 ? "opacity-0" : ""}`}
        >
          <Icon name="back" color={tokens.ink} size={24} />
        </Pressable>

        <View
          accessibilityLabel={`Page ${page + 1} of 4`}
          className="flex-row items-center gap-1.5"
        >
          {[0, 1, 2, 3].map((dot) => (
            <View
              key={dot}
              className={`h-2 rounded-full ${dot === page ? "w-6 bg-primary" : "w-2 bg-nightRaised"}`}
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
          <AppText variant="label" color="ink-muted">
            {reviewMode ? "Close" : "Skip"}
          </AppText>
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
        <View className="px-5 pb-2 pt-3">
          <ActionButton
            label="Continue"
            onPress={() => setPage((current) => Math.min(3, current + 1))}
            trailing={
              <Icon name="chevron" color={tokens.onPrimary} size={22} />
            }
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function PageTitle({ title, body }: { title: string; body: string }) {
  return (
    <View className="items-center px-2">
      <AppText variant="screenTitle" className="text-center">
        {title}
      </AppText>
      <AppText color="ink-muted" className="mt-2 text-center font-body-bold">
        {body}
      </AppText>
    </View>
  );
}

function ReviewCompletePage({ onDone }: { onDone: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <Scene name="planet" size={220} buddy="dance" />
      <View className="mt-6">
        <PageTitle
          title="That’s how Chores works"
          body="Chores are completed, submitted, approved, and settled in real SEK each payout week."
        />
      </View>
      <ActionButton className="mt-8 w-full" label="Done" onPress={onDone} />
    </View>
  );
}

function WelcomePage() {
  return (
    <View className="flex-1 items-center justify-center px-5">
      <View className="items-center justify-center">
        <Scene name="planet" size={260} />
        <View className="absolute" style={{ top: 88 }}>
          <StarBuddy size={96} mood="wave" />
        </View>
      </View>
      <View className="mt-8">
        <PageTitle
          title={"A happier way\nto share chores"}
          body="Build responsibility, help at home, and celebrate progress together."
        />
      </View>
    </View>
  );
}

function Step({
  number,
  title,
  body,
  art,
  last,
}: {
  number: string;
  title: string;
  body: string;
  art: ReactNode;
  last?: boolean;
}) {
  return (
    <View className="flex-row gap-4">
      <View className="items-center">
        <View className="h-11 w-11 items-center justify-center rounded-full border-b-4 border-accentShade bg-accent">
          <AppText className="font-display text-[20px] text-night">
            {number}
          </AppText>
        </View>
        {last ? null : (
          <View className="mt-1 w-1 flex-1 rounded-full bg-nightRaised" />
        )}
      </View>
      <View className="mb-5 flex-1 flex-row items-center gap-3 rounded-card bg-surface p-3">
        {art}
        <View className="flex-1">
          <AppText variant="cardTitle">{title}</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            {body}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function HowItWorksPage() {
  const { tokens } = useTheme();
  return (
    <View className="flex-1 px-5">
      <View className="mt-3">
        <PageTitle
          title={"Complete. Submit.\nGet approved."}
          body="Earnings count only after approval."
        />
      </View>

      <View className="mt-7 flex-1">
        <Step
          number="1"
          title="Do the chore"
          body="Complete your assigned chore."
          art={<ChoreIcon title="Clean your room" size={56} animated />}
        />
        <Step
          number="2"
          title="Send it for review"
          body="Add an optional photo, then submit for approval."
          art={
            <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-nightDash">
              <Icon name="camera" color={tokens.night} size={28} />
            </View>
          }
        />
        <Step
          number="3"
          title="Parent approves"
          body="A Parent checks your work, then it counts toward your earnings."
          art={
            <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-primary">
              <Icon name="checkShield" color={tokens.night} size={28} />
            </View>
          }
          last
        />
      </View>
    </View>
  );
}

function RealRewardsPage() {
  return (
    <View className="flex-1 px-5">
      <View className="mt-3">
        <PageTitle
          title="Real effort. Real SEK."
          body="Get your Parent-chosen Unlock Chore approved to open Extras."
        />
      </View>

      <View className="flex-1 items-center justify-center">
        <BalanceOrb size={130}>
          <AppText className="font-display text-[40px] leading-[44px] text-night">
            240{" "}
            <AppText className="font-body-heavy text-[14px] text-night">
              kr
            </AppText>
          </AppText>
        </BalanceOrb>
        <AppText variant="label" color="ink-muted" className="mt-3">
          Your balance
        </AppText>
      </View>

      <View className="mb-2 flex-row items-center gap-3 rounded-large bg-surface p-3">
        <Airlock size={80} open={false} />
        <View className="flex-1">
          <AppText variant="cardTitle">Extras</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            An approved Unlock Chore opens the airlock to bonus chores.
          </AppText>
        </View>
      </View>
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
  const { tokens } = useTheme();
  return (
    <View className="flex-1 px-5">
      <View className="flex-1 items-center justify-center">
        <Scene name="planet" size={210} />
        <View className="absolute">
          <StarBuddy size={80} mood="wave" />
        </View>
      </View>

      <PageTitle
        title="Who’s using this phone?"
        body="Kids earn real money for real chores. Parents check the work and pay out."
      />

      <View className="mb-3 mt-7 gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I’m a child. Join with a code from a Parent."
          disabled={disabled}
          onPress={onChooseChild}
          className="flex-row items-center gap-3.5 rounded-large border-b-[5px] border-primaryShade bg-primary p-4"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-night">
            <Icon name="star" color={tokens.gold} size={28} />
          </View>
          <View className="flex-1">
            <AppText className="font-display text-[20px] text-night">
              I’m a child
            </AppText>
            <AppText className="font-body-bold text-[14px] text-night">
              Scan the code from a Parent
            </AppText>
          </View>
          <Icon name="chevron" color={tokens.night} size={20} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I’m a parent. Sign in and set up your household."
          disabled={disabled}
          onPress={onChooseParent}
          className="flex-row items-center gap-3.5 rounded-large bg-surface p-4"
        >
          <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-nightRaised">
            <Icon name="home" color={tokens.ink} size={26} />
          </View>
          <View className="flex-1">
            <AppText className="font-display text-[20px]">I’m a parent</AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="font-body-bold"
            >
              Set chores, review work, and manage payouts
            </AppText>
          </View>
          <Icon name="chevron" color={tokens.inkMuted} size={20} />
        </Pressable>
      </View>
    </View>
  );
}
