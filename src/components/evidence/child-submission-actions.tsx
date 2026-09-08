import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  useState,
} from 'react';
import {
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  api,
} from '../../../convex/_generated/api';
import type {
  Id,
} from '../../../convex/_generated/dataModel';

type Props = {
  occurrenceId:
    Id<'choreOccurrences'>;

  attemptNumber:
    1 | 2;

  disabled:
    boolean;

  submitting:
    boolean;

  submitLabel:
    string;

  submittingLabel:
    string;

  submitTestID?:
    string;

  onSubmit: (
    evidenceUploadIntentId?:
      Id<'submissionEvidenceUploads'>,
  ) => Promise<void>;
};

type AttachedEvidence = {
  uploadIntentId:
    Id<'submissionEvidenceUploads'>;

  previewUri:
    string;
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
}: Props) {
  const generateUploadUrl =
    useServerConfirmedMutation(
      api
        .submissionEvidence
        .generateUploadUrl,
    );

  const registerUpload =
    useServerConfirmedMutation(
      api
        .submissionEvidence
        .registerUpload,
    );

  const discardUpload =
    useServerConfirmedMutation(
      api
        .submissionEvidence
        .discardUpload,
    );

  const [
    evidence,
    setEvidence,
  ] =
    useState<
      AttachedEvidence |
        null
    >(null);

  const [
    uploading,
    setUploading,
  ] =
    useState(
      false,
    );

  const busy =
    disabled ||
    submitting ||
    uploading;

  async function uploadImage(
    sourceUri: string,
  ) {
    setUploading(
      true,
    );

    let createdIntentId:
      | Id<'submissionEvidenceUploads'>
      | null =
      null;

    try {
      const context =
        ImageManipulator
          .ImageManipulator
          .manipulate(
            sourceUri,
          );

      context.resize({
        width:
          1600,

        height:
          null,
      });

      const rendered =
        await context
          .renderAsync();

      const prepared =
        await rendered
          .saveAsync({
            compress:
              0.75,

            format:
              ImageManipulator
                .SaveFormat
                .JPEG,
          });

      const upload =
        await generateUploadUrl({
          occurrenceId,

          attemptNumber,
        });

      createdIntentId =
        upload
          .uploadIntentId;

      const fileResponse =
        await fetch(
          prepared.uri,
        );

      if (
        !fileResponse.ok
      ) {
        throw new Error(
          'Could not prepare the selected photo.',
        );
      }

      const blob =
        await fileResponse
          .blob();

      const uploadResponse =
        await fetch(
          upload.uploadUrl,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'image/jpeg',
            },

            body:
              blob,
          },
        );

      if (
        !uploadResponse.ok
      ) {
        throw new Error(
          'Photo upload failed.',
        );
      }

      const payload:
        unknown =
        await uploadResponse
          .json();

      if (
        !payload ||
        typeof payload !==
          'object' ||
        !(
          'storageId' in
          payload
        ) ||
        typeof (
          payload as {
            storageId?: unknown;
          }
        ).storageId !==
          'string'
      ) {
        throw new Error(
          'Photo upload returned an invalid result.',
        );
      }

      const storageId =
        (
          payload as {
            storageId:
              string;
          }
        ).storageId as
          Id<'_storage'>;

      const registration =
        await registerUpload({
          uploadIntentId:
            upload
              .uploadIntentId,

          storageId,
        });

      if (
        !registration
          .accepted
      ) {
        throw new Error(
          registration.reason ??
            'Photo could not be attached.',
        );
      }

      setEvidence({
        uploadIntentId:
          upload
            .uploadIntentId,

        previewUri:
          prepared.uri,
      });

      createdIntentId =
        null;
    } catch (
      error
    ) {
      if (
        createdIntentId
      ) {
        try {
          await discardUpload({
            uploadIntentId:
              createdIntentId,
          });
        } catch {
          // Best-effort cleanup only.
        }
      }

      Alert.alert(
        'Photo not attached',
        `${
          error instanceof
            Error
            ? error.message
            : 'The photo could not be uploaded.'
        }\n\nYou can try again or submit without a photo.`,
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function choosePhoto() {
    if (busy) {
      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes:
            [
              'images',
            ],

          allowsEditing:
            false,

          quality:
            1,
        });

    if (
      result.canceled
    ) {
      return;
    }

    const asset =
      result.assets[0];

    if (!asset) {
      return;
    }

    await uploadImage(
      asset.uri,
    );
  }

  async function takePhoto() {
    if (busy) {
      return;
    }

    const permission =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (
      !permission.granted
    ) {
      Alert.alert(
        'Camera permission required',
        'Camera access is needed to take chore evidence photos.',
      );

      return;
    }

    const result =
      await ImagePicker
        .launchCameraAsync({
          mediaTypes:
            [
              'images',
            ],

          allowsEditing:
            false,

          quality:
            1,
        });

    if (
      result.canceled
    ) {
      return;
    }

    const asset =
      result.assets[0];

    if (!asset) {
      return;
    }

    await uploadImage(
      asset.uri,
    );
  }

  async function removePhoto() {
    if (
      !evidence ||
      busy
    ) {
      return;
    }

    setUploading(
      true,
    );

    try {
      await discardUpload({
        uploadIntentId:
          evidence
            .uploadIntentId,
      });

      setEvidence(
        null,
      );
    } catch (
      error
    ) {
      Alert.alert(
        'Could not remove photo',
        error instanceof
          Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function submit() {
    if (busy) {
      return;
    }

    await onSubmit(
      evidence
        ?.uploadIntentId,
    );

    /*
     * The backend consumed this intent
     * transactionally with the submission.
     */
    setEvidence(
      null,
    );
  }

  return (
    <View className="mt-3">
      <Text className="text-xs font-semibold text-slate-300">
        Photo evidence
        <Text className="font-normal text-slate-500">
          {' '}
          (optional)
        </Text>
      </Text>

      {evidence ? (
        <View className="mt-3">
          <Image
            source={{
              uri:
                evidence
                  .previewUri,
            }}
            className="w-full h-48 rounded-xl bg-slate-800"
            resizeMode="cover"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove chore evidence photo"
            disabled={
              busy
            }
            onPress={() =>
              void removePhoto()
            }
            className={
              busy
                ? 'items-center px-4 py-3 mt-2 rounded-xl bg-slate-800'
                : 'items-center px-4 py-3 mt-2 rounded-xl bg-slate-700'
            }
          >
            <Text className="font-semibold text-white">
              Remove photo
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row mt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take chore evidence photo"
            disabled={
              busy
            }
            onPress={() =>
              void takePhoto()
            }
            className={
              busy
                ? 'items-center flex-1 px-3 py-3 mr-2 rounded-xl bg-slate-800'
                : 'items-center flex-1 px-3 py-3 mr-2 rounded-xl bg-slate-700'
            }
          >
            <Text className="font-semibold text-white">
              Take photo
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose chore evidence photo"
            disabled={
              busy
            }
            onPress={() =>
              void choosePhoto()
            }
            className={
              busy
                ? 'items-center flex-1 px-3 py-3 rounded-xl bg-slate-800'
                : 'items-center flex-1 px-3 py-3 rounded-xl bg-slate-700'
            }
          >
            <Text className="font-semibold text-white">
              Choose photo
            </Text>
          </Pressable>
        </View>
      )}

      {uploading ? (
        <Text className="mt-2 text-xs text-slate-500">
          Preparing photo…
        </Text>
      ) : null}

      <Pressable
        testID={
          submitTestID
        }
        accessibilityRole="button"
        accessibilityLabel={
          submitLabel
        }
        disabled={
          busy
        }
        onPress={() =>
          void submit()
        }
        className={
          busy
            ? 'items-center px-4 py-3 mt-3 rounded-xl bg-slate-800'
            : 'items-center px-4 py-3 mt-3 bg-white rounded-xl'
        }
      >
        <Text
          className={
            busy
              ? 'font-semibold text-slate-500'
              : 'font-semibold text-slate-950'
          }
        >
          {submitting
            ? submittingLabel
            : submitLabel}
        </Text>
      </Pressable>
    </View>
  );
}
