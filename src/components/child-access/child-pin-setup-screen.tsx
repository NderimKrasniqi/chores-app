import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";
import { PARENT_AUTH_STORAGE_PREFIX } from "@/lib/auth/client";
import {
  getChildPinRequirements,
  isValidChildPin,
  registerLocalChildContext,
  type LocalChildContext,
} from "@/lib/child-access/local-access";
import { useAuthRuntime } from "@/providers/auth-runtime-provider";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChildPinSetupScreenProps = {
  householdId: string;
  householdName: string;
  childId: string;
  childDisplayName: string;
  authStoragePrefix: string;
  onComplete: (context: LocalChildContext) => void;
};

const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");

function normalizePinInput(value: string) {
  const { maxLength } = getChildPinRequirements();
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ChildPinSetupScreen({
  householdId,
  householdName,
  childId,
  childDisplayName,
  authStoragePrefix,
  onComplete,
}: ChildPinSetupScreenProps) {
  const { authClient, activateParentStorage } = useAuthRuntime();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        error instanceof Error
          ? error.message
          : "Could not restart child setup.",
      );
    } finally {
      setRestarting(false);
    }
  }

  async function handleSavePin() {
    setErrorMessage(null);

    if (isLegacyParentStorage) {
      setErrorMessage(
        "This Child session must be paired again using its own secure device context.",
      );
      return;
    }

    if (!isValidChildPin(pin)) {
      setErrorMessage(`PIN must contain ${minLength} to ${maxLength} digits.`);
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage("PINs do not match.");
      return;
    }

    setSaving(true);

    try {
      const context = await registerLocalChildContext({
        householdId,
        householdName,
        childId,
        childDisplayName,
        authStoragePrefix,
        pin,
      });
      setPin("");
      setConfirmPin("");
      onComplete(context);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save Child PIN.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (isLegacyParentStorage) {
    return (
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas px-5">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center">
          <AppText
            variant="label"
            color="urgency"
            className="uppercase tracking-widest"
          >
            Pairing update required
          </AppText>
          <AppText variant="screenTitle" className="mt-3">
            Pair {childDisplayName} again
          </AppText>
          <AppText color="ink-muted" className="mt-3">
            This older Child session must be moved into its own secure device
            profile before a local PIN can be saved.
          </AppText>
          <Surface tone="reward" elevated={false} className="mt-6 p-4">
            <AppText variant="cardTitle">No PIN has been saved</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-2">
              Restart Child setup and pair this profile again using a fresh
              pairing code.
            </AppText>
          </Surface>
          {errorMessage ? (
            <AppText color="urgency" className="mt-4">
              {errorMessage}
            </AppText>
          ) : null}
          <ActionButton
            className="mt-7"
            label="Restart Child setup"
            loading={restarting}
            onPress={() => void handleRestartChildSetup()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pb-5 pt-7"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText
            variant="label"
            color="action"
            className="uppercase tracking-widest"
          >
            Pairing complete
          </AppText>
          <AppText variant="display" className="mt-3">
            Protect {childDisplayName}
          </AppText>
          <AppText color="ink-muted" className="mt-2">
            Create a local PIN for this Child profile. You’ll use it when
            selecting {childDisplayName} on a shared device.
          </AppText>

          <Surface className="mt-5 flex-row items-center p-3">
            <Image
              source={childAvatar}
              className="h-[84px] w-[84px] rounded-full"
              contentFit="contain"
              accessible={false}
            />
            <View className="ml-4 flex-1">
              <AppText variant="sectionTitle">{childDisplayName}</AppText>
              <AppText color="ink-muted">{householdName}</AppText>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-actionSoftStrong">
              <DirectionCIcon
                name="check"
                color={DirectionC.color.green}
                size={26}
              />
            </View>
          </Surface>

          <AppText variant="sectionTitle" className="mt-6">
            Create PIN
          </AppText>
          <TextInput
            className="mt-2 min-h-[72px] rounded-control border-2 border-infoSoftStrong bg-surface text-center font-rounded text-[28px] font-black tracking-[12px] text-ink"
            placeholder="••••"
            placeholderTextColor="#8D73BC"
            value={pin}
            onChangeText={(value) => setPin(normalizePinInput(value))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={maxLength}
          />
          <AppText variant="bodySmall" color="ink-muted" className="mt-2">
            Use {minLength} to {maxLength} digits. This PIN only protects the
            local profile on this device.
          </AppText>

          <AppText variant="sectionTitle" className="mt-6">
            Confirm PIN
          </AppText>
          <TextInput
            className="mt-2 min-h-[72px] rounded-control border-2 border-infoSoftStrong bg-surface text-center font-rounded text-[28px] font-black tracking-[12px] text-ink"
            placeholder="••••"
            placeholderTextColor="#8D73BC"
            value={confirmPin}
            onChangeText={(value) => setConfirmPin(normalizePinInput(value))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={maxLength}
          />

          {errorMessage ? (
            <AppText color="urgency" className="mt-4">
              {errorMessage}
            </AppText>
          ) : null}

          <ActionButton
            className="mt-6"
            label="Save PIN"
            loading={saving}
            onPress={() => void handleSavePin()}
          />

          <View className="mt-5 flex-row items-center justify-center">
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
              Your PIN is never stored as typed or sent to the server.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
