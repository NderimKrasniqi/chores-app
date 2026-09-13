import { ActionButton, AppText, Surface } from "@/design-system";
import { useAction } from "convex/react";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";

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
        <ActivityIndicator color="#168667" />
        <AppText color="ink-muted" className="mt-3 text-center">
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
        <CameraView
          className="flex-1"
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View className="h-56 w-56 rounded-large border-[5px] border-white" />
          <View className="absolute h-1 w-56 rounded-full bg-action" />
          <AppText color="white" className="absolute bottom-8 text-center">
            Fit the code inside the frame
          </AppText>
        </View>
      </View>

      {redeeming ? (
        <View className="mt-4 flex-row items-center justify-center">
          <ActivityIndicator color="#168667" />
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
