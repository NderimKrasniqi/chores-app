import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

type AuthMode = 'sign-in' | 'sign-up';

type ParentAuthScreenProps = {
  onBack?: () => void;
};

export function ParentAuthScreen({
  onBack,
}: ParentAuthScreenProps) {
  const [mode, setMode] =
    useState<AuthMode>('sign-up');

  const [parentName, setParentName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    submittingAuth,
    setSubmittingAuth,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  async function handleAuthSubmit() {
    setSubmittingAuth(true);
    setErrorMessage(null);

    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: parentName.trim(),
              email: email.trim(),
              password,
            })
          : await authClient.signIn.email({
              email: email.trim(),
              password,
            });

      if (result.error) {
        setErrorMessage(
          result.error.message ??
            'Authentication failed.',
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmittingAuth(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
        }}
      >
        <View className="justify-center flex-1 px-6">
          {onBack && (
            <Pressable
              className="self-start mb-8"
              onPress={onBack}
            >
              <Text className="font-semibold text-slate-400">
                ← Back
              </Text>
            </Pressable>
          )}

          <Text className="text-3xl font-bold text-white">
            {mode === 'sign-up'
              ? 'Create parent account'
              : 'Parent sign in'}
          </Text>

          <Text className="mt-2 text-slate-400">
            Chores App
          </Text>

          {mode === 'sign-up' && (
            <TextInput
              className="px-4 py-4 mt-8 text-white border rounded-xl border-slate-700 bg-slate-900"
              placeholder="Name"
              placeholderTextColor="#64748b"
              value={parentName}
              onChangeText={setParentName}
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
            <Text className="mt-3 text-red-400">
              {errorMessage}
            </Text>
          )}

          <Pressable
            className="px-4 py-4 mt-5 bg-white rounded-xl"
            disabled={submittingAuth}
            onPress={handleAuthSubmit}
          >
            <Text className="font-semibold text-center text-slate-950">
              {submittingAuth
                ? 'Please wait...'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Sign in'}
            </Text>
          </Pressable>

          <Pressable
            className="mt-5"
            onPress={() => {
              setErrorMessage(null);

              setMode((current) =>
                current === 'sign-up'
                  ? 'sign-in'
                  : 'sign-up',
              );
            }}
          >
            <Text className="text-center text-slate-400">
              {mode === 'sign-up'
                ? 'Already have an account? Sign in'
                : 'Need an account? Sign up'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
