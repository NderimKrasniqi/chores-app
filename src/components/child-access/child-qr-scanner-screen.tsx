import { ActionButton, AppText, Surface } from "@/design-system";
import { DirectionC } from "@/constants/direction-c";
import { AppImage as Image } from "@/components/ui/app-image";
import { PairingQrCode } from "@/components/ui/pairing-qr-code";
import { useAction } from "convex/react";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import * as Device from "expo-device";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";

const cameraPreviewArtwork = require("../../../assets/images/direction-c/qr-scan-camera-preview.png");

type ChildQrScannerScreenProps = {
  onCancel: () => void;
};

export function ChildQrScannerScreen({ onCancel }: ChildQrScannerScreenProps) {
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
        error instanceof Error
          ? error.message
          : "Could not redeem this QR pairing code.",
      );
      setScanned(false);
    } finally {
      setRedeeming(false);
    }
  }

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <StatusBar style="dark" />
        <View className="h-16 w-16 items-center justify-center rounded-full bg-actionSoft">
          <ActivityIndicator color={DirectionC.color.green} />
        </View>
        <AppText variant="sectionTitle" className="mt-4 text-center">
          Getting scanner ready
        </AppText>
        <AppText color="ink-muted" className="mt-1 text-center">
          Checking camera permission…
        </AppText>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-5">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center">
          <AppText
            variant="label"
            color="ink-faint"
            className="uppercase tracking-widest"
          >
            QR pairing
          </AppText>
          <AppText variant="screenTitle" className="mt-3">
            Camera access
          </AppText>
          <AppText color="ink-muted" className="mt-3">
            Camera access is used only to scan the Child pairing QR code shown
            on the Parent device.
          </AppText>

          {!permission.canAskAgain ? (
            <Surface tone="reward" elevated={false} className="mt-6 p-4">
              <AppText variant="cardTitle">
                Camera permission is disabled
              </AppText>
              <AppText variant="bodySmall" color="ink-muted" className="mt-2">
                You can still pair this Child using the manual code.
              </AppText>
            </Surface>
          ) : null}

          {permission.canAskAgain ? (
            <ActionButton
              className="mt-8"
              label="Allow camera"
              onPress={() => void requestPermission()}
            />
          ) : null}
          <ActionButton
            tone="secondary"
            className="mt-4"
            label="Use manual code"
            onPress={onCancel}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-5">
      <StatusBar style="dark" />
      <AppText
        variant="label"
        color="ink-faint"
        className="mt-5 uppercase tracking-widest"
      >
        Child setup
      </AppText>
      <AppText variant="screenTitle" className="mt-3">
        Scan pairing QR
      </AppText>
      <AppText color="ink-muted" className="mt-2">
        Point this phone at the QR code shown on the Parent’s device.
      </AppText>

      <View className="mt-5 flex-1 overflow-hidden rounded-large bg-ink">
        <View className="flex-1">
          <Image
            source={cameraPreviewArtwork}
            className="absolute inset-0 h-full w-full"
            contentFit="cover"
            accessible={false}
          />
          {!Device.isDevice ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: "40%",
                top: "32%",
                width: 70,
                height: 150,
                borderRadius: 8,
                backgroundColor: "#D5E1ED",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.78,
                transform: [{ rotate: "-3deg" }],
              }}
            >
              <PairingQrCode
                value="visual-scanner-preview"
                size={46}
                quietZone={1}
                color="#3A4C55"
                backgroundColor="#D5E1ED"
              />
            </View>
          ) : null}
          {Device.isDevice ? (
            <CameraView
              className="flex-1"
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          ) : null}
        </View>

        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View className="relative h-56 w-56">
            <View className="absolute inset-y-5 left-0 w-px bg-white/25" />
            <View className="absolute inset-y-5 right-0 w-px bg-white/25" />
            <View className="absolute inset-x-5 top-0 h-px bg-white/25" />
            <View className="absolute inset-x-5 bottom-0 h-px bg-white/25" />

            <View className="absolute left-0 top-0 h-5 w-5 rounded-tl-lg border-l-[5px] border-t-[5px] border-white" />
            <View className="absolute right-0 top-0 h-5 w-5 rounded-tr-lg border-r-[5px] border-t-[5px] border-white" />
            <View className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-[5px] border-l-[5px] border-white" />
            <View className="absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-[5px] border-r-[5px] border-white" />

            <View className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-action" />
          </View>
          <AppText color="white" className="absolute bottom-8 text-center">
            Fit the code inside the frame
          </AppText>
        </View>
      </View>

      {redeeming ? (
        <View className="mt-4 flex-row items-center justify-center">
          <ActivityIndicator color={DirectionC.color.green} />
          <AppText color="ink-muted" className="ml-3">
            Pairing device…
          </AppText>
        </View>
      ) : null}

      {errorMessage ? (
        <AppText
          variant="bodySmall"
          color="urgency"
          className="mt-3 text-center"
        >
          {errorMessage}
        </AppText>
      ) : null}

      <ActionButton
        tone="secondary"
        className="mb-1 mt-5"
        label="Enter manual code instead"
        disabled={redeeming}
        onPress={onCancel}
      />
    </SafeAreaView>
  );
}
