import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import { ActionButton, AppText, Surface } from "@/design-system";

import { useState } from "react";
import { Image, Pressable, View } from "react-native";

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

  return (
    <Surface className="mt-4 p-4">
      <View className="flex-row items-center">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-infoSoft">
          <DirectionCIcon name="photo" color={DirectionC.color.ink} size={24} />
        </View>
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle">Photo evidence</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-0.5">
            Attached by the Child for this submission.
          </AppText>
        </View>
      </View>

      {imageUrl ? (
        <>
          <Image
            source={{
              uri: imageUrl,
            }}
            className="mt-4 h-56 w-full rounded-large bg-surfaceMuted"
            resizeMode="cover"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide chore evidence photo"
            onPress={() => setImageUrl(null)}
            className="mt-2 min-h-target items-center justify-center rounded-control bg-infoSoft px-4"
          >
            <AppText variant="label">Hide photo</AppText>
          </Pressable>
        </>
      ) : (
        <ActionButton
          className="mt-4"
          tone="secondary"
          accessibilityLabel="View chore evidence photo"
          loading={loading}
          label={loading ? "Loading photo…" : "View photo"}
          leading={
            <DirectionCIcon
              name="photo"
              color={DirectionC.color.ink}
              size={21}
            />
          }
          onPress={() => void viewPhoto()}
        />
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
