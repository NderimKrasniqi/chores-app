import { useAction } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { currentDeviceLabel } from "@/lib/child-access/device-label";
import { userErrorMessage } from "@/lib/errors";

import { DockingScene, Starfield, useLoop } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";

import { api } from "../../../convex/_generated/api";
import { ChildQrScannerScreen } from "./child-qr-scanner-screen";

type JoinMode = "manual" | "qr";

const CODE_LENGTH = 6;
const GROUP = 3;

function normalizeCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

/** The blinking "type here" edge on the next empty box. */
function Cursor() {
  const { tokens } = useTheme();
  const blink = useLoop({ duration: 1000, reverse: true, rest: 1 });
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(blink.get(), [0, 1], [0.2, 1]),
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 8,
          width: 14,
          height: 3,
          borderRadius: 2,
          backgroundColor: tokens.accent,
        },
        style,
      ]}
    />
  );
}

/**
 * Six glowing boxes for the Parent's pairing code. A hidden input under
 * them does the typing, so paste, autocorrect-off and the system keyboard
 * all still work.
 */
function CodeBoxes({
  value,
  focused,
  onFocus,
}: {
  value: string;
  focused: boolean;
  onFocus: () => void;
}) {
  const box = (i: number) => {
    const char = value[i];
    const active = focused && i === value.length;
    return (
      <View
        key={i}
        className={`h-[60px] flex-1 items-center justify-center rounded-[14px] ${
          char
            ? "bg-nightRaised"
            : active
              ? "border-2 border-accent bg-surface"
              : "border-2 border-dashed border-nightRaised"
        }`}
      >
        {char ? (
          <AppText className="font-display text-[26px]">{char}</AppText>
        ) : active ? (
          <Cursor />
        ) : null}
      </View>
    );
  };
  return (
    <Pressable
      accessible={false}
      // The hidden input below is what screen readers use.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onPress={onFocus}
      className="flex-row items-center gap-1.5"
    >
      <View className="flex-1 flex-row gap-2">
        {Array.from({ length: GROUP }, (_, i) => box(i))}
      </View>
      <View className="w-3" />
      <View className="flex-1 flex-row gap-2">
        {Array.from({ length: CODE_LENGTH - GROUP }, (_, i) => box(GROUP + i))}
      </View>
    </Pressable>
  );
}

export function ChildJoinScreen() {
  const { tokens } = useTheme();
  const { width } = useWindowDimensions();
  const { authClient, activateParentStorage } = useAuthRuntime();
  const [joinMode, setJoinMode] = useState<JoinMode>("manual");
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const redeemManual = useAction(api.childPairing.redeemManual);

  async function handleRedeem() {
    setErrorMessage(null);

    if (code.length < CODE_LENGTH) {
      setErrorMessage("Type all 6 letters and numbers from your Parent.");
      return;
    }

    setRedeeming(true);

    try {
      await redeemManual({
        manualCode: code,
        deviceLabel: currentDeviceLabel(),
      });
      setCode("");
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not pair this device."));
    } finally {
      setRedeeming(false);
    }
  }

  async function handleExitChildSetup() {
    setSigningOut(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        throw new Error(result.error.message ?? "Could not exit Child setup.");
      }

      activateParentStorage();
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not exit Child setup."));
    } finally {
      setSigningOut(false);
    }
  }

  if (joinMode === "qr") {
    return <ChildQrScannerScreen onCancel={() => setJoinMode("manual")} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="light" />
      <Starfield seed={53} />
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView
          contentContainerClassName="flex-grow px-5 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel child setup"
            disabled={signingOut}
            onPress={() => void handleExitChildSetup()}
            hitSlop={8}
            className="mt-2 h-11 w-11 items-center justify-center rounded-full bg-surface"
          >
            <Icon name="close" color={tokens.ink} size={18} />
          </Pressable>

          <View className="mt-2 items-center">
            <DockingScene width={width - 40} height={170} />
          </View>
          <AppText variant="display" className="mt-1 text-center">
            Dock with your family
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-1.5 text-center font-body-bold"
          >
            Ask a Parent to tap your name, then “Phones”, on their phone.
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan the Parent's QR code"
            onPress={() => {
              setErrorMessage(null);
              setJoinMode("qr");
            }}
            className="mt-6"
          >
            {({ pressed }) => (
              <Animated.View
                className="min-h-[76px] flex-row items-center gap-4 rounded-large border-b-4 border-primaryShade bg-primary px-5"
                style={[
                  { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
                  pressTransition,
                ]}
              >
                <Icon name="scan" color={tokens.night} size={28} />
                <View className="flex-1">
                  <AppText className="font-display text-[20px] text-night">
                    Scan their code
                  </AppText>
                  <AppText className="font-body-bold text-[13px] text-night">
                    Quickest way — uses the camera
                  </AppText>
                </View>
                <Icon name="chevron" color={tokens.night} size={20} />
              </Animated.View>
            )}
          </Pressable>

          <View className="my-5 flex-row items-center">
            <View className="h-px flex-1 bg-nightRaised" />
            <AppText
              variant="label"
              color="ink-muted"
              className="px-3 uppercase tracking-[1.4px]"
            >
              or type it
            </AppText>
            <View className="h-px flex-1 bg-nightRaised" />
          </View>

          <View>
            <CodeBoxes
              value={code}
              focused={focused}
              onFocus={() => inputRef.current?.focus()}
            />
            <TextInput
              ref={inputRef}
              testID="child-pairing-manual-code"
              accessibilityLabel="Pairing code, 6 letters and numbers"
              value={code}
              onChangeText={(value) => {
                setErrorMessage(null);
                setCode(normalizeCode(value));
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="characters"
              autoCorrect={false}
              // Generous: pasted codes may carry spaces; normalize caps at 6.
              maxLength={32}
              caretHidden
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.02,
                color: "transparent",
              }}
            />
          </View>

          <AppText
            accessibilityLiveRegion="polite"
            color="pink"
            className="mt-3 min-h-[20px] text-center font-body-bold"
          >
            {errorMessage ?? ""}
          </AppText>

          <ActionButton
            testID="child-pairing-submit-manual-code"
            className="mt-2"
            label="Dock!"
            disabled={code.length < CODE_LENGTH}
            loading={redeeming}
            onPress={() => void handleRedeem()}
          />
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-3 text-center"
          >
            Codes last 15 minutes and work once.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
