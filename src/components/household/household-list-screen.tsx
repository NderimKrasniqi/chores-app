import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
} from 'react-native';

import {
  HouseholdCard,
  type HouseholdSummary,
} from './household-card';

type HouseholdListScreenProps = {
  parentName:
    string;

  parentEmail:
    string;

  households:
    HouseholdSummary[];
};

export function HouseholdListScreen({
  parentName,
  parentEmail,
  households,
}: HouseholdListScreenProps) {
  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  async function handleSignOut() {
    setErrorMessage(
      null,
    );

    try {
      await authClient.signOut();
    } catch (
      error
    ) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not sign out.',
      );
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        padding:
          24,

        paddingBottom:
          48,
      }}
    >
      <Text className="text-sm font-semibold tracking-wider uppercase text-slate-500">
        Parent
      </Text>

      <Text className="mt-1 text-2xl font-bold text-white">
        {parentName}
      </Text>

      <Text className="mt-1 text-slate-400">
        {parentEmail}
      </Text>

      <Text className="mt-10 text-3xl font-bold text-white">
        Your household
      </Text>

      {households.map(
        (
          household,
        ) => (
          <HouseholdCard
            key={
              household.householdId
            }
            household={
              household
            }
          />
        ),
      )}

      {errorMessage ? (
        <Text className="mt-4 text-red-400">
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        className="px-4 py-4 mt-8 border rounded-xl border-slate-700"
        onPress={
          handleSignOut
        }
      >
        <Text className="font-semibold text-center text-white">
          Sign out
        </Text>
      </Pressable>
    </ScrollView>
  );
}
