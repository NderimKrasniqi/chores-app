import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { Icon } from "@/components/ui/icon";
import { homeTokens as themeColors } from "@/design-system/theme";
import { AppText } from "@/design-system";

import { useEffect, useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const siteUrl = (() => {
  const value = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;

  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_CONVEX_SITE_URL");
  }

  return value;
})();

export function SubmissionEvidenceViewer({
  submissionId,
}: {
  submissionId: Id<"choreSubmissions">;
}) {
  const createViewToken = useServerConfirmedMutation(
    api.submissionEvidence.createViewToken,
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function viewPhoto() {
    if (loading) {
      return;
    }

    setLoading(true);

    setError(null);

    try {
      const result = await createViewToken({
        submissionId,
      });

      setImageUrl(siteUrl.replace(/\/+$/, "") + result.path);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Could not load photo evidence.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => void viewPhoto());

    return () => cancelAnimationFrame(frame);
    // A new viewer instance receives a fresh short-lived private URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const [zoomed, setZoomed] = useState(false);

  return (
    <View className="mt-5 items-center">
      <AppText variant="label" color="ink-muted">
        Snap proof
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Photo from the child. Tap to enlarge"
        disabled={!imageUrl}
        onPress={() => setZoomed(true)}
        className="mt-2 rounded-[6px] p-2.5 pb-7"
        style={{
          backgroundColor: "#FFFFFF",
          transform: [{ rotate: "-2deg" }],
          shadowColor: "#2B1B4A",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 220, height: 220, borderRadius: 2 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="items-center justify-center"
            style={{
              width: 220,
              height: 220,
              backgroundColor: themeColors.surfaceMuted,
            }}
          >
            <AppText variant="label" color="ink-muted">
              {loading ? "Developing…" : "Photo unavailable"}
            </AppText>
          </View>
        )}
      </Pressable>
      <View className="mt-2 flex-row items-center gap-1.5">
        <Icon name="lock" color={themeColors.inkMuted} size={14} />
        <AppText variant="caption" color="ink-muted">
          Private to your household
        </AppText>
      </View>
      {error ? (
        <AppText
          variant="bodySmall"
          color="urgency"
          className="mt-2 text-center"
        >
          {error}
        </AppText>
      ) : null}

      <Modal
        visible={zoomed}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomed(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          onPress={() => setZoomed(false)}
          className="flex-1 items-center justify-center bg-black/90 p-4"
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
