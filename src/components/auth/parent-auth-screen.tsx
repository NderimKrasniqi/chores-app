import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useRef, useState, type ComponentProps, type Ref } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, {
  cubicBezier,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Easings } from "@/components/art/motion";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText, useTheme } from "@/design-system";
import { authClient } from "@/lib/auth/client";

import { HouseSignal } from "./house-signal";

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

const reflow = LinearTransition.duration(220).easing(Easings.out);

type ParentAuthScreenProps = {
  onBack?: () => void;
  initialMode?: AuthMode;
};

/**
 * Parent sign-up and sign-in, in the parent's light home style. The house
 * above the form lights a window for each part filled in, and its roof dish
 * signals the rocket while the account is being made or opened.
 */
export function ParentAuthScreen({
  onBack,
  initialMode = "sign-up",
}: ParentAuthScreenProps) {
  const { tokens } = useTheme();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [submittingAuth, setSubmittingAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  // State lags a render behind; this blocks a second tap in the same frame.
  const inFlight = useRef(false);

  const signingUp = mode === "sign-up";
  const nameValid = parentName.trim().length > 0;
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordValid = signingUp
    ? password.length >= MIN_PASSWORD_LENGTH
    : password.length > 0;
  const ready = emailValid && passwordValid && (!signingUp || nameValid);

  // Sign-up: attic = you (your initial), left = email, right = password.
  // Sign-in: attic = your email's initial, both windows = password.
  const identity = signingUp
    ? nameValid
      ? parentName
      : null
    : emailValid
      ? email
      : null;
  const lights = {
    attic: identity ? identity.trim().charAt(0).toUpperCase() : null,
    left: signingUp ? emailValid : passwordValid,
    right: passwordValid,
  };

  function firstProblem() {
    if (signingUp && !nameValid) return "Add your name.";
    if (!emailValid)
      return email.trim()
        ? friendlyAuthError("INVALID_EMAIL")
        : "Add your email.";
    if (!passwordValid)
      return signingUp
        ? friendlyAuthError("PASSWORD_TOO_SHORT")
        : "Enter your password.";
    return null;
  }

  // VoiceOver has no live regions, so errors are announced explicitly.
  function showError(message: string) {
    setErrorMessage(message);
    AccessibilityInfo.announceForAccessibility(message);
  }

  // Editing a field clears the old complaint about it.
  function edit(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setErrorMessage(null);
    };
  }

  function switchMode(next: AuthMode) {
    if (next === mode || submittingAuth) return;
    setErrorMessage(null);
    setMode(next);
  }

  async function handleAuthSubmit() {
    if (inFlight.current) return;
    const problem = firstProblem();
    if (problem) {
      showError(problem);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    inFlight.current = true;
    setSubmittingAuth(true);
    setErrorMessage(null);

    try {
      const result = signingUp
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
        showError(friendlyAuthError(result.error.code, result.error.message));
      }
    } catch {
      showError(
        "Couldn’t reach the server. Check your connection and try again.",
      );
    } finally {
      inFlight.current = false;
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="flex-grow px-5 pb-3"
        >
          <View className="pt-2">
            <HouseSignal
              lights={lights}
              ready={ready}
              sending={submittingAuth}
              scale={0.88}
            />
            {onBack ? (
              <View className="absolute left-0 top-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={onBack}
                  hitSlop={8}
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: tokens.surface }}
                >
                  <Icon name="back" color={tokens.ink} size={20} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <AppText
            accessibilityRole="header"
            variant="screenTitle"
            className="mt-2 text-center text-[29px]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {signingUp ? "Create parent account" : "Welcome back"}
          </AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-0.5 text-center"
          >
            {signingUp
              ? "Set chores, check the work, pay out."
              : "Sign in to open your household."}
          </AppText>

          <ModeSwitch mode={mode} onChange={switchMode} />

          {signingUp ? (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              className="mt-4"
            >
              <FieldLabel label="Name" />
              <AuthInput
                testID="parent-auth-name"
                accessibilityLabel="Name"
                placeholder="Your name"
                value={parentName}
                onChangeText={edit(setParentName)}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </Animated.View>
          ) : null}

          <Animated.View layout={reflow} className="mt-4">
            <FieldLabel label="Email" />
            <AuthInput
              inputRef={emailRef}
              testID="parent-auth-email"
              accessibilityLabel="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={edit(setEmail)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <View className="mt-4">
              <FieldLabel label="Password" />
              <View>
                <AuthInput
                  inputRef={passwordRef}
                  testID="parent-auth-password"
                  accessibilityLabel="Password"
                  placeholder={
                    signingUp ? "Choose a password" : "Your password"
                  }
                  value={password}
                  onChangeText={edit(setPassword)}
                  secureTextEntry={!revealPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={signingUp ? "new-password" : "current-password"}
                  textContentType={signingUp ? "newPassword" : "password"}
                  passwordRules={
                    signingUp ? `minlength: ${MIN_PASSWORD_LENGTH};` : undefined
                  }
                  returnKeyType="go"
                  onSubmitEditing={() => void handleAuthSubmit()}
                  style={{ paddingRight: 64 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    revealPassword ? "Hide password" : "Show password"
                  }
                  onPress={() => setRevealPassword((value) => !value)}
                  hitSlop={8}
                  className="absolute bottom-0 right-0 top-2 justify-center px-4"
                >
                  <AppText variant="label" color="ink-muted">
                    {revealPassword ? "Hide" : "Show"}
                  </AppText>
                </Pressable>
              </View>
              {signingUp ? (
                <PasswordHint met={password.length >= MIN_PASSWORD_LENGTH} />
              ) : null}
            </View>

            {/* Always mounted so Android's live region announces changes. */}
            <View accessibilityLiveRegion="polite">
              {errorMessage ? (
                <View
                  className="mt-3 rounded-[18px] px-4 py-2.5"
                  style={{ backgroundColor: tokens.urgencySoft }}
                >
                  <AppText variant="bodySmall" color="urgency">
                    {errorMessage}
                  </AppText>
                </View>
              ) : null}
            </View>

            <ActionButton
              className="mt-6"
              label={signingUp ? "Create account" : "Sign in"}
              loading={submittingAuth}
              onPress={() => void handleAuthSubmit()}
            />

            <View className="mt-4 flex-row items-center justify-center gap-2 px-4">
              <Icon name="scan" color={tokens.inkMuted} size={16} />
              <AppText variant="caption" color="ink-muted" className="shrink">
                Kids don’t need an email — they scan a code from your phone.
              </AppText>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <AppText variant="label" color="ink-muted">
      {label}
    </AppText>
  );
}

/** The borderless white field used across the parent setup screens. */
function AuthInput({
  inputRef,
  style,
  ...props
}: ComponentProps<typeof TextInput> & { inputRef?: Ref<TextInput> }) {
  const { tokens } = useTheme();
  return (
    <TextInput
      {...props}
      ref={inputRef}
      placeholderTextColor={tokens.inkFaint}
      selectionColor={tokens.accent}
      className="mt-2 min-h-[52px] rounded-[16px] px-4 font-body-heavy text-ink"
      style={[{ backgroundColor: tokens.surface, fontSize: 17 }, style]}
    />
  );
}

function PasswordHint({ met }: { met: boolean }) {
  const { tokens } = useTheme();
  return (
    <View className="mt-1.5 flex-row items-center gap-1.5">
      {met ? <Icon name="check" color={tokens.primaryShade} size={14} /> : null}
      <AppText
        variant="caption"
        style={{ color: met ? tokens.ink : tokens.inkMuted }}
      >
        At least {MIN_PASSWORD_LENGTH} characters
      </AppText>
    </View>
  );
}

const SWITCH_MAX_WIDTH = 308;

const thumbTransition = {
  transitionProperty: "transform",
  transitionDuration: "200ms",
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

/** New account or sign in — an ink thumb slides between them. */
function ModeSwitch({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  const { tokens } = useTheme();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const options: { value: AuthMode; label: string }[] = [
    { value: "sign-up", label: "Create account" },
    { value: "sign-in", label: "Sign in" },
  ];
  return (
    <View
      accessibilityRole="tablist"
      className="mt-4 w-full flex-row self-center rounded-full p-1"
      style={{ backgroundColor: tokens.surface, maxWidth: SWITCH_MAX_WIDTH }}
      onLayout={(event) =>
        setSegmentWidth((event.nativeEvent.layout.width - 8) / 2)
      }
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 4,
            left: 4,
            bottom: 4,
            width: segmentWidth,
            borderRadius: 999,
            backgroundColor: tokens.ink,
            transform: [{ translateX: mode === "sign-in" ? segmentWidth : 0 }],
          },
          thumbTransition,
        ]}
      />
      {options.map((option) => {
        const selected = option.value === mode;
        return (
          <Pressable
            key={option.value}
            testID={`parent-auth-mode-${option.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className="min-h-10 flex-1 items-center justify-center px-2"
          >
            <AppText
              variant="label"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: selected ? tokens.surface : tokens.inkMuted }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
