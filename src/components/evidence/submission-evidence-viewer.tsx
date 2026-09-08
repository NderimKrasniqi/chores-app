import { useServerConfirmedMutation } from '@/hooks/use-server-confirmed-mutation';

import {
  useState,
} from 'react';
import {
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

const siteUrl = (() => {
  const value =
    process.env
      .EXPO_PUBLIC_CONVEX_SITE_URL;

  if (!value) {
    throw new Error(
      'Missing EXPO_PUBLIC_CONVEX_SITE_URL',
    );
  }

  return value;
})();

export function SubmissionEvidenceViewer({
  submissionId,
}: {
  submissionId:
    Id<'choreSubmissions'>;
}) {
  const createViewToken =
    useServerConfirmedMutation(
      api
        .submissionEvidence
        .createViewToken,
    );

  const [
    imageUrl,
    setImageUrl,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  async function viewPhoto() {
    if (loading) {
      return;
    }

    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const result =
        await createViewToken({
          submissionId,
        });

      setImageUrl(
        siteUrl.replace(
          /\/+$/,
          '',
        ) +
          result.path,
      );
    } catch (
      value
    ) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Could not load photo evidence.',
      );
    } finally {
      setLoading(
        false,
      );
    }
  }

  return (
    <View className="p-3 mt-4 border rounded-xl border-slate-800 bg-slate-900">
      <Text className="text-xs font-semibold text-slate-300">
        Photo evidence
      </Text>

      {imageUrl ? (
        <>
          <Image
            source={{
              uri:
                imageUrl,
            }}
            className="w-full h-56 mt-3 rounded-xl bg-slate-800"
            resizeMode="cover"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hide chore evidence photo"
            onPress={() =>
              setImageUrl(
                null,
              )
            }
            className="items-center px-4 py-3 mt-2 rounded-xl bg-slate-800"
          >
            <Text className="font-semibold text-white">
              Hide photo
            </Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View chore evidence photo"
          disabled={
            loading
          }
          onPress={() =>
            void viewPhoto()
          }
          className={
            loading
              ? 'items-center px-4 py-3 mt-2 rounded-xl bg-slate-800'
              : 'items-center px-4 py-3 mt-2 rounded-xl bg-slate-700'
          }
        >
          <Text className="font-semibold text-white">
            {loading
              ? 'Loading photo…'
              : 'View photo'}
          </Text>
        </Pressable>
      )}

      {error ? (
        <Text className="mt-2 text-xs leading-5 text-red-300">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
