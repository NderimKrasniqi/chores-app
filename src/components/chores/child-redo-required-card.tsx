import {
  Pressable,
  Text,
  View,
} from 'react-native';

import type {
  Id,
} from '../../../convex/_generated/dataModel';
import {
  ChildSubmissionActions,
} from '../evidence/child-submission-actions';

function formatDeadline(
  timestamp: number,
  timezone: string,
) {
  try {
    return new Intl.DateTimeFormat(
      'en-SE',
      {
        timeZone:
          timezone,

        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    ).format(
      new Date(
        timestamp,
      ),
    );
  } catch {
    return new Date(
      timestamp,
    ).toLocaleString();
  }
}

export function ChildRedoRequiredCard({
  occurrenceId,
  title,
  description,
  valueSek,
  deadlineAt,
  timezone,
  claimRemainsActive,
  canSubmit,
  submitting,
  submitTestID,
  onSubmit,
}: {
  /*
   * Optional only so the older deterministic
   * Maestro fixture can keep rendering this
   * reusable component without a real DB ID.
   *
   * Production chore screens always provide it.
   */
  occurrenceId?:
    Id<'choreOccurrences'>;

  title:
    string;

  description?:
    string;

  valueSek:
    number;

  deadlineAt:
    number;

  timezone:
    string;

  claimRemainsActive:
    boolean;

  canSubmit:
    boolean;

  submitting:
    boolean;

  submitTestID?:
    string;

  onSubmit: (
    evidenceUploadIntentId?:
      Id<'submissionEvidenceUploads'>,
  ) => Promise<void>;
}) {
  return (
    <View className="p-5 mt-4 border rounded-2xl border-amber-900 bg-slate-900">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold tracking-wider uppercase text-amber-400">
            Redo required
          </Text>

          <Text className="mt-1 text-lg font-semibold text-white">
            {title}
          </Text>

          {description ? (
            <Text className="mt-2 text-sm leading-5 text-slate-400">
              {description}
            </Text>
          ) : null}
        </View>

        <Text className="text-lg font-bold text-green-400">
          {valueSek} kr
        </Text>
      </View>

      <View className="p-3 mt-4 border rounded-xl border-amber-900 bg-amber-950">
        <Text className="text-sm font-semibold text-amber-300">
          Redo deadline
        </Text>

        <Text className="mt-1 text-sm text-amber-100">
          {formatDeadline(
            deadlineAt,
            timezone,
          )}
        </Text>
      </View>

      <Text className="mt-4 text-sm leading-5 text-slate-400">
        Your parent asked for one
        correction. Finish the work and
        submit it again before the Redo
        deadline.
      </Text>

      {claimRemainsActive ? (
        <Text className="mt-2 text-xs leading-5 text-slate-500">
          This Claim remains active and
          still uses your active Claim slot
          until the Redo is resolved.
        </Text>
      ) : null}

      {canSubmit &&
      occurrenceId ? (
        <ChildSubmissionActions
          occurrenceId={
            occurrenceId
          }
          attemptNumber={
            2
          }
          disabled={
            submitting
          }
          submitting={
            submitting
          }
          submitTestID={
            submitTestID
          }
          submitLabel="Submit Redo for review"
          submittingLabel="Submitting Redo…"
          onSubmit={
            onSubmit
          }
        />
      ) : canSubmit ? (
        /*
         * Dev/Maestro fixture fallback.
         * No real occurrence exists there,
         * so evidence upload is intentionally
         * unavailable.
         */
        <Pressable
          testID={
            submitTestID
          }
          accessibilityRole="button"
          accessibilityLabel={`Submit Redo for ${title}`}
          disabled={
            submitting
          }
          onPress={() =>
            void onSubmit()
          }
          className={
            submitting
              ? 'items-center px-4 py-3 mt-4 rounded-xl bg-slate-800'
              : 'items-center px-4 py-3 mt-4 bg-white rounded-xl'
          }
        >
          <Text
            className={
              submitting
                ? 'font-semibold text-slate-500'
                : 'font-semibold text-slate-950'
            }
          >
            {submitting
              ? 'Submitting Redo…'
              : 'Submit Redo for review'}
          </Text>
        </Pressable>
      ) : (
        <View className="p-3 mt-4 rounded-xl bg-slate-950">
          <Text className="text-xs leading-5 text-slate-500">
            Redo submission is no longer
            available. The deadline may
            have passed or a Redo
            submission is already recorded.
          </Text>
        </View>
      )}
    </View>
  );
}
