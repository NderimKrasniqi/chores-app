import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { userErrorMessage } from "@/lib/errors";

import { LostSatellite, Starfield } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { PARENT_AUTH_STORAGE_PREFIX } from "@/lib/auth/client";
import {
  getChildPinRequirements,
  isValidChildPin,
  registerLocalChildContext,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";

import { AvatarPlanet } from "./child-pin-unlock-screen";
import { StarKeypad, StarSlots } from "./star-keypad";

type ChildPinSetupScreenProps = {
  householdId: string;
  householdName: string;
  childId: string;
  childDisplayName: string;
  authStoragePrefix: string;
  onComplete: (context: LocalChildContext) => void;
};

/**
 * "Make your secret star code": type it once, then again to confirm. The code
 * only protects this profile on this device and is never sent anywhere.
 */
export function ChildPinSetupScreen({
  householdId,
  householdName,
  childId,
  childDisplayName,
  authStoragePrefix,
  onComplete,
}: ChildPinSetupScreenProps) {
  const { tokens } = useTheme();
  const { authClient, activateParentStorage } = useAuthRuntime();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(doneTimer.current), []);
  const [restarting, setRestarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [celebrate, setCelebrate] = useState(0);
  const { minLength, maxLength } = getChildPinRequirements();
  const isLegacyParentStorage =
    authStoragePrefix === PARENT_AUTH_STORAGE_PREFIX;

  async function handleRestartChildSetup() {
    setRestarting(true);
    setErrorMessage(null);

    try {
      await authClient.signOut();
      activateParentStorage();
    } catch (error) {
      setErrorMessage(
        userErrorMessage(error, "Could not restart child setup."),
      );
    } finally {
      setRestarting(false);
    }
  }

  function handleCreate() {
    if (!isValidChildPin(pin)) {
      setErrorMessage(`Use ${minLength} to ${maxLength} numbers.`);
      setShake((n) => n + 1);
      return;
    }
    setErrorMessage(null);
    setConfirmPin("");
    setStep("confirm");
  }

  async function handleConfirm() {
    if (inFlight.current || saved) return;
    if (confirmPin !== pin) {
      setShake((n) => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage("Those didn’t match. Make your code again.");
      AccessibilityInfo.announceForAccessibility(
        "Those didn’t match. Make your code again.",
      );
      setPin("");
      setConfirmPin("");
      setStep("create");
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setErrorMessage(null);

    try {
      const context = await registerLocalChildContext({
        householdId,
        householdName,
        childId,
        childDisplayName,
        authStoragePrefix,
        pin,
      });
      setSaved(true);
      setCelebrate((n) => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Pop on the filled stars, then move on; cancelled on unmount.
      doneTimer.current = setTimeout(() => onComplete(context), 320);
    } catch (error) {
      setErrorMessage(userErrorMessage(error, "Could not save Child PIN."));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (isLegacyParentStorage) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-6">
        <StatusBar style="light" />
        <Starfield seed={31} />
        <View className="flex-1 items-center justify-center">
          <LostSatellite size={190} />
          <AppText
            variant="label"
            color="pink"
            className="mt-2 uppercase tracking-[1.4px]"
          >
            Pairing update needed
          </AppText>
          <AppText variant="screenTitle" className="mt-2 text-center">
            Pair {childDisplayName} again
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-2 text-center font-body-bold"
          >
            This older profile needs its own secure spot on this device. No code
            has been saved yet — ask a Parent for a fresh pairing code.
          </AppText>
          {errorMessage ? (
            <AppText color="pink" className="mt-4 text-center font-body-bold">
              {errorMessage}
            </AppText>
          ) : null}
          <ActionButton
            className="mt-7 w-full"
            label="Restart Child setup"
            loading={restarting}
            onPress={() => void handleRestartChildSetup()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const value = step === "create" ? pin : confirmPin;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="light" />
      <Starfield seed={childDisplayName.length + 17} />
      <View className="flex-1 justify-between px-6 pb-2 pt-4">
        <View className="items-center">
          <AvatarPlanet name={childDisplayName} size={88} />
          <AppText
            variant="label"
            color="primary"
            className="mt-2 uppercase tracking-[1.4px]"
          >
            {householdName} · paired!
          </AppText>
          <AppText variant="screenTitle" className="mt-1 text-center">
            {step === "create" ? "Make your secret star code" : "Say it again"}
          </AppText>
          <AppText
            color="ink-muted"
            className="mt-1 text-center font-body-bold"
          >
            {step === "create"
              ? `${minLength} to ${maxLength} numbers only you know`
              : "Type the same code to lock it in"}
          </AppText>

          <View className="mt-5">
            <StarSlots
              length={value.length}
              min={minLength}
              max={maxLength}
              shake={shake}
              celebrate={celebrate}
            />
          </View>
          <AppText
            accessibilityLiveRegion="polite"
            color="pink"
            className="mt-3 min-h-[20px] text-center font-body-bold"
          >
            {errorMessage ?? ""}
          </AppText>
        </View>

        <View>
          <StarKeypad
            testID={
              step === "create" ? "child-pin-create" : "child-pin-confirm"
            }
            value={value}
            max={maxLength}
            canSubmit={value.length >= minLength}
            busy={saving || saved}
            submitLabel={step === "create" ? "Next" : "Save code"}
            onDigit={(digit) => {
              setErrorMessage(null);
              const add = (current: string) =>
                (current + digit).slice(0, maxLength);
              if (step === "create") setPin(add);
              else setConfirmPin(add);
            }}
            onDelete={() => {
              const drop = (current: string) => current.slice(0, -1);
              if (step === "create") setPin(drop);
              else setConfirmPin(drop);
            }}
            onSubmit={() =>
              step === "create" ? handleCreate() : void handleConfirm()
            }
          />
          {step === "confirm" && !saved ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setErrorMessage(null);
                setPin("");
                setConfirmPin("");
                setStep("create");
              }}
              className="mt-2 min-h-[44px] items-center justify-center"
            >
              <AppText
                variant="bodySmall"
                color="ink-muted"
                className="font-body-bold underline"
              >
                Start over
              </AppText>
            </Pressable>
          ) : null}
          <View className="mt-3 flex-row items-center justify-center gap-1.5">
            <Icon name="checkShield" color={tokens.primary} size={16} />
            <AppText variant="caption" color="ink-muted">
              Only stays on this device. Never sent anywhere.
            </AppText>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
