import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Modal, Pressable, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type GeneratedCredential = {
  pairingCredentialId: Id<"childPairingCredentials">;
  qrToken: string;
  manualCode: string;
  expiresAt: number;
};

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function ConfirmationSheet({
  visible,
  title,
  body,
  reassurance,
  actionLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  reassurance: string;
  actionLabel: string;
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
        <SafeAreaView
          edges={["bottom"]}
          className="rounded-t-sheet bg-canvas px-5 pb-3 pt-5"
        >
          <View className="mx-auto h-1.5 w-16 rounded-full bg-infoSoftStrong" />
          <View className="mt-5 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-urgencySoft">
              <DirectionCIcon
                name="brokenLink"
                color={DirectionC.color.coral}
                size={32}
              />
            </View>
            <AppText variant="sectionTitle" className="mt-3 text-center">
              {title}
            </AppText>
            <AppText className="mt-2 text-center">{body}</AppText>
            <AppText
              variant="bodySmall"
              color="action"
              className="mt-2 text-center"
            >
              {reassurance}
            </AppText>
          </View>
          <ActionButton
            tone="destructive"
            className="mt-6"
            label={actionLabel}
            loading={loading}
            onPress={onConfirm}
          />
          <ActionButton
            tone="secondary"
            className="mt-2"
            label="Keep it"
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
}: {
  householdId: Id<"households">;
  childId: Id<"children">;
  childDisplayName: string;
}) {
  const activeCredentials = useQuery(
    api.childAccess.listActivePairingCredentialsForChild,
    { childId },
  );
  const devices = useQuery(api.childAccess.listDevicesForChild, { childId });
  const createCredential = useAction(api.childPairing.create);
  const revokeCredential = useServerConfirmedMutation(
    api.childPairing.revokeCredential,
  );
  const revokeDevice = useServerConfirmedMutation(
    api.childPairing.revokeDevice,
  );

  const [generated, setGenerated] = useState<GeneratedCredential | null>(null);
  const [generationCount, setGenerationCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [confirmCodeRevoke, setConfirmCodeRevoke] = useState(false);
  const [confirmDeviceId, setConfirmDeviceId] =
    useState<Id<"childDeviceAccessGrants"> | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDevices = devices?.filter((device) => device.isActive) ?? [];
  const revokedDevices = devices?.filter((device) => !device.isActive) ?? [];
  const generatedExpired =
    generated !== null && generated.expiresAt <= Date.now();

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
          `Expires: ${formatDateTime(generated.expiresAt)}`,
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
        <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-rewardSoft">
          <AppText variant="sectionTitle">
            {childDisplayName.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="sectionTitle">{childDisplayName}</AppText>
          <AppText
            color={
              generated
                ? generatedExpired
                  ? "urgency"
                  : "action"
                : "ink-muted"
            }
            className="mt-1"
          >
            {generated
              ? generatedExpired
                ? "Pairing code expired"
                : "Pairing code ready"
              : `${activeDevices.length} paired ${activeDevices.length === 1 ? "device" : "devices"}`}
          </AppText>
        </View>
      </View>

      {!generated ? (
        <View>
          <AppText variant="sectionTitle" className="mt-6">
            Pair a device
          </AppText>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 flex-row items-center overflow-hidden p-5"
          >
            <View className="h-24 w-24 items-center justify-center rounded-large bg-infoSoftStrong">
              <DirectionCIcon
                name="scan"
                color={DirectionC.color.ink}
                size={44}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">
                Connect {childDisplayName}’s device
              </AppText>
              <AppText variant="bodySmall" color="ink-muted" className="mt-2">
                Create a secure code, then scan it or enter it on{" "}
                {childDisplayName}’s device.
              </AppText>
            </View>
          </Surface>
          <View className="mt-4 gap-3">
            {[
              `Open Chores on ${childDisplayName}’s device`,
              "Choose Child, then scan or enter the code",
            ].map((step, index) => (
              <View key={step} className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSoft">
                  <AppText variant="cardTitle">{index + 1}</AppText>
                </View>
                <AppText className="ml-3 flex-1">{step}</AppText>
              </View>
            ))}
          </View>
          {activeCredentials && activeCredentials.length > 0 ? (
            <Surface tone="muted" elevated={false} className="mt-4 p-3">
              <AppText variant="bodySmall" color="ink-muted">
                An active code was created earlier, but codes are only visible
                when generated. Create another if you need one now.
              </AppText>
            </Surface>
          ) : null}
          <ActionButton
            className="mt-5"
            label="Create pairing code"
            loading={generating}
            onPress={() => void generate()}
          />
          <AppText
            variant="caption"
            color="ink-muted"
            className="mt-2 text-center"
          >
            The code expires after 15 minutes and can be used once.
          </AppText>
        </View>
      ) : generatedExpired ? (
        <View>
          <AppText variant="sectionTitle" className="mt-6">
            Pairing code
          </AppText>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 items-center p-5"
          >
            <View className="h-28 w-28 items-center justify-center rounded-large bg-infoSoftStrong">
              <DirectionCIcon
                name="clock"
                color={DirectionC.color.coral}
                size={52}
              />
            </View>
            <View className="mt-4 rounded-full bg-urgencySoft px-4 py-2">
              <AppText variant="label" color="urgency">
                Expired {formatDateTime(generated.expiresAt)}
              </AppText>
            </View>
            <AppText variant="cardTitle" className="mt-5">
              This code can’t be used anymore.
            </AppText>
            <AppText color="ink-muted" className="mt-1 text-center">
              Generate a new one to pair {childDisplayName}’s device.
            </AppText>
            <ActionButton
              className="mt-5 w-full"
              label="Generate new code"
              loading={generating}
              onPress={() => void generate()}
            />
          </Surface>
        </View>
      ) : (
        <View>
          <AppText variant="sectionTitle" className="mt-6">
            Pairing code
          </AppText>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-3 items-center p-5"
          >
            {generationCount > 1 ? (
              <View className="mb-3 flex-row items-center rounded-full bg-actionSoft px-4 py-2">
                <DirectionCIcon
                  name="check"
                  color={DirectionC.color.green}
                  size={18}
                />
                <AppText variant="label" color="action" className="ml-2">
                  New pairing code ready
                </AppText>
              </View>
            ) : null}
            <View className="rounded-control bg-white p-3 shadow-md">
              <QRCode
                value={generated.qrToken}
                size={150}
                quietZone={6}
                backgroundColor={DirectionC.color.white}
                color="#000000"
              />
            </View>
            <View className="mt-3 rounded-full bg-urgencySoft px-4 py-2">
              <AppText variant="caption" color="urgency">
                One use · Expires {formatDateTime(generated.expiresAt)}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="ink-muted" className="my-3">
              or enter manually
            </AppText>
            <View className="min-h-control w-full flex-row items-center rounded-control bg-infoSoftStrong px-4">
              <AppText
                selectable
                variant="cardTitle"
                className="flex-1 text-center tracking-[4px]"
              >
                {generated.manualCode}
              </AppText>
              <View className="h-8 w-px bg-info" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share pairing code"
                onPress={() => void shareCode()}
                className="h-12 w-12 items-center justify-center"
              >
                <DirectionCIcon
                  name="share"
                  color={DirectionC.color.green}
                  size={25}
                />
              </Pressable>
            </View>
            <ActionButton
              tone="secondary"
              className="mt-4 w-full"
              label="Generate another code"
              loading={generating}
              onPress={() => void generate()}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmCodeRevoke(true)}
              className="mt-3 min-h-control w-full flex-row items-center rounded-control bg-urgencySoft px-4"
            >
              <DirectionCIcon
                name="brokenLink"
                color={DirectionC.color.coral}
                size={25}
              />
              <View className="ml-3 flex-1">
                <AppText variant="label" color="urgency">
                  Revoke this code
                </AppText>
                <AppText variant="caption" color="urgency" className="mt-0.5">
                  Stops this code from being used
                </AppText>
              </View>
              <DirectionCIcon
                name="chevron"
                color={DirectionC.color.coral}
                size={21}
              />
            </Pressable>
          </Surface>
        </View>
      )}

      <AppText variant="sectionTitle" className="mt-7">
        Paired devices
      </AppText>
      {devices === undefined ? (
        <AppText color="ink-muted" className="mt-3">
          Checking devices…
        </AppText>
      ) : activeDevices.length === 0 ? (
        <View className="mt-3 flex-row items-center px-2">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoft">
            <DirectionCIcon
              name="phone"
              color={DirectionC.color.inkMuted}
              size={28}
            />
          </View>
          <View className="ml-4">
            <AppText variant="cardTitle">No active devices</AppText>
            <AppText variant="bodySmall" color="ink-muted" className="mt-1">
              Paired devices will appear here.
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
              className="flex-row items-center p-4"
            >
              <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
                <DirectionCIcon
                  name="phone"
                  color={DirectionC.color.ink}
                  size={28}
                />
              </View>
              <View className="ml-3 flex-1">
                <AppText variant="cardTitle">Paired device {index + 1}</AppText>
                <AppText variant="bodySmall" color="ink-muted" className="mt-1">
                  Paired {formatDateTime(device.createdAt)}
                </AppText>
                <View className="mt-2 self-start rounded-full bg-actionSoft px-3 py-1">
                  <AppText variant="caption" color="action">
                    Active
                  </AppText>
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
            <DirectionCIcon
              name="clock"
              color={DirectionC.color.inkMuted}
              size={22}
            />
            <AppText variant="label" className="ml-3 flex-1">
              Revoked devices ({revokedDevices.length})
            </AppText>
            <DirectionCIcon
              name="chevron"
              color={DirectionC.color.ink}
              size={20}
            />
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
                    Paired {formatDateTime(device.createdAt)}
                  </AppText>
                  {device.revokedAt ? (
                    <AppText
                      variant="caption"
                      color="ink-muted"
                      className="mt-1"
                    >
                      Revoked {formatDateTime(device.revokedAt)}
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
        loading={revoking}
        onConfirm={() => void confirmRevokeDevice()}
        onCancel={() => setConfirmDeviceId(null)}
      />
    </View>
  );
}
