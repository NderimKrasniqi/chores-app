import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { useAction } from "convex/react";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { ChildQrScannerScreen } from "./child-qr-scanner-screen";

type JoinMode = "manual" | "qr";

const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");

function formatManualCodeInput(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return normalized.length <= 5
    ? normalized
    : `${normalized.slice(0, 5)}-${normalized.slice(5)}`;
}

export function ChildJoinScreen() {
  const { authClient, activateParentStorage } = useAuthRuntime();
  const [joinMode, setJoinMode] = useState<JoinMode>("manual");
  const [manualCode, setManualCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redeemManual = useAction(api.childPairing.redeemManual);

  async function handleRedeem() {
    setErrorMessage(null);

    if (!manualCode.trim()) {
      setErrorMessage("Enter the pairing code from your Parent.");
      return;
    }

    setRedeeming(true);

    try {
      await redeemManual({ manualCode });
      setManualCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not pair this device.",
      );
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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not exit Child setup.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (joinMode === "qr") {
    return <ChildQrScannerScreen onCancel={() => setJoinMode("manual")} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() => void handleExitChildSetup()}
            className="min-h-target justify-center self-start"
          >
            <AppText variant="cardTitle">
              {signingOut ? "Cancelling…" : "Cancel"}
            </AppText>
          </Pressable>

          <View className="min-h-[245px] pt-5">
            <AppText
              variant="label"
              color="ink-faint"
              className="uppercase tracking-widest"
            >
              Child setup
            </AppText>
            <AppText variant="display" className="mt-3 w-[65%]">
              Join your family
            </AppText>
            <AppText color="ink-muted" className="mt-3 w-[75%]">
              Scan the QR code shown on the Parent device or enter the manual
              pairing code.
            </AppText>
            <Image
              source={childAvatar}
              className="absolute -right-3 top-0 h-52 w-44"
              contentFit="contain"
              accessible={false}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setErrorMessage(null);
              setJoinMode("qr");
            }}
            className="mt-2 min-h-[124px] flex-row items-center rounded-large bg-actionSoft p-4"
          >
            <View className="h-24 w-24 items-center justify-center rounded-full bg-actionSoftStrong">
              <DirectionCIcon
                name="scan"
                color={DirectionC.color.greenDeep}
                size={46}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="sectionTitle">Scan QR code</AppText>
              <AppText color="ink-muted" className="mt-1">
                Use this phone’s camera
              </AppText>
            </View>
            <DirectionCIcon
              name="chevron"
              color={DirectionC.color.ink}
              size={24}
            />
          </Pressable>

          <View className="my-6 flex-row items-center">
            <View className="h-px flex-1 bg-infoSoftStrong" />
            <AppText
              variant="label"
              color="ink-muted"
              className="px-4 uppercase"
            >
              Or
            </AppText>
            <View className="h-px flex-1 bg-infoSoftStrong" />
          </View>

          <AppText variant="cardTitle">Manual pairing code</AppText>
          <TextInput
            className="mt-2 min-h-[74px] rounded-control border-2 border-infoSoftStrong bg-surface px-4 text-center font-rounded text-[24px] font-black tracking-[6px] text-ink"
            placeholder="ABCDE-23456"
            placeholderTextColor="#8D73BC"
            value={manualCode}
            onChangeText={(value) =>
              setManualCode(formatManualCodeInput(value))
            }
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
          />
          <AppText variant="bodySmall" color="ink-muted" className="mt-3">
            Pairing credentials expire after 15 minutes and can only be used
            once.
          </AppText>

          {errorMessage ? (
            <Surface tone="coral" elevated={false} className="mt-4 p-3">
              <AppText variant="bodySmall" color="urgency">
                {errorMessage}
              </AppText>
            </Surface>
          ) : null}

          <ActionButton
            tone="secondary"
            className="mt-6"
            label="Join with manual code"
            loading={redeeming}
            onPress={() => void handleRedeem()}
          />
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-5 text-center"
          >
            Ask your Parent to show the pairing code.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
