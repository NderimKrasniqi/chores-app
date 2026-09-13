import * as SecureStore from "expo-secure-store";

const ONBOARDING_COMPLETE_KEY = "chores-app.onboarding-complete.v1";

export async function hasCompletedOnboarding() {
  return (await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)) === "true";
}

export async function markOnboardingComplete() {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
}
