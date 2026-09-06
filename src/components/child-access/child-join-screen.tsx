import { authClient } from '@/lib/auth-client';
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

function formatManualCodeInput(
  value: string,
) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

  if (normalized.length <= 5) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    5,
  )}-${normalized.slice(5)}`;
}

export function ChildJoinScreen() {
  const [manualCode, setManualCode] =
    useState('');

  const [redeeming, setRedeeming] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const redeemManual = useAction(
    api.childPairing.redeemManual,
  );

  async function handleRedeem() {
    setErrorMessage(null);

    if (!manualCode.trim()) {
      setErrorMessage(
        'Enter the pairing code from your parent.',
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
      await authClient.signOut();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not exit child setup.',
      );
    } finally {
      setSigningOut(false);
    }
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
          Ask a parent to generate a pairing
          credential for your profile, then enter
          the manual code shown on their device.
        </Text>

        <Text className="mt-8 font-semibold text-white">
          Pairing code
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-xl font-semibold tracking-widest text-center text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="ABCDE-23456"
          placeholderTextColor="#64748b"
          value={manualCode}
          onChangeText={(value) =>
            setManualCode(
              formatManualCodeInput(value),
            )
          }
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={11}
        />

        <Text className="mt-2 text-xs leading-5 text-slate-500">
          Pairing codes expire after 15 minutes and
          can only be used once.
        </Text>

        {errorMessage && (
          <Text className="mt-4 text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-6 bg-white rounded-xl"
          disabled={redeeming}
          onPress={handleRedeem}
        >
          <Text className="font-semibold text-center text-slate-950">
            {redeeming
              ? 'Pairing device...'
              : 'Join family'}
          </Text>
        </Pressable>

        <Pressable
          className="mt-5"
          disabled={signingOut}
          onPress={handleExitChildSetup}
        >
          <Text className="text-center text-slate-500">
            {signingOut
              ? 'Exiting...'
              : 'Not a child? Go back'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
