import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText } from "@/design-system";
import {
  getChildPinRequirements,
  verifyLocalChildPin,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChildPinUnlockScreenProps = {
  context: LocalChildContext;
  onUnlocked: () => void;
};

const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");

function normalizePinInput(value: string) {
  const { maxLength } = getChildPinRequirements();
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ChildPinUnlockScreen({
  context,
  onUnlocked,
}: ChildPinUnlockScreenProps) {
  const { activateParentStorage } = useAuthRuntime();
  const [pin, setPin] = useState("");
  const [checkingPin, setCheckingPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { minLength, maxLength } = getChildPinRequirements();

  async function handleUnlock() {
    setErrorMessage(null);

    if (pin.length < minLength) {
      setErrorMessage(`Enter your ${minLength} to ${maxLength} digit PIN.`);
      return;
    }

    setCheckingPin(true);

    try {
      const valid = await verifyLocalChildPin(context.contextId, pin);
      setPin("");

      if (!valid) {
        setErrorMessage("Incorrect PIN.");
        return;
      }

      onUnlocked();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not verify PIN.",
      );
    } finally {
      setCheckingPin(false);
    }
  }

  function handleSwitchProfile() {
    setPin("");
    setErrorMessage(null);
    activateParentStorage();
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1 px-5"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-center">
          <AppText
            variant="label"
            color="ink-faint"
            className="uppercase tracking-widest"
          >
            Child profile
          </AppText>
          <AppText variant="display" className="mt-3">
            Hi, {context.childDisplayName}
          </AppText>
          <AppText color="ink-muted" className="mt-2">
            Enter your local PIN to unlock this Child profile.
          </AppText>

          <View className="my-6 items-center">
            <Image
              source={childAvatar}
              className="h-32 w-32 rounded-full"
              contentFit="contain"
              accessible={false}
            />
            <AppText variant="sectionTitle" className="mt-2">
              {context.childDisplayName}
            </AppText>
            <AppText color="ink-muted">{context.householdName}</AppText>
          </View>

          <AppText variant="sectionTitle">PIN</AppText>
          <TextInput
            className="mt-2 min-h-[72px] rounded-control border-2 border-infoSoftStrong bg-surface text-center font-rounded text-[28px] font-black tracking-[12px] text-ink"
            placeholder="••••"
            placeholderTextColor="#8D73BC"
            value={pin}
            onChangeText={(value) => setPin(normalizePinInput(value))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={maxLength}
            autoFocus
          />

          {errorMessage ? (
            <AppText color="urgency" className="mt-3">
              {errorMessage}
            </AppText>
          ) : null}

          <ActionButton
            className="mt-6"
            label="Unlock profile"
            loading={checkingPin}
            onPress={() => void handleUnlock()}
          />
          <ActionButton
            tone="secondary"
            className="mt-3"
            label="Use another profile"
            disabled={checkingPin}
            onPress={handleSwitchProfile}
          />

          <View className="mt-7 flex-row items-center justify-center">
            <DirectionCIcon
              name="checkShield"
              color={DirectionC.color.green}
              size={26}
            />
            <AppText
              variant="caption"
              color="ink-muted"
              className="ml-2 flex-1"
            >
              The PIN is checked locally. Active device access is still
              required.
            </AppText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
