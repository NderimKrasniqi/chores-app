import { Scene } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { homeTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, DesignTokens, Surface } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useAction, useQuery } from "convex/react";
import { AppImage as Image } from "@/components/ui/app-image";
import { PairingQrCode } from "@/components/ui/pairing-qr-code";
import { useEffect, useState } from "react";
import { Modal, Pressable, Share, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatTimestampDateTime } from "@/lib/dates";
import { formatPairingCodeForDisplay } from "@/lib/child-access/pairing-code";

const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");
const accessMutedTextStyle = { color: "#3f5fa8" } as const;

function childAvatar(displayName: string) {
  const normalized = displayName.trim().toLowerCase();
  if (normalized === "maya") return mayaAvatar;
  if (normalized === "alex") return alexAvatar;
  return null;
}

export type GeneratedCredential = {
  pairingCredentialId: Id<"childPairingCredentials">;
  qrToken: string;
  manualCode: string;
  expiresAt: number;
};

export type ParentChildAccessVisualDevice = {
  accessGrantId: Id<"childDeviceAccessGrants">;
  createdAt: number;
  isActive: boolean;
  revokedAt?: number;
};

export type ParentChildAccessVisualFixture = {
  devices: ParentChildAccessVisualDevice[];
  generated?: GeneratedCredential;
  generationCount?: number;
  visualNow?: number;
  confirmCodeRevoke?: boolean;
  confirmDeviceId?: Id<"childDeviceAccessGrants">;
  showRevoked?: boolean;
};

function formatDateTime(timestamp: number, timezone: string) {
  return formatTimestampDateTime(timestamp, timezone);
}

function ConfirmationSheet({
  visible,
  title,
  body,
  reassurance,
  actionLabel,
  cancelLabel,
  icon,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  reassurance: string;
  actionLabel: string;
  cancelLabel: string;
  icon: "brokenLink" | "deviceOff";
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-end bg-scrim">
        <SafeAreaView
          edges={["bottom"]}
          className="rounded-t-sheet bg-canvas px-5 pb-2 pt-3"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <View className="mx-auto h-1.5 w-16 rounded-full bg-infoSoftStrong" />
          <View className="mt-3 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-urgencySoft">
              <Icon name={icon} color={themeColors.urgency} size={32} />
            </View>
            <AppText variant="sectionTitle" className="mt-2 text-center">
              {title}
            </AppText>
            <AppText className="mt-1 text-center">{body}</AppText>
            <AppText variant="body" color="action" className="text-center">
              {reassurance}
            </AppText>
          </View>
          <ActionButton
            tone="destructive"
            className="mt-4"
            label={actionLabel}
            loading={loading}
            onPress={onConfirm}
          />
          <ActionButton
            tone="secondary"
            className="mt-1"
            label={cancelLabel}
            onPress={onCancel}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function ParentChildAccessContent({
  householdId,
  childId,
  childDisplayName,
  timezone,
  visualFixture,
}: {
  householdId: Id<"households">;
  childId: Id<"children">;
  childDisplayName: string;
  timezone: string;
  visualFixture?: ParentChildAccessVisualFixture;
}) {
  const artworkAvatar = childAvatar(childDisplayName);
  const queriedDevices = useQuery(
    api.childAccess.listDevicesForChild,
    visualFixture ? "skip" : { childId },
  );
  const devices = visualFixture?.devices ?? queriedDevices;
  const createCredential = useAction(api.childPairing.create);
  const revokeCredential = useServerConfirmedMutation(
    api.childPairing.revokeCredential,
  );
  const revokeDevice = useServerConfirmedMutation(
    api.childPairing.revokeDevice,
  );

  const [generated, setGenerated] = useState<GeneratedCredential | null>(
    visualFixture?.generated ?? null,
  );
  const [generationCount, setGenerationCount] = useState(
    visualFixture?.generationCount ?? (visualFixture?.generated ? 1 : 0),
  );
  const [generating, setGenerating] = useState(false);
  const [confirmCodeRevoke, setConfirmCodeRevoke] = useState(
    visualFixture?.confirmCodeRevoke ?? false,
  );
  const [confirmDeviceId, setConfirmDeviceId] =
    useState<Id<"childDeviceAccessGrants"> | null>(
      visualFixture?.confirmDeviceId ?? null,
    );
  const [revoking, setRevoking] = useState(false);
  const [showRevoked, setShowRevoked] = useState(
    visualFixture?.showRevoked ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => visualFixture?.visualNow ?? Date.now());

  const activeDevices = devices?.filter((device) => device.isActive) ?? [];
  const revokedDevices = devices?.filter((device) => !device.isActive) ?? [];
  const generatedExpired = generated !== null && generated.expiresAt <= now;
  const showGeneratedDivider = generatedExpired || generationCount > 1;

  useEffect(() => {
    if (!generated || visualFixture?.visualNow !== undefined) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [generated, visualFixture?.visualNow]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await createCredential({ householdId, childId });
      setGenerated({
        pairingCredentialId: result.pairingCredentialId,
        qrToken: result.qrToken,
        manualCode: result.manualCode,
        expiresAt: result.expiresAt,
      });
      setGenerationCount((count) => count + 1);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not create pairing code.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function shareCode() {
    if (!generated || generatedExpired) return;
    setError(null);
    try {
      await Share.share({
        message: [
          `Pair ${childDisplayName}’s device with Chores.`,
          "",
          `Manual pairing code: ${generated.manualCode}`,
          `Expires: ${formatDateTime(generated.expiresAt, timezone)}`,
        ].join("\n"),
      });
    } catch (shareError) {
      setError(
        shareError instanceof Error
          ? shareError.message
          : "Could not share pairing code.",
      );
    }
  }

  async function confirmRevokeCode() {
    if (!generated) return;
    setRevoking(true);
    setError(null);
    try {
      await revokeCredential({
        pairingCredentialId: generated.pairingCredentialId,
      });
      setGenerated(null);
      setConfirmCodeRevoke(false);
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Could not revoke pairing code.",
      );
    } finally {
      setRevoking(false);
    }
  }

  async function confirmRevokeDevice() {
    if (!confirmDeviceId) return;
    setRevoking(true);
    setError(null);
    try {
      await revokeDevice({ accessGrantId: confirmDeviceId });
      setConfirmDeviceId(null);
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Could not revoke child device.",
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <View>
      <View className="flex-row items-center">
        <Avatar
          source={childAvatar(childDisplayName)}
          tone={childAvatarTone(childDisplayName)}
          className="h-24 w-24"
          fallbackLabel={childDisplayName}
        />
        <View className="ml-5 flex-1">
          <AppText variant="sectionTitle">{childDisplayName}</AppText>
          <AppText
            color={generated ? "ink-muted" : "ink-muted"}
            style={accessMutedTextStyle}
            className="mt-1"
          >
            {generated
              ? generatedExpired
                ? "Pairing code expired"
                : "Pairing code ready"
              : devices === undefined
                ? "Checking devices…"
                : activeDevices.length === 0
                  ? "No paired devices"
                  : `${activeDevices.length} paired ${activeDevices.length === 1 ? "device" : "devices"}`}
          </AppText>
        </View>
      </View>

      {!generated ? (
        <View key="pairing-empty">
          <AppText variant="sectionTitle" className="mt-6">
            Pair a device
          </AppText>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-2 h-[160px] flex-row overflow-hidden p-0"
          >
            <View className="relative h-full w-[50%] items-center justify-center overflow-hidden">
              <Scene name="phone-qr" size={150} />
              {artworkAvatar ? (
                <Image
                  source={artworkAvatar}
                  className="absolute h-[36px] w-[36px]"
                  style={{ left: 111, top: 60 }}
                  contentFit="cover"
                  accessible={false}
                />
              ) : null}
            </View>
            <View className="flex-1 justify-center pl-1 pr-2">
              <AppText
                variant="cardTitle"
                style={{ fontSize: 18, lineHeight: 22 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.84}
              >
                Connect {childDisplayName}’s device
              </AppText>
              <AppText
                variant="bodySmall"
                color="ink-muted"
                style={[accessMutedTextStyle, { fontSize: 14 }]}
                className="mt-2"
              >
                Create a secure code, then scan it or enter it on{" "}
                {childDisplayName}’s device.
              </AppText>
            </View>
          </Surface>
          <View className="mt-4 gap-3">
            {[
              `Open Chores App on ${childDisplayName}’s device`,
              "Choose Child, then scan or enter the code",
            ].map((step, index) => (
              <View key={step} className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSoft">
                  <AppText variant="cardTitle">{index + 1}</AppText>
                </View>
                <AppText className="ml-3 flex-1" style={accessMutedTextStyle}>
                  {step}
                </AppText>
              </View>
            ))}
          </View>
          <ActionButton
            tone="soft"
            className="mt-7"
            label="Create pairing code"
            leading={
              <Icon name="qrCode" color={themeColors.actionPressed} size={22} />
            }
            loading={generating}
            onPress={() => void generate()}
          />
          <AppText
            variant="caption"
            color="ink-muted"
            style={accessMutedTextStyle}
            className="mt-2 text-center"
          >
            The code expires after 15 minutes and can be used once.
          </AppText>
        </View>
      ) : generatedExpired ? (
        <View key="pairing-expired">
          <AppText variant="sectionTitle" className="mt-6">
            Pairing code
          </AppText>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 items-center px-2 pb-4 pt-2"
          >
            <Scene name="broken-link" size={160} />
            <View className="mt-3 rounded-full bg-urgencySoft px-4 py-2">
              <View className="flex-row items-center">
                <Icon name="clock" color={themeColors.urgency} size={17} />
                <AppText variant="label" color="urgency" className="ml-2">
                  Expired {formatDateTime(generated.expiresAt, timezone)}
                </AppText>
              </View>
            </View>
            <AppText variant="cardTitle" className="mt-5">
              This code can’t be used anymore.
            </AppText>
            <AppText
              color="ink-muted"
              style={accessMutedTextStyle}
              className="mt-1 text-center"
            >
              Generate a new one to pair {childDisplayName}’s device.
            </AppText>
            <ActionButton
              className="mt-4 w-full bg-[#3f1dc9]"
              label="Generate new code"
              leading={
                <Icon name="refresh" color={themeColors.onAction} size={22} />
              }
              loading={generating}
              onPress={() => void generate()}
            />
          </Surface>
        </View>
      ) : (
        <View key="pairing-ready">
          {generationCount > 1 ? (
            <AppText variant="sectionTitle" className="mt-4">
              Pairing code
            </AppText>
          ) : null}
          <Surface
            tone="lavender"
            elevated={false}
            className={`${generationCount > 1 ? "mt-4" : "mt-0"} items-center p-3 ${generationCount === 1 ? "bg-transparent" : ""}`}
          >
            {generationCount > 1 ? (
              <View className="mb-3 w-full flex-row items-center justify-center rounded-full bg-actionSoft px-4 py-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-action">
                  <Icon name="check" color={themeColors.onAction} size={18} />
                </View>
                <AppText variant="label" color="action" className="ml-2">
                  New pairing code ready
                </AppText>
              </View>
            ) : null}
            <View
              className="rounded-control bg-white p-0.5"
              style={DesignTokens.shadowStyle.card}
            >
              <PairingQrCode
                value={generated.qrToken}
                size={generationCount > 1 ? 116 : 124}
                quietZone={4}
                backgroundColor={themeColors.onAction}
                color="#000000"
              />
            </View>
            <View className="mt-2 rounded-full bg-urgencySoft px-4 py-2">
              <View className="flex-row items-center">
                <Icon name="clock" color={themeColors.urgency} size={17} />
                <AppText variant="caption" color="urgency" className="ml-2">
                  One use · Expires{" "}
                  {formatDateTime(generated.expiresAt, timezone)}
                </AppText>
              </View>
            </View>
            <View className="my-2 flex-row items-center">
              <View className="h-px flex-1 bg-infoSoftStrong" />
              <AppText
                variant="bodySmall"
                color="ink-muted"
                style={accessMutedTextStyle}
                className="px-4"
              >
                or enter manually
              </AppText>
              <View className="h-px flex-1 bg-infoSoftStrong" />
            </View>
            <View className="min-h-control w-full flex-row items-center rounded-control bg-infoSoft px-4">
              <AppText
                selectable
                variant="cardTitle"
                className="flex-1 text-center tracking-[4px]"
              >
                {formatPairingCodeForDisplay(generated.manualCode)}
              </AppText>
              <View className="h-8 w-px bg-info" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share pairing code"
                onPress={() => void shareCode()}
                className="h-12 w-12 items-center justify-center"
              >
                <Icon name="share" color={themeColors.action} size={25} />
              </Pressable>
            </View>
            <ActionButton
              tone="secondary"
              className={`${generationCount > 1 ? "mt-3" : "mt-8"} w-full`}
              label="Generate another code"
              leading={
                <Icon name="refresh" color={themeColors.ink} size={22} />
              }
              loading={generating}
              onPress={() => void generate()}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmCodeRevoke(true)}
              className="mt-2 min-h-control w-full flex-row items-center rounded-control bg-urgencySoft px-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-urgency">
                <Icon
                  name="brokenLink"
                  color={themeColors.onAction}
                  size={25}
                />
              </View>
              <View className="ml-3 flex-1">
                <AppText variant="label" color="urgency">
                  Revoke this code
                </AppText>
                <AppText variant="caption" color="urgency" className="mt-0.5">
                  Stops this code from being used
                </AppText>
              </View>
              <Icon name="chevron" color={themeColors.urgency} size={21} />
            </Pressable>
          </Surface>
        </View>
      )}

      {showGeneratedDivider ? <View className="mt-6 h-px bg-line" /> : null}
      <AppText
        variant="sectionTitle"
        className={
          showGeneratedDivider ? "mt-5" : generated ? "mt-5" : "mt-[37px]"
        }
      >
        Paired devices
      </AppText>
      {devices === undefined ? (
        <Surface className="mt-3 p-5">
          <AppText variant="cardTitle">Checking devices…</AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            style={accessMutedTextStyle}
            className="mt-1"
          >
            Active Child sessions will appear here.
          </AppText>
        </Surface>
      ) : activeDevices.length === 0 ? (
        <View
          className={`flex-row items-center px-2 ${showGeneratedDivider ? "mt-4" : generated ? "mt-7" : "mt-3"}`}
        >
          <View
            className={`items-center justify-center rounded-full ${
              revokedDevices.length > 0
                ? "h-14 w-14 bg-transparent"
                : "h-[60px] w-[60px] bg-infoSoft"
            }`}
          >
            <Icon
              name={revokedDevices.length > 0 ? "deviceOff" : "phone"}
              color={themeColors.inkMuted}
              size={revokedDevices.length > 0 ? 32 : 36}
            />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="cardTitle">
              {revokedDevices.length > 0
                ? "No active devices"
                : "No devices yet"}
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              style={accessMutedTextStyle}
              className="mt-1"
            >
              {revokedDevices.length > 0
                ? "All paired devices are revoked."
                : "Paired devices will appear here."}
            </AppText>
          </View>
        </View>
      ) : (
        <View className="mt-3 gap-3">
          {activeDevices.map((device, index) => (
            <Surface
              key={device.accessGrantId}
              tone="lavender"
              elevated={false}
              className="flex-row items-center p-2"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-infoSoftStrong">
                <Icon name="phone" color={themeColors.ink} size={20} />
              </View>
              <View className="ml-3 flex-1">
                <AppText variant="cardTitle">Paired device {index + 1}</AppText>
                <AppText
                  variant="bodySmall"
                  color="ink-muted"
                  style={accessMutedTextStyle}
                  className="mt-0.5"
                >
                  Paired {formatDateTime(device.createdAt, timezone)}
                </AppText>
                <View className="mt-1 self-start rounded-full bg-actionSoft px-2 py-0.5">
                  <View className="flex-row items-center">
                    <View className="h-2.5 w-2.5 rounded-full bg-action" />
                    <AppText
                      variant="caption"
                      color="action"
                      className="ml-1.5"
                    >
                      Active
                    </AppText>
                  </View>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmDeviceId(device.accessGrantId)}
                className="min-h-target justify-center rounded-full bg-urgencySoft px-3"
              >
                <AppText variant="label" color="urgency">
                  Revoke device
                </AppText>
              </Pressable>
            </Surface>
          ))}
        </View>
      )}

      {revokedDevices.length > 0 ? (
        <View className="mt-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowRevoked((current) => !current)}
            className="min-h-control flex-row items-center rounded-control bg-infoSoft px-4"
          >
            <Icon name="clock" color={themeColors.inkMuted} size={22} />
            <AppText variant="label" className="ml-3 flex-1">
              Revoked devices ({revokedDevices.length})
            </AppText>
            <Icon name="chevron" color={themeColors.ink} size={20} />
          </Pressable>
          {showRevoked ? (
            <View className="mt-2 gap-2">
              {revokedDevices.map((device) => (
                <Surface
                  key={device.accessGrantId}
                  tone="muted"
                  elevated={false}
                  className="p-3"
                >
                  <AppText variant="bodySmall">
                    Paired {formatDateTime(device.createdAt, timezone)}
                  </AppText>
                  {device.revokedAt ? (
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      style={accessMutedTextStyle}
                      className="mt-1"
                    >
                      Revoked {formatDateTime(device.revokedAt, timezone)}
                    </AppText>
                  ) : null}
                </Surface>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <Surface tone="coral" elevated={false} className="mt-4 p-3">
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </Surface>
      ) : null}

      <ConfirmationSheet
        visible={confirmCodeRevoke}
        title="Revoke this code?"
        body="This QR code and manual code will stop working immediately."
        reassurance={`${childDisplayName}’s paired devices won’t be affected.`}
        actionLabel="Revoke code"
        cancelLabel="Keep code"
        icon="brokenLink"
        loading={revoking}
        onConfirm={() => void confirmRevokeCode()}
        onCancel={() => setConfirmCodeRevoke(false)}
      />
      <ConfirmationSheet
        visible={confirmDeviceId !== null}
        title="Revoke this device?"
        body={`${childDisplayName} will lose access on this device immediately.`}
        reassurance="Other paired devices and pairing codes won’t be affected."
        actionLabel="Revoke device"
        cancelLabel="Keep device"
        icon="deviceOff"
        loading={revoking}
        onConfirm={() => void confirmRevokeDevice()}
        onCancel={() => setConfirmDeviceId(null)}
      />
    </View>
  );
}
