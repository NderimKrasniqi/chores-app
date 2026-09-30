import Animated, {
  cubicBezier,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  useReducedMotion,
} from "react-native-reanimated";
import { Easings, PRESS, pressTransition } from "@/components/art/motion";
import {
  BalanceOrb,
  ChoreIcon,
  ENTRY_SKY_SEED,
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
  // Which way the last move went, so the new page comes in from that side.
  const [shown, setShown] = useState<{ page: number; dir: number }>({
    page: initialPage,
    dir: 1,
  });
  if (shown.page !== page) setShown({ page, dir: page > shown.page ? 1 : -1 });
  const reducedMotion = useReducedMotion();
  const pageEntering = reducedMotion
    ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never)
    : (shown.dir > 0 ? FadeInRight : FadeInLeft)
        .duration(300)
        .easing(Easings.out);
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
      <Starfield seed={ENTRY_SKY_SEED} />

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
            // Four tiny, childless dots: the one place width may animate.
            <Animated.View
              key={dot}
              style={{
                height: 8,
                borderRadius: 4,
                width: dot === page ? 24 : 8,
                backgroundColor:
                  dot === page ? tokens.primary : tokens.nightRaised,
                transitionProperty: ["width", "backgroundColor"],
                transitionDuration: reducedMotion ? "0ms" : "250ms",
                transitionTimingFunction: cubicBezier(0.77, 0, 0.175, 1),
              }}
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

      {/* Enter only: an exiting page would share the slot and squeeze this one. */}
      <Animated.View key={page} className="flex-1" entering={pageEntering}>
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
      </Animated.View>

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
  first,
  last,
}: {
  number: string;
  title: string;
  body: string;
  art: ReactNode;
  first?: boolean;
  last?: boolean;
}) {
  // The number sits level with the middle of its card; the rail runs
  // through the gaps between cards to the next number.
  return (
    <View className="flex-row gap-4">
      <View className="w-11 items-center justify-center">
        {/* the rail, behind the number: up to the previous step, down to the next */}
        <View
          className={`absolute left-[20px] top-0 h-1/2 w-1 ${first ? "" : "bg-nightRaised"}`}
        />
        <View
          className={`absolute bottom-0 left-[20px] h-1/2 w-1 ${last ? "" : "bg-nightRaised"}`}
        />
        <View className="h-11 w-11 items-center justify-center rounded-full border-b-4 border-accentShade bg-accent">
          <AppText className="font-display text-[20px] text-night">
            {number}
          </AppText>
        </View>
      </View>
      <View className="my-2.5 flex-1 flex-row items-center gap-3 rounded-card bg-surface p-3">
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
          art={
            <View className="h-14 w-14 items-center justify-center">
              <ChoreIcon title="Clean your room" size={48} animated />
            </View>
          }
          first
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
          pressRetentionOffset={16}
        >
          {({ pressed }) => (
            <Animated.View
              className="flex-row items-center gap-3.5 rounded-large border-b-[5px] border-primaryShade bg-primary p-4"
              style={[
                { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
                pressTransition,
              ]}
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
            </Animated.View>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="I’m a parent. Sign in and set up your household."
          disabled={disabled}
          onPress={onChooseParent}
          pressRetentionOffset={16}
        >
          {({ pressed }) => (
            <Animated.View
              className="flex-row items-center gap-3.5 rounded-large bg-surface p-4"
              style={[
                { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
                pressTransition,
              ]}
            >
              <View className="h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-nightRaised">
                <Icon name="home" color={tokens.ink} size={26} />
              </View>
              <View className="flex-1">
                <AppText className="font-display text-[20px]">
                  I’m a parent
                </AppText>
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  className="font-body-bold"
                >
                  Set chores, review work, and manage payouts
                </AppText>
              </View>
              <Icon name="chevron" color={tokens.inkMuted} size={20} />
            </Animated.View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
