import { useAction } from "convex/react";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import * as Device from "expo-device";
import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

import { DockingScene, Starfield, useLoop } from "@/components/art";
import { Easings } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { PairingQrCode } from "@/components/ui/pairing-qr-code";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";

import { api } from "../../../convex/_generated/api";

type ChildQrScannerScreenProps = {
  onCancel: () => void;
};

const WINDOW = 250;

/** Corner brackets that breathe, and a beam sweeping down the porthole. */
function PortholeOverlay() {
  const { tokens } = useTheme();
  const sweep = useLoop({
    duration: 2200,
    reverse: true,
    easing: Easings.inOut,
    rest: 0.5,
  });
  const breathe = useLoop({ duration: 1800, reverse: true, rest: 1 });
  const beamStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(sweep.get(), [0, 1], [18, WINDOW - 22]) },
    ],
  }));
  const cornerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.get(), [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(breathe.get(), [0, 1], [0.97, 1]) }],
  }));
  const corner = "absolute h-8 w-8 border-accent";
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 items-center justify-center"
    >
      <View style={{ width: WINDOW, height: WINDOW }}>
        <Animated.View
          style={[{ position: "absolute", inset: 0 }, cornerStyle]}
        >
          <View
            className={`${corner} left-0 top-0 rounded-tl-[18px] border-l-[5px] border-t-[5px]`}
          />
          <View
            className={`${corner} right-0 top-0 rounded-tr-[18px] border-r-[5px] border-t-[5px]`}
          />
          <View
            className={`${corner} bottom-0 left-0 rounded-bl-[18px] border-b-[5px] border-l-[5px]`}
          />
          <View
            className={`${corner} bottom-0 right-0 rounded-br-[18px] border-b-[5px] border-r-[5px]`}
          />
        </Animated.View>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 14,
              right: 14,
              top: 0,
              height: 4,
              borderRadius: 2,
              backgroundColor: tokens.accent,
              shadowColor: tokens.accent,
              shadowOpacity: 0.9,
              shadowRadius: 10,
            },
            beamStyle,
          ]}
        />
      </View>
    </View>
  );
}

function PermissionState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-6">
      <StatusBar style="light" />
      <Starfield seed={61} />
      <View className="flex-1 items-center justify-center">
        <DockingScene width={300} height={160} />
        <AppText variant="screenTitle" className="mt-4 text-center">
          {title}
        </AppText>
        <AppText color="ink-muted" className="mt-2 text-center font-body-bold">
          {body}
        </AppText>
        <View className="mt-7 w-full gap-3">{children}</View>
      </View>
    </SafeAreaView>
  );
}

export function ChildQrScannerScreen({ onCancel }: ChildQrScannerScreenProps) {
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const redeemQr = useAction(api.childPairing.redeemQr);
  const [scanned, setScanned] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned || redeeming) return;

    const qrToken = result.data.trim();
    if (!qrToken) return;

    setScanned(true);
    setRedeeming(true);
    setErrorMessage(null);

    try {
      await redeemQr({ qrToken });
    } catch (error) {
      setErrorMessage(
        userErrorMessage(error, "Could not redeem this QR pairing code."),
      );
      setScanned(false);
    } finally {
      setRedeeming(false);
    }
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="light" />
        <ActivityIndicator color={tokens.accent} />
        <AppText color="ink-muted" className="mt-3 font-body-bold">
          Warming up the scanner…
        </AppText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <PermissionState
        title="Open the porthole?"
        body={
          permission.canAskAgain
            ? "The camera is only used to scan your Parent’s pairing code."
            : "Camera access is off for this app. You can still type the code instead."
        }
      >
        {permission.canAskAgain ? (
          <ActionButton
            label="Allow camera"
            onPress={() => void requestPermission()}
          />
        ) : null}
        <ActionButton
          tone="secondary"
          label="Type the code instead"
          onPress={onCancel}
        />
      </PermissionState>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-5">
      <StatusBar style="light" />
      <View className="flex-row items-center justify-between pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to typing the code"
          onPress={onCancel}
          disabled={redeeming}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface"
        >
          <Icon name="close" color={tokens.ink} size={18} />
        </Pressable>
      </View>
      <AppText variant="screenTitle" className="mt-3">
        Point at their code
      </AppText>
      <AppText color="ink-muted" className="mt-1 font-body-bold">
        Fit the code on your Parent’s phone inside the porthole.
      </AppText>

      <View className="mt-5 flex-1 overflow-hidden rounded-[36px] border-4 border-nightRaised bg-night">
        {Device.isDevice ? (
          <CameraView
            className="flex-1"
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        ) : (
          // The simulator has no camera: show a sample code in the window.
          <View className="flex-1 items-center justify-center">
            <View className="rounded-[14px] bg-star p-3">
              <PairingQrCode
                value="visual-scanner-preview"
                size={150}
                quietZone={1}
                color={tokens.night}
                backgroundColor={tokens.star}
              />
            </View>
          </View>
        )}
        <PortholeOverlay />
      </View>

      <View className="min-h-[64px] items-center justify-center">
        {redeeming ? (
          <View className="flex-row items-center">
            <ActivityIndicator color={tokens.accent} />
            <AppText color="ink-muted" className="ml-3 font-body-bold">
              Docking…
            </AppText>
          </View>
        ) : errorMessage ? (
          <AppText
            accessibilityLiveRegion="polite"
            color="pink"
            className="text-center font-body-bold"
          >
            {errorMessage}
          </AppText>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
