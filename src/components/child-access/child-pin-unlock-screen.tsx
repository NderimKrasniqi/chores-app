import {
  getChildPinRequirements,
  verifyLocalChildPin,
  type LocalChildContext,
} from '@/lib/child-local-access';
import { useAuthRuntime } from '@/providers/auth-runtime-provider';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

type ChildPinUnlockScreenProps = {
  context: LocalChildContext;
  onUnlocked: () => void;
};

function normalizePinInput(
  value: string,
) {
  const {
    maxLength,
  } = getChildPinRequirements();

  return value
    .replace(/\D/g, '')
    .slice(0, maxLength);
}

export function ChildPinUnlockScreen({
  context,
  onUnlocked,
}: ChildPinUnlockScreenProps) {
  const {
    activateParentStorage,
  } = useAuthRuntime();

  const [
    pin,
    setPin,
  ] = useState('');

  const [
    checkingPin,
    setCheckingPin,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const {
    minLength,
    maxLength,
  } = getChildPinRequirements();

  async function handleUnlock() {
    setErrorMessage(null);

    if (
      pin.length < minLength
    ) {
      setErrorMessage(
        `Enter your ${minLength} to ${maxLength} digit PIN.`,
      );

      return;
    }

    setCheckingPin(true);

    try {
      const valid =
        await verifyLocalChildPin(
          context.contextId,
          pin,
        );

      setPin('');

      if (!valid) {
        setErrorMessage(
          'Incorrect PIN.',
        );

        return;
      }

      onUnlocked();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not verify PIN.',
      );
    } finally {
      setCheckingPin(false);
    }
  }

  function handleSwitchProfile() {
    setPin('');
    setErrorMessage(null);

    activateParentStorage();
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
          Child profile
        </Text>

        <Text className="mt-3 text-3xl font-bold text-white">
          Hi, {context.childDisplayName}
        </Text>

        <Text className="mt-3 text-base leading-6 text-slate-400">
          Enter your local PIN to unlock
          this Child profile.
        </Text>

        <View className="p-4 mt-6 border rounded-xl border-slate-800 bg-slate-900">
          <Text className="font-semibold text-white">
            {context.householdName}
          </Text>

          <Text className="mt-1 text-sm text-slate-400">
            {context.childDisplayName}
          </Text>
        </View>

        <Text className="mt-8 font-semibold text-white">
          PIN
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-xl font-semibold tracking-widest text-center text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="••••"
          placeholderTextColor="#64748b"
          value={pin}
          onChangeText={(value) =>
            setPin(
              normalizePinInput(value),
            )
          }
          keyboardType="number-pad"
          secureTextEntry
          maxLength={maxLength}
          autoFocus
        />

        {errorMessage && (
          <Text className="mt-4 text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-7 bg-white rounded-xl"
          disabled={checkingPin}
          onPress={handleUnlock}
        >
          <Text className="font-semibold text-center text-slate-950">
            {checkingPin
              ? 'Checking PIN...'
              : 'Unlock profile'}
          </Text>
        </Pressable>

        <Pressable
          className="px-4 py-4 mt-4 border rounded-xl border-slate-700"
          disabled={checkingPin}
          onPress={handleSwitchProfile}
        >
          <Text className="font-semibold text-center text-slate-300">
            Use another profile
          </Text>
        </Pressable>

        <Text className="mt-5 text-xs leading-5 text-center text-slate-500">
          The PIN is checked locally.
          Convex still verifies the active
          device grant before Child access
          is allowed.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
