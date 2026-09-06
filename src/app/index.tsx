import { authClient } from '@/lib/auth-client';
import { useConvexAuth, useQuery } from 'convex/react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../convex/_generated/api';

type AuthMode = 'sign-in' | 'sign-up';

export default function HomeScreen() {
  const [mode, setMode] = useState<AuthMode>('sign-up');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();

  const currentUser = useQuery(
    api.auth.getCurrentUser,
    isAuthenticated ? {} : 'skip',
  );

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setErrorMessage(result.error.message ?? 'Authentication failed.');
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
  }

  if (sessionPending || convexAuthLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-slate-950">
        <ActivityIndicator />
        <Text className="mt-3 text-slate-400">Checking session...</Text>
      </View>
    );
  }

  if (session?.user) {
    return (
      <View className="justify-center flex-1 px-6 bg-slate-950">
        <Text className="text-3xl font-bold text-white">Signed in</Text>

        <Text className="mt-4 text-lg text-white">{session.user.name}</Text>

        <Text className="mt-1 text-slate-400">{session.user.email}</Text>

        <View className="p-4 mt-6 border rounded-xl border-slate-700 bg-slate-900">
          <Text className="font-semibold text-white">Convex actor</Text>

          {!isAuthenticated ? (
            <Text className="mt-2 text-amber-400">
              Connecting authenticated session...
            </Text>
          ) : currentUser === undefined ? (
            <Text className="mt-2 text-slate-400">Resolving user...</Text>
          ) : (
            <Text className="mt-2 text-green-400">
              Authenticated in Convex ✓
            </Text>
          )}
        </View>

        <Pressable
          className="px-4 py-4 mt-8 bg-white rounded-xl"
          onPress={handleSignOut}
        >
          <Text className="font-semibold text-center text-slate-950">
            Sign out
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="justify-center flex-1 px-6">
        <Text className="text-3xl font-bold text-white">
          {mode === 'sign-up' ? 'Create parent account' : 'Parent sign in'}
        </Text>

        <Text className="mt-2 text-slate-400">Chores App</Text>

        {mode === 'sign-up' && (
          <TextInput
            className="px-4 py-4 mt-8 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="Name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          className="px-4 py-4 mt-3 text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="Email"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <TextInput
          className="px-4 py-4 mt-3 text-white border rounded-xl border-slate-700 bg-slate-900"
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {errorMessage && (
          <Text className="mt-3 text-red-400">{errorMessage}</Text>
        )}

        <Pressable
          className="px-4 py-4 mt-5 bg-white rounded-xl"
          disabled={submitting}
          onPress={handleSubmit}
        >
          <Text className="font-semibold text-center text-slate-950">
            {submitting
              ? 'Please wait...'
              : mode === 'sign-up'
                ? 'Create account'
                : 'Sign in'}
          </Text>
        </Pressable>

        <Pressable
          className="mt-5"
          onPress={() =>
            setMode((current) =>
              current === 'sign-up' ? 'sign-in' : 'sign-up',
            )
          }
        >
          <Text className="text-center text-slate-400">
            {mode === 'sign-up'
              ? 'Already have an account? Sign in'
              : 'Need an account? Sign up'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
