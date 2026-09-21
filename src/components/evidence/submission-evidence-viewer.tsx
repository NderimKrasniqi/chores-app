import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { AppText, Surface } from "@/design-system";

import { useEffect, useState } from "react";
import { Image, View } from "react-native";

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

  return (
    <Surface className="mt-3 p-3">
      <AppText variant="sectionTitle">Photo evidence</AppText>

      {imageUrl ? (
        <>
          <Image
            source={{
              uri: imageUrl,
            }}
            className="mt-3 h-40 w-full rounded-large bg-surfaceMuted"
            resizeMode="cover"
          />
          <View className="mt-2 flex-row items-center">
            <DirectionCIcon
              name="lock"
              color={DirectionC.color.inkMuted}
              size={20}
            />
            <AppText variant="bodySmall" color="ink-muted" className="ml-2">
              Private to your household.
            </AppText>
          </View>
        </>
      ) : (
        <View className="mt-3 h-40 items-center justify-center rounded-large bg-surfaceMuted">
          <AppText variant="label" color="ink-muted">
            {loading ? "Loading photo…" : "Photo unavailable"}
          </AppText>
        </View>
      )}

      {error ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-3">
          <AppText variant="bodySmall" color="urgency">
            {error}
          </AppText>
        </Surface>
      ) : null}
    </Surface>
  );
}
