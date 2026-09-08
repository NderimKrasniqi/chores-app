import {
  useAction,
} from 'convex/react';
import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type Task06SmokeTestCardProps = {
  householdId:
    Id<'households'>;

  children: Array<{
    childId:
      Id<'children'>;

    displayName:
      string;
  }>;
};

type TestResult = {
  label: string;
  passed: boolean;
  detail?: string;
};

export function Task06SmokeTestCard({
  householdId,
  children,
}: Task06SmokeTestCardProps) {
  const runTask06 =
    useAction(
      api.dev.smoke.task06.choreDefinitions
        .run,
    );

  const [
    running,
    setRunning,
  ] = useState(false);

  const [
    results,
    setResults,
  ] = useState<
    TestResult[]
  >([]);

  const [
    runError,
    setRunError,
  ] = useState<
    string | null
  >(null);

  async function runTests() {
    const child =
      children[0];

    if (!child) {
      setResults([
        {
          label:
            'Household has a Child',
          passed: false,
          detail:
            'Create at least one Child before running TASK-06 tests.',
        },
      ]);

      return;
    }

    setRunning(true);
    setResults([]);
    setRunError(null);

    try {
      const nextResults =
        await runTask06({
          householdId,

          childId:
            child.childId,
        });

      setResults(
        nextResults,
      );
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : 'Could not run TASK-06 smoke tests.',
      );
    } finally {
      setRunning(false);
    }
  }

  const passedCount =
    results.filter(
      (result) =>
        result.passed,
    ).length;

  return (
    <View className="pt-5 mt-6 border-t border-slate-800">
      <Text className="font-semibold text-amber-400">
        Developer tests
      </Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        Automated TASK-06
        backend constraint checks.
        Test definitions are
        archived automatically.
      </Text>

      <Pressable
        className="px-4 py-3 mt-4 border rounded-xl border-amber-700"
        disabled={running}
        onPress={() =>
          void runTests()
        }
      >
        <Text className="font-semibold text-center text-amber-400">
          {running
            ? 'Running tests...'
            : 'Run TASK-06 smoke tests'}
        </Text>
      </Pressable>

      {runError && (
        <Text className="mt-4 text-red-400">
          {runError}
        </Text>
      )}

      {results.length >
        0 && (
        <View className="mt-4">
          <Text className="font-semibold text-white">
            {passedCount}/
            {results.length}{' '}
            passed
          </Text>

          {results.map(
            (
              result,
              index,
            ) => (
              <View
                key={`${result.label}-${index}`}
                className="mt-3"
              >
                <Text
                  className={
                    result.passed
                      ? 'font-semibold text-green-400'
                      : 'font-semibold text-red-400'
                  }
                >
                  {result.passed
                    ? '✓'
                    : '✕'}{' '}
                  {result.label}
                </Text>

                {!result.passed &&
                  result.detail && (
                    <Text className="mt-1 text-xs leading-5 text-slate-500">
                      {
                        result.detail
                      }
                    </Text>
                  )}
              </View>
            ),
          )}
        </View>
      )}
    </View>
  );
}
