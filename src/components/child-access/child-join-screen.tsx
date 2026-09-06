import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import { useAction } from 'convex/react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';

import { ChildQrScannerScreen } from './child-qr-scanner-screen';

type JoinMode =
  | 'manual'
  | 'qr';

function formatManualCodeInput(
  value: string,
) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

  if (
    normalized.length <= 5
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    5,
  )}-${normalized.slice(5)}`;
}

export function ChildJoinScreen() {
  const {
    authClient,
    activateParentStorage,
  } = useAuthRuntime();

  const [
    joinMode,
    setJoinMode,
  ] =
    useState<JoinMode>(
      'manual',
    );

  const [
    manualCode,
    setManualCode,
  ] = useState('');

  const [
    redeeming,
    setRedeeming,
  ] = useState(false);

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const redeemManual = useAction(
    api.childPairing.redeemManual,
  );

  async function handleRedeem() {
    setErrorMessage(null);

    if (!manualCode.trim()) {
      setErrorMessage(
        'Enter the pairing code from your Parent.',
      );

      return;
    }

    setRedeeming(true);

    try {
      await redeemManual({
        manualCode,
      });

      setManualCode('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not pair this device.',
      );
    } finally {
      setRedeeming(false);
    }
  }

  async function handleExitChildSetup() {
    setSigningOut(true);
    setErrorMessage(null);

    try {
      const result =
        await authClient.signOut();

      if (result.error) {
        throw new Error(
          result.error.message ??
            'Could not exit Child setup.',
        );
      }

      activateParentStorage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not exit Child setup.',
      );
    } finally {
      setSigningOut(false);
    }
  }

  if (
    joinMode === 'qr'
  ) {
    return (
      <ChildQrScannerScreen
        onCancel={() =>
          setJoinMode(
            'manual',
          )
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      className="justify-center flex-1 px-6 bg-slate-950"
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View>
        <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
          Child setup
        </Text>

        <Text className="mt-3 text-3xl font-bold text-white">
          Join your family
        </Text>

        <Text className="mt-3 text-base leading-6 text-slate-400">
          Scan the QR code shown on the
          Parent device or enter the manual
          pairing code.
        </Text>

        <Pressable
          className="px-4 py-4 mt-8 bg-white rounded-xl"
          onPress={() => {
            setErrorMessage(
              null,
            );

            setJoinMode('qr');
          }}
        >
          <Text className="font-semibold text-center text-slate-950">
            Scan QR code
          </Text>
        </Pressable>

        <View className="flex-row items-center my-7">
          <View className="flex-1 h-px bg-slate-800" />

          <Text className="px-4 text-xs font-semibold tracking-wider uppercase text-slate-500">
            Or
          </Text>

          <View className="flex-1 h-px bg-slate-800" />
        </View>

        <Text className="font-semibold text-white">
          Manual pairing code
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-xl font-semibold tracking-widest text-center text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="ABCDE-23456"
          placeholderTextColor="#64748b"
          value={manualCode}
          onChangeText={(value) =>
            setManualCode(
              formatManualCodeInput(
                value,
              ),
            )
          }
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={11}
        />

        <Text className="mt-2 text-xs leading-5 text-slate-500">
          Pairing credentials expire after
          15 minutes and can only be used
          once.
        </Text>

        {errorMessage && (
          <Text className="mt-4 text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-6 border rounded-xl border-slate-700"
          disabled={redeeming}
          onPress={handleRedeem}
        >
          <Text className="font-semibold text-center text-white">
            {redeeming
              ? 'Pairing device...'
              : 'Join with manual code'}
          </Text>
        </Pressable>

        <Pressable
          className="mt-5"
          disabled={signingOut}
          onPress={
            handleExitChildSetup
          }
        >
          <Text className="text-center text-slate-500">
            {signingOut
              ? 'Exiting...'
              : 'Cancel Child setup'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
