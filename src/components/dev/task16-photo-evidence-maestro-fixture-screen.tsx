import {
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

export function Task16PhotoEvidenceMaestroFixtureScreen() {
  const [
    attached,
    setAttached,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState(
      false,
    );

  const [
    submitted,
    setSubmitted,
  ] =
    useState(
      false,
    );

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="px-5 pt-16 pb-16"
    >
      <Text className="text-xs font-semibold tracking-widest text-amber-400">
        DEVELOPMENT ONLY
      </Text>

      <Text className="mt-2 text-2xl font-bold text-white">
        TASK-16 Photo Evidence Fixture
      </Text>

      <View className="p-5 mt-5 rounded-2xl bg-slate-900">
        <Text className="text-lg font-semibold text-white">
          Finish kitchen
        </Text>

        <Text
          testID="task16-photo-evidence-label"
          className="mt-3 text-xs font-semibold text-slate-300"
        >
          Photo evidence
          <Text className="font-normal text-slate-500">
            {' '}
            (optional)
          </Text>
        </Text>

        {error ? (
          <View
            testID="task16-recoverable-error"
            className="p-3 mt-3 border rounded-xl border-red-900 bg-red-950"
          >
            <Text className="text-sm font-semibold text-red-300">
              Photo not attached
            </Text>

            <Text className="mt-1 text-xs leading-5 text-red-200">
              Photo upload failed.
            </Text>

            <Text className="mt-1 text-xs leading-5 text-red-200">
              You can try again or submit without a photo.
            </Text>
          </View>
        ) : null}

        {attached ? (
          <View className="mt-3">
            <View
              testID="task16-photo-preview"
              className="items-center justify-center w-full h-48 rounded-xl bg-slate-800"
            >
              <Text className="font-semibold text-slate-300">
                Photo attached
              </Text>
            </View>

            <Pressable
              testID="task16-remove-photo"
              accessibilityRole="button"
              accessibilityLabel="Remove chore evidence photo"
              onPress={() => {
                setAttached(
                  false,
                );

                setError(
                  false,
                );
              }}
              className="items-center px-4 py-3 mt-2 rounded-xl bg-slate-700"
            >
              <Text className="font-semibold text-white">
                Remove photo
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="flex-row mt-3">
              <View className="items-center flex-1 px-3 py-3 mr-2 rounded-xl bg-slate-700">
                <Text className="font-semibold text-white">
                  Take photo
                </Text>
              </View>

              <View className="items-center flex-1 px-3 py-3 rounded-xl bg-slate-700">
                <Text className="font-semibold text-white">
                  Choose photo
                </Text>
              </View>
            </View>

            <Pressable
              testID="task16-simulate-failure"
              accessibilityRole="button"
              accessibilityLabel="Simulate photo upload failure"
              onPress={() => {
                setAttached(
                  false,
                );

                setError(
                  true,
                );
              }}
              className="items-center px-4 py-3 mt-3 rounded-xl bg-slate-800"
            >
              <Text className="font-semibold text-slate-300">
                Simulate upload failure
              </Text>
            </Pressable>

            <Pressable
              testID="task16-attach-photo"
              accessibilityRole="button"
              accessibilityLabel="Attach fixture photo"
              onPress={() => {
                setAttached(
                  true,
                );

                setError(
                  false,
                );

                setSubmitted(
                  false,
                );
              }}
              className="items-center px-4 py-3 mt-2 rounded-xl bg-slate-700"
            >
              <Text className="font-semibold text-white">
                Attach fixture photo
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          testID="task16-submit"
          accessibilityRole="button"
          accessibilityLabel="Submit chore for review"
          onPress={() =>
            setSubmitted(
              true,
            )
          }
          className="items-center px-4 py-3 mt-3 bg-white rounded-xl"
        >
          <Text className="font-semibold text-slate-950">
            Submit for review
          </Text>
        </Pressable>

        {submitted ? (
          <Text
            testID="task16-submitted-result"
            className="mt-3 text-sm font-semibold text-emerald-300"
          >
            {attached
              ? 'Submitted with photo'
              : 'Submitted without photo'}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
