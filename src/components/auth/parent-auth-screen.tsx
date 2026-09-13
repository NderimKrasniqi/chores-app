import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { authClient } from "@/lib/auth/client";
import { Image } from "expo-image";
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

const parentAccessHero = require("../../../assets/images/direction-c/parent-access-hero.png");
const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");

type AuthMode = "sign-in" | "sign-up";

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

  async function handleAuthSubmit() {
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
        setErrorMessage(result.error.message ?? "Authentication failed.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
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
            <View className="w-[58%]">
              <AppText variant="screenTitle">
                {mode === "sign-up" ? "Create parent account" : "Welcome back"}
              </AppText>
              <AppText className="mt-2">
                {mode === "sign-up"
                  ? "Set up and manage your family’s chores and rewards."
                  : "Sign in to open your household."}
              </AppText>
            </View>
            <Image
              source={parentAccessHero}
              className="absolute -right-5 top-0 h-[190px] w-[210px]"
              contentFit="contain"
              accessible={false}
            />
          </View>

          <View className="mt-3 gap-4">
            {mode === "sign-up" ? (
              <FormField
                label="Name"
                placeholder="Your name"
                value={parentName}
                onChangeText={setParentName}
                autoCapitalize="words"
                textContentType="name"
              />
            ) : null}

            <FormField
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
              label="Password"
              placeholder="Enter a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === "sign-up" ? "newPassword" : "password"}
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
              <AppText variant="bodySmall" className="font-black">
                {mode === "sign-up" ? "Sign in" : "Create one"}
              </AppText>
            </AppText>
          </Pressable>

          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 flex-row items-center p-3"
          >
            <Image
              source={childAvatar}
              className="h-20 w-20"
              contentFit="contain"
              accessible={false}
            />
            <AppText className="ml-3 flex-1">
              Children join without email accounts.
            </AppText>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
