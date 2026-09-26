import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { authClient } from "@/lib/auth/client";
import { Scene, StarBuddy } from "@/components/art";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AuthMode = "sign-in" | "sign-up";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Better Auth error codes → words a parent can act on.
function friendlyAuthError(code: string | undefined, fallback?: string) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don’t match. Try again.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There’s already an account with that email. Sign in instead.";
    case "PASSWORD_TOO_SHORT":
      return `Use at least ${MIN_PASSWORD_LENGTH} characters for the password.`;
    case "INVALID_EMAIL":
      return "That email doesn’t look right.";
    default:
      return fallback && !fallback.includes("[body.")
        ? fallback
        : "Couldn’t sign you in. Check your details and try again.";
  }
}

type ParentAuthScreenProps = {
  onBack?: () => void;
};

export function ParentAuthScreen({ onBack }: ParentAuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const canSubmit =
    emailValid &&
    password.length > 0 &&
    (mode === "sign-in" || parentName.trim().length > 0);

  async function handleAuthSubmit() {
    if (!canSubmit) return;
    if (mode === "sign-up" && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(friendlyAuthError("PASSWORD_TOO_SHORT"));
      return;
    }
    setSubmittingAuth(true);
    setErrorMessage(null);

    try {
      const result =
        mode === "sign-up"
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
          friendlyAuthError(result.error.code, result.error.message),
        );
      }
    } catch {
      setErrorMessage(
        "Couldn’t reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmittingAuth(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5">
          <TopBar title="Parent access" onBack={onBack} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="px-5 pb-6"
        >
          <View className="mt-3 min-h-[190px]">
            <View className="relative z-10">
              <AppText
                variant="screenTitle"
                className="max-w-[72%] text-[29px] leading-[33px]"
              >
                {mode === "sign-up" ? "Create parent account" : "Welcome back"}
              </AppText>
              <AppText className="mt-3 w-[58%] text-[15px] leading-[21px]">
                {mode === "sign-up"
                  ? "Set up and manage your family’s chores and rewards."
                  : "Sign in to open your household."}
              </AppText>
            </View>
            <View className="absolute bottom-0 right-0 z-0">
              <Scene name="house" size={150} />
            </View>
          </View>

          <View className="mt-3 gap-[26px]">
            {mode === "sign-up" ? (
              <FormField
                testID="parent-auth-name"
                label="Name"
                placeholder="Your name"
                value={parentName}
                onChangeText={setParentName}
                autoCapitalize="words"
                textContentType="name"
              />
            ) : null}

            <FormField
              testID="parent-auth-email"
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <FormField
              testID="parent-auth-password"
              label="Password"
              placeholder="Enter a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
          </View>

          {errorMessage ? (
            <Surface tone="coral" elevated={false} className="mt-4 p-3">
              <AppText variant="bodySmall" color="urgency">
                {errorMessage}
              </AppText>
            </Surface>
          ) : null}

          <ActionButton
            className="mt-6"
            label={mode === "sign-up" ? "Create account" : "Sign in"}
            loading={submittingAuth}
            disabled={!canSubmit}
            onPress={() => void handleAuthSubmit()}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setErrorMessage(null);
              setMode((current) =>
                current === "sign-up" ? "sign-in" : "sign-up",
              );
            }}
            className="min-h-target items-center justify-center px-4"
          >
            <AppText variant="bodySmall" className="text-center">
              {mode === "sign-up"
                ? "Already have an account? "
                : "Need an account? "}
              <AppText variant="bodySmall" className="font-body-heavy">
                {mode === "sign-up" ? "Sign in" : "Create one"}
              </AppText>
            </AppText>
          </Pressable>

          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 flex-row items-center p-3"
          >
            <View className="h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-night">
              <StarBuddy size={46} mood="wave" />
            </View>
            <AppText
              variant="bodySmall"
              className="ml-3 flex-1 text-[14px] leading-[18px]"
            >
              Children join without email accounts.
            </AppText>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
