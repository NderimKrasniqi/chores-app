import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type ChildPairingCardProps = {
  householdId: Id<"households">;
  childId: Id<"children">;
  childDisplayName: string;
};

type GeneratedPairingCredential = {
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

export function ChildPairingCard({
  householdId,
  childId,
  childDisplayName,
}: ChildPairingCardProps) {
  const activeCredentials = useQuery(
    api.childAccess.listActivePairingCredentialsForChild,
    {
      childId,
    },
  );

  const createPairingCredential = useAction(api.childPairing.create);

  const revokePairingCredential = useServerConfirmedMutation(
    api.childPairing.revokeCredential,
  );

  const [generatedCredential, setGeneratedCredential] =
    useState<GeneratedPairingCredential | null>(null);

  const [generating, setGenerating] = useState(false);

  const [revokingCredentialId, setRevokingCredentialId] =
    useState<Id<"childPairingCredentials"> | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setErrorMessage(null);

    try {
      const result = await createPairingCredential({
        householdId,
        childId,
      });

      setGeneratedCredential({
        pairingCredentialId: result.pairingCredentialId,
        qrToken: result.qrToken,
        manualCode: result.manualCode,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create child pairing credential.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(
    pairingCredentialId: Id<"childPairingCredentials">,
  ) {
    setRevokingCredentialId(pairingCredentialId);

    setErrorMessage(null);

    try {
      await revokePairingCredential({
        pairingCredentialId,
      });

      if (generatedCredential?.pairingCredentialId === pairingCredentialId) {
        setGeneratedCredential(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not revoke pairing credential.",
      );
    } finally {
      setRevokingCredentialId(null);
    }
  }

  async function handleShareManualCode() {
    if (!generatedCredential) {
      return;
    }

    setErrorMessage(null);

    try {
      await Share.share({
        message: [
          `Pair ${childDisplayName}'s device with Chores App.`,
          "",
          "Manual pairing code:",
          generatedCredential.manualCode,
          "",
          `Expires: ${formatDateTime(generatedCredential.expiresAt)}`,
        ].join("\n"),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not share pairing code.",
      );
    }
  }

  const generatedCredentialExpired =
    generatedCredential !== null && generatedCredential.expiresAt <= Date.now();

  return (
    <View className="mt-5 border-t border-slate-700 pt-5">
      <Text className="font-semibold text-white">Device pairing</Text>

      <Text className="mt-1 text-sm leading-5 text-slate-400">
        Pair a device with {childDisplayName}&apos;s child profile. Credentials
        expire after 15 minutes.
      </Text>

      {generatedCredential && (
        <View className="mt-4 rounded-xl bg-slate-950 p-4">
          <Text className="font-semibold text-white">Pairing credential</Text>

          {generatedCredentialExpired ? (
            <Text className="mt-3 text-red-400">
              This pairing credential has expired. Generate a new one.
            </Text>
          ) : (
            <>
              <View className="mt-4 items-center rounded-xl bg-white p-4">
                <QRCode
                  value={generatedCredential.qrToken}
                  size={200}
                  quietZone={12}
                  backgroundColor="white"
                  color="black"
                />
              </View>

              <Text className="mt-5 text-sm text-slate-500">Manual code</Text>

              <Text
                selectable
                className="mt-2 text-center text-2xl font-bold tracking-widest text-white"
              >
                {generatedCredential.manualCode}
              </Text>

              <Text className="mt-4 text-xs leading-5 text-slate-500">
                Expires {formatDateTime(generatedCredential.expiresAt)}
              </Text>

              <Text className="mt-2 text-xs leading-5 text-slate-500">
                The raw QR token and manual code are only available in this
                screen after generation. They are not recoverable from the
                database.
              </Text>

              <Pressable
                className="mt-4 rounded-xl bg-white px-4 py-3"
                onPress={handleShareManualCode}
              >
                <Text className="text-center font-semibold text-slate-950">
                  Share manual code
                </Text>
              </Pressable>
            </>
          )}

          <Pressable
            className="mt-3 rounded-xl border border-red-900 px-4 py-3"
            disabled={
              revokingCredentialId === generatedCredential.pairingCredentialId
            }
            onPress={() =>
              handleRevoke(generatedCredential.pairingCredentialId)
            }
          >
            <Text className="text-center font-semibold text-red-400">
              {revokingCredentialId === generatedCredential.pairingCredentialId
                ? "Revoking..."
                : "Revoke credential"}
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        className="mt-4 rounded-xl border border-slate-600 px-4 py-3"
        disabled={generating}
        onPress={handleGenerate}
      >
        <Text className="text-center font-semibold text-white">
          {generating
            ? "Generating..."
            : generatedCredential
              ? "Generate another credential"
              : "Generate pairing credential"}
        </Text>
      </Pressable>

      <View className="mt-5">
        <Text className="text-sm font-semibold text-slate-300">
          Active pairing credentials
        </Text>

        {activeCredentials === undefined ? (
          <Text className="mt-2 text-sm text-slate-500">
            Checking credentials...
          </Text>
        ) : activeCredentials.length === 0 ? (
          <Text className="mt-2 text-sm text-slate-500">
            No active pairing credentials.
          </Text>
        ) : (
          activeCredentials.map((credential) => {
            const isLatestGenerated =
              generatedCredential?.pairingCredentialId ===
              credential.pairingCredentialId;

            return (
              <View
                key={credential.pairingCredentialId}
                className="mt-3 rounded-xl border border-slate-700 p-3"
              >
                <Text className="text-sm text-white">
                  {isLatestGenerated
                    ? "Latest generated credential"
                    : "Active credential"}
                </Text>

                <Text className="mt-1 text-xs text-slate-500">
                  Created {formatDateTime(credential.createdAt)}
                </Text>

                <Text className="mt-1 text-xs text-slate-500">
                  Expires {formatDateTime(credential.expiresAt)}
                </Text>

                {!isLatestGenerated && (
                  <>
                    <Text className="mt-2 text-xs leading-5 text-slate-500">
                      The raw QR/manual secret is no longer available. Revoke
                      this credential if it is no longer needed.
                    </Text>

                    <Pressable
                      className="mt-3 rounded-lg border border-red-900 px-3 py-2"
                      disabled={
                        revokingCredentialId === credential.pairingCredentialId
                      }
                      onPress={() =>
                        handleRevoke(credential.pairingCredentialId)
                      }
                    >
                      <Text className="text-center font-semibold text-red-400">
                        {revokingCredentialId === credential.pairingCredentialId
                          ? "Revoking..."
                          : "Revoke"}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            );
          })
        )}
      </View>

      {errorMessage && (
        <Text className="mt-4 text-red-400">{errorMessage}</Text>
      )}
    </View>
  );
}
