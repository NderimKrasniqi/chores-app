import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { PopIn } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { questTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText } from "@/design-system";
import { userErrorMessage } from "@/lib/errors";

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
        `${userErrorMessage(
          error,
          "The photo could not be uploaded.",
        )}\n\nYou can try again or submit without a photo.`,
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
        userErrorMessage(error, "Please try again."),
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
      <View className="items-center">
        {hasPhoto ? (
          <PopIn>
            {/* The proof photo as a tilted polaroid. */}
            <View
              className="w-[250px] rounded-[10px] bg-white p-3 pb-2"
              style={{ transform: [{ rotate: "-3deg" }] }}
            >
              <Image
                source={
                  visualPhotoSource ?? { uri: evidence?.previewUri ?? "" }
                }
                className="h-[180px] w-full rounded-[4px] bg-surfaceMuted"
                resizeMode="cover"
                accessibilityLabel="Your proof photo"
              />
              <View className="mt-2 flex-row items-center justify-between">
                <AppText className="font-display text-[18px] text-night">
                  Proof!
                </AppText>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <Icon name="check" color={themeColors.night} size={15} />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove chore evidence photo"
                disabled={busy || visualPhotoSource !== undefined}
                onPress={() => void removePhoto()}
                hitSlop={10}
                className={`absolute -right-3 -top-3 h-9 w-9 items-center justify-center rounded-full bg-pink ${busy ? "opacity-50" : ""}`}
              >
                <Icon name="close" color={themeColors.night} size={16} />
              </Pressable>
            </View>
          </PopIn>
        ) : (
          <View className="w-full items-center rounded-large border-2 border-dashed border-nightRaised px-4 pb-4 pt-5">
            <View
              className="h-[86px] w-[74px] items-center justify-center rounded-[8px] bg-nightRaised"
              style={{ transform: [{ rotate: "-6deg" }] }}
            >
              <Icon name="camera" color={themeColors.star} size={30} />
            </View>
            <AppText className="mt-3 font-display text-[19px]">
              Snap proof
            </AppText>
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="font-body-bold"
            >
              Optional — a photo helps your Parent say yes.
            </AppText>

            <View className="mt-4 w-full flex-row gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take chore evidence photo"
                disabled={busy}
                onPress={() => void takePhoto()}
                className={`min-h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-nightRaised ${busy ? "opacity-50" : ""}`}
              >
                <Icon name="camera" color={themeColors.ink} size={20} />
                <AppText className="font-body-heavy text-[15px]">
                  Camera
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose chore evidence photo"
                disabled={busy}
                onPress={() => void choosePhoto()}
                className={`min-h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-nightRaised ${busy ? "opacity-50" : ""}`}
              >
                <Icon name="photo" color={themeColors.ink} size={20} />
                <AppText className="font-body-heavy text-[15px]">
                  Photos
                </AppText>
              </Pressable>
            </View>
          </View>
        )}

        {uploading ? (
          <AppText variant="caption" color="ink-muted" className="mt-3">
            Developing your photo…
          </AppText>
        ) : null}
      </View>

      {footerBeforeSubmit}

      {!hideSubmitButton ? (
        <ActionButton
          testID={submitTestID}
          accessibilityLabel={submitLabel}
          disabled={busy}
          loading={submitting}
          label={submitting ? submittingLabel : submitLabel}
          trailing={
            <Icon name="chevron" color={themeColors.onAction} size={22} />
          }
          onPress={() => void submit()}
          className="mt-3"
        />
      ) : null}
    </View>
  );
}
