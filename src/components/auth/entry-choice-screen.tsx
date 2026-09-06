import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

type EntryChoiceScreenProps = {
  onChooseParent: () => void;
};

export function EntryChoiceScreen({ onChooseParent }: EntryChoiceScreenProps) {
  const [startingChildSession, setStartingChildSession] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleChooseChild() {
    setStartingChildSession(true);
    setErrorMessage(null);

    try {
      const result = await authClient.signIn.anonymous();

      if (result.error) {
        setErrorMessage(
          result.error.message ?? 'Could not start child session.',
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not start child session.',
      );
    } finally {
      setStartingChildSession(false);
    }
  }

  return (
    <View className="justify-center flex-1 px-6 bg-slate-950">
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        Chores App
      </Text>

      <Text className="mt-3 text-4xl font-bold text-white">
        Who&apos;s using this device?
      </Text>

      <Text className="mt-3 text-base leading-6 text-slate-400">
        Parents sign in with their account. Children join their family profile
        without needing an email address.
      </Text>

      <Pressable
        className="px-5 py-5 mt-10 bg-white rounded-2xl"
        onPress={onChooseParent}
      >
        <Text className="text-lg font-semibold text-center text-slate-950">
          I&apos;m a parent
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-600">
          Sign in or create a parent account
        </Text>
      </Pressable>

      <Pressable
        className="px-5 py-5 mt-4 border rounded-2xl border-slate-700 bg-slate-900"
        disabled={startingChildSession}
        onPress={handleChooseChild}
      >
        <Text className="text-lg font-semibold text-center text-white">
          {startingChildSession ? 'Starting child session...' : "I'm a child"}
        </Text>

        <Text className="mt-1 text-sm text-center text-slate-400">
          Join with a family pairing code
        </Text>
      </Pressable>

      {errorMessage && (
        <Text className="mt-5 text-center text-red-400">{errorMessage}</Text>
      )}
    </View>
  );
}
