import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

import { Starfield, useLoop } from "@/components/art";
import { Easings } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import {
  getChildPinRequirements,
  verifyLocalChildPin,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";

import { StarKeypad, StarSlots } from "./star-keypad";

type ChildPinUnlockScreenProps = {
  context: LocalChildContext;
  onUnlocked: () => void;
};

/** The child's letter-planet with a slowly turning dashed ring. */
export function AvatarPlanet({
  name,
  size = 112,
}: {
  name: string;
  size?: number;
}) {
  const { tokens } = useTheme();
  const spin = useLoop({ duration: 20000, easing: Easings.linear });
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get() * 360}deg` }],
  }));
  const ring = size + 36;
  return (
    <View
      accessible={false}
      className="items-center justify-center"
      style={{ width: ring, height: ring }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: tokens.gold,
            opacity: 0.6,
          },
          ringStyle,
        ]}
      />
      <Avatar
        tone={childAvatarTone(name)}
        className="rounded-full"
        fallbackLabel={name}
        size={size}
      />
    </View>
  );
}

export function ChildPinUnlockScreen({
  context,
  onUnlocked,
}: ChildPinUnlockScreenProps) {
  const { activateParentStorage } = useAuthRuntime();
  const [pin, setPin] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  // Once unlocked, everything stays disabled until the profile opens.
  const [unlocked, setUnlocked] = useState(false);
  const inFlight = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(openTimer.current), []);
  const busy = checkingPin || unlocked;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const { minLength, maxLength } = getChildPinRequirements();

  async function handleUnlock() {
    if (pin.length < minLength || inFlight.current || unlocked) return;
    inFlight.current = true;
    setErrorMessage(null);
    setCheckingPin(true);

    try {
      const valid = await verifyLocalChildPin(context.contextId, pin);

      if (!valid) {
        setPin("");
        setShake((n) => n + 1);
        setErrorMessage("That’s not the code. Try again!");
        AccessibilityInfo.announceForAccessibility(
          "That’s not the code. Try again.",
        );
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setUnlocked(true);
      setCelebrate((n) => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Let the stars pop before the profile opens; cancelled on unmount.
      openTimer.current = setTimeout(onUnlocked, 320);
    } catch (error) {
      setPin("");
      setErrorMessage(userErrorMessage(error, "Could not verify PIN."));
    } finally {
      inFlight.current = false;
      setCheckingPin(false);
    }
  }

  function handleSwitchProfile() {
    setPin("");
    setErrorMessage(null);
    activateParentStorage();
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="light" />
      <Starfield seed={context.childDisplayName.length + 3} />
      <View className="flex-1 justify-between px-6 pb-2 pt-6">
        <View className="items-center">
          <AvatarPlanet name={context.childDisplayName} />
          <AppText variant="display" className="mt-3 text-center">
            Hi, {context.childDisplayName}!
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-1 text-center font-body-bold"
          >
            Type your secret star code
          </AppText>

          <View className="mt-5">
            <StarSlots
              length={pin.length}
              min={minLength}
              max={maxLength}
              shake={shake}
              celebrate={celebrate}
            />
          </View>
          <AppText
            accessibilityLiveRegion="polite"
            className="mt-3 min-h-[20px] text-center font-body-bold"
            color="pink"
          >
            {errorMessage ?? ""}
          </AppText>
        </View>

        <View>
          <StarKeypad
            testID="child-pin-input"
            value={pin}
            max={maxLength}
            canSubmit={pin.length >= minLength}
            busy={busy}
            submitLabel="Unlock profile"
            onDigit={(digit) => {
              setErrorMessage(null);
              setPin((current) => (current + digit).slice(0, maxLength));
            }}
            onDelete={() => setPin((current) => current.slice(0, -1))}
            onSubmit={() => void handleUnlock()}
          />
          <Pressable
            testID="child-pin-use-another-profile"
            accessibilityRole="button"
            disabled={busy}
            onPress={handleSwitchProfile}
            className="mt-3 min-h-[44px] items-center justify-center"
          >
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="font-body-bold underline"
            >
              Not {context.childDisplayName}? Use another profile
            </AppText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
