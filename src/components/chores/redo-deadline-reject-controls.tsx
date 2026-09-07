import {
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

function isValidDateShape(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function isValidTimeShape(
  value: string,
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value,
  );
}

export function RedoDeadlineRejectControls({
  disabled,
  rejecting,
  title,
  childDisplayName,
  onReject,
}: {
  disabled:
    boolean;

  rejecting:
    boolean;

  title:
    string;

  childDisplayName:
    string;

  onReject: (
    redoDeadlineLocalDate:
      string,
    redoDeadlineLocalTime:
      string,
  ) => Promise<void>;
}) {
  const [
    deadlineDate,
    setDeadlineDate,
  ] =
    useState(
      '',
    );

  const [
    deadlineTime,
    setDeadlineTime,
  ] =
    useState(
      '',
    );

  const validShape =
    useMemo(
      () =>
        isValidDateShape(
          deadlineDate.trim(),
        ) &&
        isValidTimeShape(
          deadlineTime.trim(),
        ),
      [
        deadlineDate,
        deadlineTime,
      ],
    );

  const actionDisabled =
    disabled ||
    !validShape;

  return (
    <View className="pt-4 mt-4 border-t border-slate-800">
      <Text className="text-sm font-semibold text-amber-300">
        Needs correction?
      </Text>

      <Text className="mt-1 text-xs leading-5 text-slate-500">
        Rejecting the first submission
        gives this Child exactly one Redo.
        Set the new Household-local
        deadline below.
      </Text>

      <Text className="mt-3 text-xs font-semibold text-slate-400">
        Redo date
      </Text>

      <TextInput
        testID="redo-deadline-date-input"
        accessibilityLabel={`Redo deadline date for ${title}`}
        autoCapitalize="none"
        autoCorrect={
          false
        }
        editable={
          !disabled
        }
        onChangeText={
          setDeadlineDate
        }
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#64748b"
        value={
          deadlineDate
        }
        className="px-3 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
      />

      <Text className="mt-3 text-xs font-semibold text-slate-400">
        Redo time
      </Text>

      <TextInput
        testID="redo-deadline-time-input"
        accessibilityLabel={`Redo deadline time for ${title}`}
        autoCapitalize="none"
        autoCorrect={
          false
        }
        editable={
          !disabled
        }
        onChangeText={
          setDeadlineTime
        }
        placeholder="HH:mm"
        placeholderTextColor="#64748b"
        value={
          deadlineTime
        }
        className="px-3 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
      />

      {!validShape &&
      (
        deadlineDate.length >
          0 ||
        deadlineTime.length >
          0
      ) ? (
        <Text className="mt-2 text-xs leading-5 text-amber-400">
          Use YYYY-MM-DD and 24-hour
          HH:mm.
        </Text>
      ) : null}

      <Pressable
        testID="redo-reject-button"
        accessibilityRole="button"
        accessibilityLabel={`Reject ${title} for ${childDisplayName} and require redo`}
        disabled={
          actionDisabled
        }
        onPress={() =>
          void onReject(
            deadlineDate.trim(),
            deadlineTime.trim(),
          )
        }
        className={
          actionDisabled
            ? 'items-center px-4 py-3 mt-4 rounded-xl bg-slate-800'
            : 'items-center px-4 py-3 mt-4 rounded-xl bg-amber-800'
        }
      >
        <Text
          className={
            actionDisabled
              ? 'font-semibold text-slate-500'
              : 'font-semibold text-white'
          }
        >
          {rejecting
            ? 'Rejecting…'
            : 'Reject and require Redo'}
        </Text>
      </Pressable>
    </View>
  );
}
