import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { AppImage } from "@/components/ui/app-image";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface } from "@/design-system";

import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { File, UploadType } from "expo-file-system";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  View,
  type ImageSourcePropType,
} from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const submissionPhotoArtwork = require("../../../assets/images/direction-c/submission-photo.png");

type Props = {
  occurrenceId: Id<"choreOccurrences">;

  attemptNumber: 1 | 2;

  disabled: boolean;

  submitting: boolean;

  submitLabel: string;

  submittingLabel: string;

  submitTestID?: string;

  onSubmit: (
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">,
  ) => Promise<void>;

  footerBeforeSubmit?: ReactNode;

  hideSubmitButton?: boolean;

  visualPhotoSource?: ImageSourcePropType;

  onControlStateChange?: (state: {
    evidenceUploadIntentId?: Id<"submissionEvidenceUploads">;
    busy: boolean;
  }) => void;
};

type AttachedEvidence = {
  uploadIntentId: Id<"submissionEvidenceUploads">;

  previewUri: string;
};

export function ChildSubmissionActions({
  occurrenceId,
  attemptNumber,
  disabled,
  submitting,
  submitLabel,
  submittingLabel,
  submitTestID,
  onSubmit,
  footerBeforeSubmit,
  hideSubmitButton = false,
  visualPhotoSource,
  onControlStateChange,
}: Props) {
  const generateUploadUrl = useServerConfirmedMutation(
    api.submissionEvidence.generateUploadUrl,
  );

  const registerUpload = useServerConfirmedMutation(
    api.submissionEvidence.registerUpload,
  );

  const discardUpload = useServerConfirmedMutation(
    api.submissionEvidence.discardUpload,
  );

  const [evidence, setEvidence] = useState<AttachedEvidence | null>(null);

  const [uploading, setUploading] = useState(false);

  const busy = disabled || submitting || uploading;
  const hasPhoto = visualPhotoSource !== undefined || evidence !== null;

  useEffect(() => {
    onControlStateChange?.({
      ...(evidence ? { evidenceUploadIntentId: evidence.uploadIntentId } : {}),
      busy,
    });
  }, [busy, evidence, onControlStateChange]);

  async function uploadImage(sourceUri: string) {
    setUploading(true);

    let createdIntentId: Id<"submissionEvidenceUploads"> | null = null;

    try {
      const context = ImageManipulator.ImageManipulator.manipulate(sourceUri);

      context.resize({
        width: 1600,

        height: null,
      });

      const rendered = await context.renderAsync();

      const prepared = await rendered.saveAsync({
        compress: 0.75,

        format: ImageManipulator.SaveFormat.JPEG,
      });

      const upload = await generateUploadUrl({
        occurrenceId,

        attemptNumber,
      });

      createdIntentId = upload.uploadIntentId;

      const preparedFile = new File(prepared.uri);
      const uploadResponse = await preparedFile.upload(upload.uploadUrl, {
        httpMethod: "POST",
        uploadType: UploadType.BINARY_CONTENT,
        sessionType: "foreground",
        headers: {
          "Content-Type": "image/jpeg",
        },
        mimeType: "image/jpeg",
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error(
          `Photo upload failed (${uploadResponse.status})${uploadResponse.body ? `: ${uploadResponse.body.slice(0, 180)}` : "."}`,
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(uploadResponse.body) as unknown;
      } catch {
        throw new Error("Photo upload returned an invalid response.");
      }

      if (
        !payload ||
        typeof payload !== "object" ||
        !("storageId" in payload) ||
        typeof (
          payload as {
            storageId?: unknown;
          }
        ).storageId !== "string"
      ) {
        throw new Error("Photo upload returned an invalid result.");
      }

      const storageId = (
        payload as {
          storageId: string;
        }
      ).storageId as Id<"_storage">;

      const registration = await registerUpload({
        uploadIntentId: upload.uploadIntentId,

        storageId,
      });

      if (!registration.accepted) {
        throw new Error(registration.reason ?? "Photo could not be attached.");
      }

      setEvidence({
        uploadIntentId: upload.uploadIntentId,

        previewUri: prepared.uri,
      });

      createdIntentId = null;
    } catch (error) {
      if (createdIntentId) {
        try {
          await discardUpload({
            uploadIntentId: createdIntentId,
          });
        } catch {
          // Best-effort cleanup only.
        }
      }

      Alert.alert(
        "Photo not attached",
        `${
          error instanceof Error
            ? error.message
            : "The photo could not be uploaded."
        }\n\nYou can try again or submit without a photo.`,
      );
    } finally {
      setUploading(false);
    }
  }

  async function choosePhoto() {
    if (busy) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],

      allowsEditing: false,

      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    await uploadImage(asset.uri);
  }

  async function takePhoto() {
    if (busy) {
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Camera permission required",
        "Camera access is needed to take chore evidence photos.",
      );

      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],

      allowsEditing: false,

      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      return;
    }

    await uploadImage(asset.uri);
  }

  async function removePhoto() {
    if (!evidence || busy) {
      return;
    }

    setUploading(true);

    try {
      await discardUpload({
        uploadIntentId: evidence.uploadIntentId,
      });

      setEvidence(null);
    } catch (error) {
      Alert.alert(
        "Could not remove photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (busy) {
      return;
    }

    await onSubmit(evidence?.uploadIntentId);

    /*
     * The backend consumed this intent
     * transactionally with the submission.
     */
    setEvidence(null);
  }

  return (
    <View>
      <Surface className="p-[18px]">
        <AppText variant="sectionTitle">
          {hasPhoto ? "Your photo" : "Add a photo"}
          {!hasPhoto ? (
            <AppText variant="sectionTitle" className="font-semibold">
              {" "}
              (optional)
            </AppText>
          ) : null}
        </AppText>

        {hasPhoto ? (
          <View className="mt-3">
            <Image
              source={visualPhotoSource ?? { uri: evidence?.previewUri ?? "" }}
              className="h-40 w-full rounded-large bg-surfaceMuted"
              resizeMode="cover"
            />

            <View className="mt-3 flex-row items-center justify-between gap-3">
              <View className="flex-row items-center">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-action">
                  <Icon
                    name="check"
                    color={themeColors.onAction}
                    size={20}
                  />
                </View>
                <AppText color="action" className="ml-2 font-black">
                  Photo ready
                </AppText>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove chore evidence photo"
                disabled={busy || visualPhotoSource !== undefined}
                onPress={() => void removePhoto()}
                className={`min-h-11 flex-row items-center rounded-control bg-urgencySoft px-3 ${busy ? "opacity-50" : ""}`}
              >
                <Icon
                  name="trash"
                  color={themeColors.urgency}
                  size={20}
                />
                <AppText color="urgency" className="ml-1.5 font-bold">
                  Remove photo
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View className="mt-4 h-32 items-center justify-center rounded-large bg-infoSoft">
              <AppImage
                source={submissionPhotoArtwork}
                className="h-36 w-[240px]"
                contentFit="contain"
                accessible={false}
              />
            </View>

            <View className="mt-4 flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take chore evidence photo"
                disabled={busy}
                onPress={() => void takePhoto()}
                className={`min-h-[54px] flex-1 flex-row items-center justify-center rounded-control bg-actionSoft px-3 ${busy ? "opacity-50" : ""}`}
              >
                <Icon
                  name="camera"
                  color={themeColors.actionPressed}
                  size={22}
                />
                <AppText color="action" className="ml-2 font-black">
                  Take photo
                </AppText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose chore evidence photo"
                disabled={busy}
                onPress={() => void choosePhoto()}
                className={`min-h-[54px] flex-1 flex-row items-center justify-center rounded-control bg-infoSoft px-3 ${busy ? "opacity-50" : ""}`}
              >
                <Icon
                  name="photo"
                  color={themeColors.ink}
                  size={22}
                />
                <AppText className="ml-2 font-black">Choose photo</AppText>
              </Pressable>
            </View>
          </>
        )}

        {uploading ? (
          <AppText variant="caption" color="ink-muted" className="mt-2">
            Preparing photo…
          </AppText>
        ) : null}
      </Surface>

      {footerBeforeSubmit}

      {!hideSubmitButton ? (
        <ActionButton
          testID={submitTestID}
          accessibilityLabel={submitLabel}
          disabled={busy}
          loading={submitting}
          label={submitting ? submittingLabel : submitLabel}
          trailing={
            <Icon
              name="chevron"
              color={themeColors.onAction}
              size={22}
            />
          }
          onPress={() => void submit()}
          className="mt-3"
        />
      ) : null}
    </View>
  );
}
