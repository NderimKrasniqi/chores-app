import { PhoneLinkScene } from "@/components/art";
import Svg, { Circle } from "react-native-svg";
import { Icon } from "@/components/ui/icon";
import { homeTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, SheetBody } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useAction, useQuery } from "convex/react";
import { PairingQrCode } from "@/components/ui/pairing-qr-code";
import { useEffect, useState } from "react";
import { Modal, Pressable, Share, View } from "react-native";
import { userErrorMessage } from "@/lib/errors";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatTimestampDateTime } from "@/lib/dates";
import { formatPairingCodeForDisplay } from "@/lib/child-access/pairing-code";

export type GeneratedCredential = {
  pairingCredentialId: Id<"childPairingCredentials">;
  qrToken: string;
  manualCode: string;
  expiresAt: number;
};

export type ParentChildAccessVisualDevice = {
  accessGrantId: Id<"childDeviceAccessGrants">;
  deviceLabel?: string;
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-end bg-scrim">
        <SheetBody className="rounded-t-sheet bg-canvas px-5 pb-2 pt-3">
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
        </SheetBody>
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
      // The clock only ticks while a code is showing; restart it from now.
      setNow(Date.now());
      setGenerated({
        pairingCredentialId: result.pairingCredentialId,
        qrToken: result.qrToken,
        manualCode: result.manualCode,
        expiresAt: result.expiresAt,
      });
      setGenerationCount((count) => count + 1);
    } catch (generationError) {
      setError(
        userErrorMessage(generationError, "Could not create pairing code."),
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
      setError(userErrorMessage(shareError, "Could not share pairing code."));
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
      setError(userErrorMessage(revokeError, "Could not revoke pairing code."));
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
      setError(userErrorMessage(revokeError, "Could not revoke child device."));
    } finally {
      setRevoking(false);
    }
  }

  const secondsLeft = generated
    ? Math.max(0, Math.round((generated.expiresAt - now) / 1000))
    : 0;
  const lifetime = 15 * 60;

  return (
    <View className="pb-6">
      {!generated ? (
        <View className="items-center">
          <PhoneLinkScene width={320} height={170} name={childDisplayName} />
          <AppText variant="sectionTitle" className="mt-2 text-center">
            Link {childDisplayName}’s phone
          </AppText>
          <AppText color="ink-muted" className="mt-1 text-center">
            Make a code, then on their phone choose “I’m a child” and scan it.
          </AppText>
          <ActionButton
            className="mt-5 w-full"
            label="Make a pairing code"
            loading={generating}
            onPress={() => void generate()}
          />
        </View>
      ) : (
        <View
          className="items-center rounded-[28px] p-5"
          style={{ backgroundColor: themeColors.surface }}
        >
          <View style={{ opacity: generatedExpired ? 0.2 : 1 }}>
            <PairingQrCode
              value={generated.qrToken}
              size={200}
              quietZone={2}
              color={themeColors.ink}
              backgroundColor={themeColors.surface}
            />
          </View>
          <AppText
            selectable
            className="mt-4 font-display tracking-[6px]"
            style={{ fontSize: 32, lineHeight: 38, color: themeColors.ink }}
          >
            {formatPairingCodeForDisplay(generated.manualCode)}
          </AppText>
          <CountdownRing
            secondsLeft={secondsLeft}
            lifetime={lifetime}
            expired={generatedExpired}
          />
          {generatedExpired ? (
            <ActionButton
              className="mt-4 w-full"
              label="Make a new code"
              loading={generating}
              onPress={() => void generate()}
            />
          ) : (
            <View className="mt-4 w-full flex-row gap-3">
              <ActionButton
                className="flex-1"
                tone="secondary"
                label="Share"
                leading={
                  <Icon name="share" color={themeColors.ink} size={18} />
                }
                onPress={() => void shareCode()}
              />
              <ActionButton
                className="flex-1"
                tone="destructiveSecondary"
                label="Cancel code"
                onPress={() => setConfirmCodeRevoke(true)}
              />
            </View>
          )}
          {showGeneratedDivider && !generatedExpired ? (
            <AppText
              variant="caption"
              color="ink-muted"
              className="mt-3 text-center"
            >
              Older codes for {childDisplayName} no longer work.
            </AppText>
          ) : null}
        </View>
      )}

      {error ? (
        <View className="mt-4 rounded-[18px] bg-urgencySoft px-4 py-3">
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </View>
      ) : null}

      <AppText variant="sectionTitle" className="mt-7">
        Linked phones
      </AppText>
      {devices === undefined ? (
        <AppText color="ink-muted" className="mt-2">
          Checking…
        </AppText>
      ) : activeDevices.length === 0 ? (
        <View className="mt-3 rounded-[20px] bg-surface p-4">
          <AppText color="ink-muted">
            No phone is linked for {childDisplayName} yet.
          </AppText>
        </View>
      ) : (
        <View className="mt-3 gap-2.5">
          {activeDevices.map((device, index) => (
            <View
              key={device.accessGrantId}
              className="flex-row items-center gap-3 rounded-[20px] bg-surface px-4 py-3"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: themeColors.actionSoft }}
              >
                <Icon name="phone" color={themeColors.action} size={20} />
              </View>
              <View className="flex-1">
                <AppText variant="cardTitle" numberOfLines={1}>
                  {device.deviceLabel ?? `Phone ${index + 1}`}
                </AppText>
                <AppText variant="caption" color="ink-muted">
                  Linked {formatDateTime(device.createdAt, timezone)}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Unlink ${device.deviceLabel ?? `phone ${index + 1}`}`}
                onPress={() => setConfirmDeviceId(device.accessGrantId)}
                hitSlop={8}
                className="min-h-[40px] justify-center px-2"
              >
                <AppText variant="label" color="urgency">
                  Unlink
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {revokedDevices.length > 0 ? (
        <View className="mt-4">
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowRevoked((value) => !value)}
            className="min-h-[40px] flex-row items-center gap-1"
          >
            <AppText variant="label" color="ink-muted">
              {showRevoked ? "Hide" : "Show"} {revokedDevices.length} unlinked
            </AppText>
            <Icon name="chevronDown" color={themeColors.inkMuted} size={16} />
          </Pressable>
          {showRevoked
            ? revokedDevices.map((device) => (
                <AppText
                  key={device.accessGrantId}
                  variant="caption"
                  color="ink-muted"
                  className="mt-1"
                >
                  {device.deviceLabel ? `${device.deviceLabel} · ` : ""}
                  Unlinked{" "}
                  {device.revokedAt
                    ? formatDateTime(device.revokedAt, timezone)
                    : ""}
                </AppText>
              ))
            : null}
        </View>
      ) : null}

      <ConfirmationSheet
        visible={confirmCodeRevoke}
        title="Cancel this code?"
        body="It stops working right away. You can make a new one anytime."
        reassurance="Linked phones stay linked."
        actionLabel="Cancel code"
        cancelLabel="Keep it"
        icon="brokenLink"
        loading={revoking}
        onConfirm={() => void confirmRevokeCode()}
        onCancel={() => setConfirmCodeRevoke(false)}
      />
      <ConfirmationSheet
        visible={confirmDeviceId !== null}
        title={`Unlink this phone?`}
        body={`${childDisplayName} won’t be able to use the app on it until it’s linked again.`}
        reassurance="Their chores, balance and history are kept."
        actionLabel="Unlink phone"
        cancelLabel="Keep linked"
        icon="deviceOff"
        loading={revoking}
        onConfirm={() => void confirmRevokeDevice()}
        onCancel={() => setConfirmDeviceId(null)}
      />
    </View>
  );
}

/** Time left on the code as a shrinking ring with mm:ss inside. */
function CountdownRing({
  secondsLeft,
  lifetime,
  expired,
}: {
  secondsLeft: number;
  lifetime: number;
  expired: boolean;
}) {
  const size = 64;
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(1, secondsLeft / lifetime);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return (
    <View
      className="mt-4 flex-row items-center gap-3"
      accessible
      accessibilityLabel={
        expired
          ? "Code expired"
          : minutes === 0
            ? "Code works for less than a minute"
            : `Code works for ${minutes} more ${minutes === 1 ? "minute" : "minutes"}`
      }
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={themeColors.surfaceMuted}
            strokeWidth={6}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={expired ? themeColors.urgency : themeColors.action}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <AppText variant="caption">
            {expired ? "0:00" : `${minutes}:${seconds}`}
          </AppText>
        </View>
      </View>
      <AppText variant="bodySmall" color={expired ? "urgency" : "ink-muted"}>
        {expired ? "This code expired" : "Works once, for 15 minutes"}
      </AppText>
    </View>
  );
}
