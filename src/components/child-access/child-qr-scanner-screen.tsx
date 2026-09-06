import { useAction } from 'convex/react';
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from 'expo-camera';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';

type ChildQrScannerScreenProps = {
  onCancel: () => void;
};

export function ChildQrScannerScreen({
  onCancel,
}: ChildQrScannerScreenProps) {
  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const redeemQr = useAction(
    api.childPairing.redeemQr,
  );

  const [
    scanned,
    setScanned,
  ] = useState(false);

  const [
    redeeming,
    setRedeeming,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  async function handleBarcodeScanned(
    result: BarcodeScanningResult,
  ) {
    if (
      scanned ||
      redeeming
    ) {
      return;
    }

    const qrToken =
      result.data.trim();

    if (!qrToken) {
      return;
    }

    setScanned(true);
    setRedeeming(true);
    setErrorMessage(null);

    try {
      await redeemQr({
        qrToken,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not redeem this QR pairing code.',
      );

      setScanned(false);
    } finally {
      setRedeeming(false);
    }
  }

  if (!permission) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-slate-950">
        <ActivityIndicator />

        <Text className="mt-3 text-center text-slate-400">
          Checking camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="justify-center flex-1 px-6 bg-slate-950">
        <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          QR pairing
        </Text>

        <Text className="mt-3 text-3xl font-bold text-white">
          Camera access
        </Text>

        <Text className="mt-3 text-base leading-6 text-slate-400">
          Chores App needs camera access only
          to scan the Child pairing QR code
          shown on the Parent device.
        </Text>

        {permission.canAskAgain && (
          <Pressable
            className="px-4 py-4 mt-8 bg-white rounded-xl"
            onPress={() =>
              void requestPermission()
            }
          >
            <Text className="font-semibold text-center text-slate-950">
              Allow camera
            </Text>
          </Pressable>
        )}

        {!permission.canAskAgain && (
          <View className="p-4 mt-8 border rounded-xl border-amber-900 bg-slate-900">
            <Text className="font-semibold text-amber-400">
              Camera permission is disabled
            </Text>

            <Text className="mt-2 text-sm leading-5 text-slate-400">
              You can still pair this Child
              using the manual code.
            </Text>
          </View>
        )}

        <Pressable
          className="px-4 py-4 mt-4 border rounded-xl border-slate-700"
          onPress={onCancel}
        >
          <Text className="font-semibold text-center text-white">
            Use manual code
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-6 pt-14 pb-5">
        <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          Child setup
        </Text>

        <Text className="mt-2 text-2xl font-bold text-white">
          Scan pairing QR
        </Text>

        <Text className="mt-2 text-sm leading-5 text-slate-400">
          Point this phone at the QR code
          shown on the Parent&apos;s device.
        </Text>
      </View>

      <View className="flex-1 mx-6 overflow-hidden border rounded-2xl border-slate-700">
        <CameraView
          style={{
            flex: 1,
          }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            scanned
              ? undefined
              : handleBarcodeScanned
          }
        />

        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View className="w-64 h-64 border-2 border-white rounded-3xl" />
        </View>
      </View>

      <View className="px-6 pt-5 pb-10">
        {redeeming && (
          <View className="flex-row items-center justify-center">
            <ActivityIndicator />

            <Text className="ml-3 text-slate-300">
              Pairing device...
            </Text>
          </View>
        )}

        {errorMessage && (
          <Text className="text-center text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-5 border rounded-xl border-slate-700"
          disabled={redeeming}
          onPress={onCancel}
        >
          <Text className="font-semibold text-center text-white">
            Enter manual code instead
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
