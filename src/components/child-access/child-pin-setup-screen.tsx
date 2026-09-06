import {
  getChildPinRequirements,
  isValidChildPin,
  registerLocalChildContext,
  type LocalChildContext,
} from '@/lib/child-local-access';
import {
  PARENT_AUTH_STORAGE_PREFIX,
} from '@/lib/auth-client';
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

type ChildPinSetupScreenProps = {
  householdId: string;
  householdName: string;

  childId: string;
  childDisplayName: string;

  authStoragePrefix: string;

  onComplete: (
    context: LocalChildContext,
  ) => void;
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

export function ChildPinSetupScreen({
  householdId,
  householdName,
  childId,
  childDisplayName,
  authStoragePrefix,
  onComplete,
}: ChildPinSetupScreenProps) {
  const {
    authClient,
    activateParentStorage,
  } = useAuthRuntime();

  const [
    pin,
    setPin,
  ] = useState('');

  const [
    confirmPin,
    setConfirmPin,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    restarting,
    setRestarting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const {
    minLength,
    maxLength,
  } = getChildPinRequirements();

  const isLegacyParentStorage =
    authStoragePrefix ===
    PARENT_AUTH_STORAGE_PREFIX;

  async function handleRestartChildSetup() {
    setRestarting(true);
    setErrorMessage(null);

    try {
      /*
       * Clear only the currently active legacy
       * Better Auth session first.
       */
      await authClient.signOut();

      /*
       * Return the app to its normal/default
       * authentication context.
       *
       * The next time "I'm a child" is selected,
       * EntryChoiceScreen will generate a unique
       * Child SecureStore namespace.
       */
      activateParentStorage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not restart child setup.',
      );
    } finally {
      setRestarting(false);
    }
  }

  async function handleSavePin() {
    setErrorMessage(null);

    if (isLegacyParentStorage) {
      setErrorMessage(
        'This child session must be paired again using its own secure device context.',
      );

      return;
    }

    if (!isValidChildPin(pin)) {
      setErrorMessage(
        `PIN must contain ${minLength} to ${maxLength} digits.`,
      );

      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage(
        'PINs do not match.',
      );

      return;
    }

    setSaving(true);

    try {
      const context =
        await registerLocalChildContext({
          householdId,
          householdName,

          childId,
          childDisplayName,

          authStoragePrefix,

          pin,
        });

      /*
       * Raw PIN values are deliberately cleared
       * immediately after creating the verifier.
       */
      setPin('');
      setConfirmPin('');

      onComplete(context);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save child PIN.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLegacyParentStorage) {
    return (
      <View className="justify-center flex-1 px-6 bg-slate-950">
        <Text className="text-sm font-semibold tracking-wider uppercase text-amber-500">
          Pairing update required
        </Text>

        <Text className="mt-3 text-3xl font-bold text-white">
          Pair {childDisplayName} again
        </Text>

        <Text className="mt-3 text-base leading-6 text-slate-400">
          This Child session was created before
          shared-device secure profiles were enabled.
          It is using the app&apos;s old default
          authentication context.
        </Text>

        <View className="p-4 mt-6 border rounded-xl border-amber-900 bg-slate-900">
          <Text className="font-semibold text-amber-400">
            No PIN has been saved
          </Text>

          <Text className="mt-2 text-sm leading-5 text-slate-400">
            We will not attach a Child PIN to the
            Parent/default SecureStore context.
            Restart Child setup and pair this profile
            again using a fresh pairing code.
          </Text>
        </View>

        {errorMessage && (
          <Text className="mt-5 text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-7 bg-white rounded-xl"
          disabled={restarting}
          onPress={handleRestartChildSetup}
        >
          <Text className="font-semibold text-center text-slate-950">
            {restarting
              ? 'Restarting...'
              : 'Restart child setup'}
          </Text>
        </Pressable>
      </View>
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
        <Text className="text-sm font-semibold tracking-wider uppercase text-green-500">
          Pairing complete
        </Text>

        <Text className="mt-3 text-3xl font-bold text-white">
          Protect {childDisplayName}
        </Text>

        <Text className="mt-3 text-base leading-6 text-slate-400">
          Create a local PIN for this child
          profile. The PIN will be required
          when selecting this profile on a
          shared device.
        </Text>

        <View className="p-4 mt-6 border rounded-xl border-slate-800 bg-slate-900">
          <Text className="font-semibold text-white">
            {householdName}
          </Text>

          <Text className="mt-1 text-sm text-slate-400">
            {childDisplayName}
          </Text>
        </View>

        <Text className="mt-8 font-semibold text-white">
          Create PIN
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
        />

        <Text className="mt-2 text-xs leading-5 text-slate-500">
          Use {minLength} to {maxLength} digits.
          This PIN only protects the local
          profile on this device.
        </Text>

        <Text className="mt-6 font-semibold text-white">
          Confirm PIN
        </Text>

        <TextInput
          className="px-4 py-4 mt-2 text-xl font-semibold tracking-widest text-center text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="••••"
          placeholderTextColor="#64748b"
          value={confirmPin}
          onChangeText={(value) =>
            setConfirmPin(
              normalizePinInput(value),
            )
          }
          keyboardType="number-pad"
          secureTextEntry
          maxLength={maxLength}
        />

        {errorMessage && (
          <Text className="mt-4 text-red-400">
            {errorMessage}
          </Text>
        )}

        <Pressable
          className="px-4 py-4 mt-7 bg-white rounded-xl"
          disabled={saving}
          onPress={handleSavePin}
        >
          <Text className="font-semibold text-center text-slate-950">
            {saving
              ? 'Saving PIN...'
              : 'Save PIN'}
          </Text>
        </Pressable>

        <Text className="mt-5 text-xs leading-5 text-center text-slate-500">
          The raw PIN is never stored and is
          never sent to the server.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
