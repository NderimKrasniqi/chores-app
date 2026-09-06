import {
  useMutation,
  useQuery,
} from 'convex/react';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type ChoreKind =
  | 'personal'
  | 'claimable';

type RecurrenceKind =
  | 'one_off'
  | 'daily'
  | 'weekly'
  | 'monthly';

type Recurrence =
  | {
      kind: 'one_off';
      scheduledDate: string;
    }
  | {
      kind: 'daily';
      startDate: string;
      interval: number;
    }
  | {
      kind: 'weekly';
      startDate: string;
      interval: number;
      weekdays: Weekday[];
    }
  | {
      kind: 'monthly';
      startDate: string;
      interval: number;
      dayOfMonth: number;
    };

type ChildSummary = {
  childId: Id<'children'>;
  displayName: string;
};

type DefinitionSummary = {
  choreDefinitionId:
    Id<'choreDefinitions'>;

  kind: ChoreKind;

  title: string;

  description?:
    string;

  valueSek: number;

  recurrence:
    Recurrence;

  availabilityLocalTime?:
    string;

  deadlineLocalTime:
    string;

  deadlineDayOffset:
    number;

  personalChildId?:
    Id<'children'>;

  eligibleChildIds?:
    Id<'children'>[];

  isUnlockChore:
    boolean;

  createdAt: number;
  updatedAt: number;
};

type ChoreDefinitionsCardProps = {
  householdId:
    Id<'households'>;

  children:
    ChildSummary[];
};

const weekdays:
  Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function formatWeekday(
  weekday: Weekday,
) {
  return (
    weekday
      .charAt(0)
      .toUpperCase() +
    weekday.slice(1)
  );
}

function OptionButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={
        active
          ? 'px-3 py-3 mr-2 mt-2 border rounded-xl border-white bg-white'
          : 'px-3 py-3 mr-2 mt-2 border rounded-xl border-slate-700'
      }
      onPress={onPress}
    >
      <Text
        className={
          active
            ? 'font-semibold text-slate-950'
            : 'font-semibold text-white'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatRecurrence(
  recurrence:
    Recurrence,
) {
  switch (
    recurrence.kind
  ) {
    case 'one_off':
      return `One-off · ${recurrence.scheduledDate}`;

    case 'daily':
      return recurrence.interval ===
        1
        ? `Daily · from ${recurrence.startDate}`
        : `Every ${recurrence.interval} days · from ${recurrence.startDate}`;

    case 'weekly':
      return `Every ${
        recurrence.interval ===
        1
          ? ''
          : `${recurrence.interval} `
      }week${
        recurrence.interval ===
        1
          ? ''
          : 's'
      } · ${recurrence.weekdays
        .map(
          formatWeekday,
        )
        .join(', ')}`;

    case 'monthly':
      return `Every ${
        recurrence.interval ===
        1
          ? ''
          : `${recurrence.interval} `
      }month${
        recurrence.interval ===
        1
          ? ''
          : 's'
      } · day ${recurrence.dayOfMonth}`;
  }
}

export function ChoreDefinitionsCard({
  householdId,
  children,
}: ChoreDefinitionsCardProps) {
  const definitions =
    useQuery(
      api
        .choreDefinitions
        .listActiveForHousehold,
      {
        householdId,
      },
    );

  const createDefinition =
    useMutation(
      api
        .choreDefinitions
        .create,
    );

  const updateDefinition =
    useMutation(
      api
        .choreDefinitions
        .update,
    );

  const archiveDefinition =
    useMutation(
      api
        .choreDefinitions
        .archive,
    );

  const [
    showingForm,
    setShowingForm,
  ] = useState(false);

  const [
    editingDefinitionId,
    setEditingDefinitionId,
  ] = useState<
    Id<'choreDefinitions'> |
      undefined
  >(undefined);

  const [
    kind,
    setKind,
  ] =
    useState<ChoreKind>(
      'personal',
    );

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    valueSek,
    setValueSek,
  ] = useState('');

  const [
    recurrenceKind,
    setRecurrenceKind,
  ] =
    useState<RecurrenceKind>(
      'one_off',
    );

  const [
    scheduledDate,
    setScheduledDate,
  ] = useState('');

  const [
    startDate,
    setStartDate,
  ] = useState('');

  const [
    interval,
    setInterval,
  ] = useState('1');

  const [
    selectedWeekdays,
    setSelectedWeekdays,
  ] = useState<
    Weekday[]
  >([]);

  const [
    dayOfMonth,
    setDayOfMonth,
  ] = useState('1');

  const [
    availabilityLocalTime,
    setAvailabilityLocalTime,
  ] = useState('');

  const [
    deadlineLocalTime,
    setDeadlineLocalTime,
  ] = useState('18:00');

  const [
    deadlineDayOffset,
    setDeadlineDayOffset,
  ] = useState('0');

  const [
    personalChildId,
    setPersonalChildId,
  ] = useState<
    Id<'children'> |
      undefined
  >(
    children[0]?.childId,
  );

  const [
    restrictEligibility,
    setRestrictEligibility,
  ] = useState(false);

  const [
    eligibleChildIds,
    setEligibleChildIds,
  ] = useState<
    Id<'children'>[]
  >([]);

  const [
    isUnlockChore,
    setIsUnlockChore,
  ] = useState(false);

  const [
    working,
    setWorking,
  ] = useState(false);

  const [
    archivingId,
    setArchivingId,
  ] = useState<
    Id<'choreDefinitions'> |
      undefined
  >(undefined);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  function resetForm() {
    setEditingDefinitionId(
      undefined,
    );

    setKind('personal');

    setTitle('');
    setDescription('');
    setValueSek('');

    setRecurrenceKind(
      'one_off',
    );

    setScheduledDate('');
    setStartDate('');
    setInterval('1');

    setSelectedWeekdays(
      [],
    );

    setDayOfMonth('1');

    setAvailabilityLocalTime(
      '',
    );

    setDeadlineLocalTime(
      '18:00',
    );

    setDeadlineDayOffset(
      '0',
    );

    setPersonalChildId(
      children[0]?.childId,
    );

    setRestrictEligibility(
      false,
    );

    setEligibleChildIds(
      [],
    );

    setIsUnlockChore(
      false,
    );

    setErrorMessage(null);
  }

  function startNewChore() {
    resetForm();

    setShowingForm(
      true,
    );
  }

  function startEditing(
    definition:
      DefinitionSummary,
  ) {
    setEditingDefinitionId(
      definition
        .choreDefinitionId,
    );

    setKind(
      definition.kind,
    );

    setTitle(
      definition.title,
    );

    setDescription(
      definition.description ??
        '',
    );

    setValueSek(
      definition.valueSek.toString(),
    );

    setRecurrenceKind(
      definition
        .recurrence
        .kind,
    );

    setScheduledDate('');
    setStartDate('');
    setInterval('1');
    setSelectedWeekdays(
      [],
    );
    setDayOfMonth('1');

    switch (
      definition
        .recurrence
        .kind
    ) {
      case 'one_off':
        setScheduledDate(
          definition
            .recurrence
            .scheduledDate,
        );
        break;

      case 'daily':
        setStartDate(
          definition
            .recurrence
            .startDate,
        );

        setInterval(
          definition
            .recurrence
            .interval
            .toString(),
        );
        break;

      case 'weekly':
        setStartDate(
          definition
            .recurrence
            .startDate,
        );

        setInterval(
          definition
            .recurrence
            .interval
            .toString(),
        );

        setSelectedWeekdays(
          definition
            .recurrence
            .weekdays,
        );
        break;

      case 'monthly':
        setStartDate(
          definition
            .recurrence
            .startDate,
        );

        setInterval(
          definition
            .recurrence
            .interval
            .toString(),
        );

        setDayOfMonth(
          definition
            .recurrence
            .dayOfMonth
            .toString(),
        );
        break;
    }

    setAvailabilityLocalTime(
      definition
        .availabilityLocalTime ??
        '',
    );

    setDeadlineLocalTime(
      definition
        .deadlineLocalTime,
    );

    setDeadlineDayOffset(
      definition
        .deadlineDayOffset
        .toString(),
    );

    setPersonalChildId(
      definition.kind ===
        'personal'
        ? definition
            .personalChildId
        : children[0]
            ?.childId,
    );

    setRestrictEligibility(
      definition.kind ===
        'claimable' &&
        definition
          .eligibleChildIds !==
          undefined,
    );

    setEligibleChildIds(
      definition
        .eligibleChildIds ??
        [],
    );

    setIsUnlockChore(
      definition
        .isUnlockChore,
    );

    setErrorMessage(null);

    setShowingForm(
      true,
    );
  }

  function closeForm() {
    resetForm();

    setShowingForm(
      false,
    );
  }

  function handleKindChange(
    nextKind:
      ChoreKind,
  ) {
    setKind(nextKind);

    setErrorMessage(
      null,
    );

    if (
      nextKind ===
      'claimable'
    ) {
      setIsUnlockChore(
        false,
      );
    }
  }

  function handleRecurrenceChange(
    nextKind:
      RecurrenceKind,
  ) {
    setRecurrenceKind(
      nextKind,
    );

    setErrorMessage(
      null,
    );

    if (
      nextKind ===
      'one_off'
    ) {
      setIsUnlockChore(
        false,
      );
    }
  }

  function toggleWeekday(
    weekday:
      Weekday,
  ) {
    setSelectedWeekdays(
      (current) =>
        current.includes(
          weekday,
        )
          ? current.filter(
              (item) =>
                item !==
                weekday,
            )
          : [
              ...current,
              weekday,
            ],
    );
  }

  function toggleEligibleChild(
    childId:
      Id<'children'>,
  ) {
    setEligibleChildIds(
      (current) =>
        current.includes(
          childId,
        )
          ? current.filter(
              (item) =>
                item !==
                childId,
            )
          : [
              ...current,
              childId,
            ],
    );
  }

  function buildRecurrence():
    Recurrence {
    switch (
      recurrenceKind
    ) {
      case 'one_off':
        return {
          kind:
            'one_off',

          scheduledDate:
            scheduledDate.trim(),
        };

      case 'daily':
        return {
          kind:
            'daily',

          startDate:
            startDate.trim(),

          interval:
            Number(
              interval,
            ),
        };

      case 'weekly':
        return {
          kind:
            'weekly',

          startDate:
            startDate.trim(),

          interval:
            Number(
              interval,
            ),

          weekdays:
            selectedWeekdays,
        };

      case 'monthly':
        return {
          kind:
            'monthly',

          startDate:
            startDate.trim(),

          interval:
            Number(
              interval,
            ),

          dayOfMonth:
            Number(
              dayOfMonth,
            ),
        };
    }
  }

  function buildDefinitionInput() {
    const recurrence =
      buildRecurrence();

    return {
      kind,

      title,

      ...(description.trim()
        ? {
            description,
          }
        : {}),

      valueSek:
        Number(
          valueSek,
        ),

      recurrence,

      ...(availabilityLocalTime.trim()
        ? {
            availabilityLocalTime,
          }
        : {}),

      deadlineLocalTime,

      deadlineDayOffset:
        Number(
          deadlineDayOffset,
        ),

      ...(kind ===
        'personal' &&
      personalChildId
        ? {
            personalChildId,
          }
        : {}),

      ...(kind ===
        'claimable' &&
      restrictEligibility
        ? {
            eligibleChildIds,
          }
        : {}),

      isUnlockChore:
        kind ===
          'personal' &&
        recurrenceKind !==
          'one_off'
          ? isUnlockChore
          : false,
    };
  }

  async function handleSave() {
    setWorking(true);
    setErrorMessage(
      null,
    );

    try {
      const input =
        buildDefinitionInput();

      if (
        editingDefinitionId
      ) {
        await updateDefinition({
          choreDefinitionId:
            editingDefinitionId,

          ...input,
        });
      } else {
        await createDefinition({
          householdId,

          ...input,
        });
      }

      closeForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingDefinitionId
            ? 'Could not update chore.'
            : 'Could not create chore.',
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleArchive(
    definition:
      DefinitionSummary,
  ) {
    setArchivingId(
      definition
        .choreDefinitionId,
    );

    try {
      await archiveDefinition({
        choreDefinitionId:
          definition
            .choreDefinitionId,
      });

      if (
        editingDefinitionId ===
        definition
          .choreDefinitionId
      ) {
        closeForm();
      }
    } catch (error) {
      Alert.alert(
        'Could not archive chore',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setArchivingId(
        undefined,
      );
    }
  }

  function confirmArchive(
    definition:
      DefinitionSummary,
  ) {
    Alert.alert(
      'Archive chore?',
      `"${definition.title}" will stop generating future occurrences. Existing chore history will remain unchanged.`,
      [
        {
          text:
            'Cancel',

          style:
            'cancel',
        },
        {
          text:
            'Archive',

          style:
            'destructive',

          onPress: () =>
            void handleArchive(
              definition,
            ),
        },
      ],
    );
  }

  function getChildName(
    childId:
      Id<'children'>,
  ) {
    return (
      children.find(
        (child) =>
          child.childId ===
          childId,
      )?.displayName ??
      'Unknown Child'
    );
  }

  return (
    <View className="pt-5 mt-6 border-t border-slate-800">
      <Text className="font-semibold text-white">
        Chores
      </Text>

      <Text className="mt-1 text-sm leading-5 text-slate-500">
        Configure paid Personal
        and Claimable chores for
        this household.
      </Text>

      {!showingForm && (
        <Pressable
          className="px-4 py-3 mt-4 bg-white rounded-xl"
          onPress={
            startNewChore
          }
        >
          <Text className="font-semibold text-center text-slate-950">
            Add chore
          </Text>
        </Pressable>
      )}

      {showingForm && (
        <View className="p-4 mt-4 border rounded-xl border-slate-700 bg-slate-950">
          <Text className="text-lg font-semibold text-white">
            {editingDefinitionId
              ? 'Edit chore'
              : 'New chore'}
          </Text>

          <Text className="mt-5 text-sm font-semibold text-white">
            Type
          </Text>

          <View className="flex-row flex-wrap">
            <OptionButton
              label="Personal"
              active={
                kind ===
                'personal'
              }
              onPress={() =>
                handleKindChange(
                  'personal',
                )
              }
            />

            <OptionButton
              label="Claimable"
              active={
                kind ===
                'claimable'
              }
              onPress={() =>
                handleKindChange(
                  'claimable',
                )
              }
            />
          </View>

          <Text className="mt-5 text-sm font-semibold text-white">
            Title
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="Clean your room"
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={
              setTitle
            }
          />

          <Text className="mt-4 text-sm font-semibold text-white">
            Description
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="Optional instructions"
            placeholderTextColor="#64748b"
            value={
              description
            }
            onChangeText={
              setDescription
            }
            multiline
          />

          <Text className="mt-4 text-sm font-semibold text-white">
            Value in SEK
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="50"
            placeholderTextColor="#64748b"
            value={valueSek}
            onChangeText={
              setValueSek
            }
            keyboardType="number-pad"
          />

          {kind ===
            'personal' && (
            <>
              <Text className="mt-5 text-sm font-semibold text-white">
                Child
              </Text>

              <View className="flex-row flex-wrap">
                {children.map(
                  (child) => (
                    <OptionButton
                      key={
                        child.childId
                      }
                      label={
                        child.displayName
                      }
                      active={
                        personalChildId ===
                        child.childId
                      }
                      onPress={() =>
                        setPersonalChildId(
                          child.childId,
                        )
                      }
                    />
                  ),
                )}
              </View>
            </>
          )}

          {kind ===
            'claimable' && (
            <>
              <Text className="mt-5 text-sm font-semibold text-white">
                Eligibility
              </Text>

              <View className="flex-row flex-wrap">
                <OptionButton
                  label="All Children"
                  active={
                    !restrictEligibility
                  }
                  onPress={() =>
                    setRestrictEligibility(
                      false,
                    )
                  }
                />

                <OptionButton
                  label="Selected Children"
                  active={
                    restrictEligibility
                  }
                  onPress={() =>
                    setRestrictEligibility(
                      true,
                    )
                  }
                />
              </View>

              {restrictEligibility && (
                <View className="flex-row flex-wrap mt-2">
                  {children.map(
                    (child) => (
                      <OptionButton
                        key={
                          child.childId
                        }
                        label={
                          child.displayName
                        }
                        active={eligibleChildIds.includes(
                          child.childId,
                        )}
                        onPress={() =>
                          toggleEligibleChild(
                            child.childId,
                          )
                        }
                      />
                    ),
                  )}
                </View>
              )}
            </>
          )}

          <Text className="mt-5 text-sm font-semibold text-white">
            Recurrence
          </Text>

          <View className="flex-row flex-wrap">
            <OptionButton
              label="One-off"
              active={
                recurrenceKind ===
                'one_off'
              }
              onPress={() =>
                handleRecurrenceChange(
                  'one_off',
                )
              }
            />

            <OptionButton
              label="Daily"
              active={
                recurrenceKind ===
                'daily'
              }
              onPress={() =>
                handleRecurrenceChange(
                  'daily',
                )
              }
            />

            <OptionButton
              label="Weekly"
              active={
                recurrenceKind ===
                'weekly'
              }
              onPress={() =>
                handleRecurrenceChange(
                  'weekly',
                )
              }
            />

            <OptionButton
              label="Monthly"
              active={
                recurrenceKind ===
                'monthly'
              }
              onPress={() =>
                handleRecurrenceChange(
                  'monthly',
                )
              }
            />
          </View>

          {recurrenceKind ===
            'one_off' ? (
            <>
              <Text className="mt-4 text-sm font-semibold text-white">
                Scheduled date
              </Text>

              <TextInput
                className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
                placeholder="2026-09-10"
                placeholderTextColor="#64748b"
                value={
                  scheduledDate
                }
                onChangeText={
                  setScheduledDate
                }
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <Text className="mt-4 text-sm font-semibold text-white">
                Start date
              </Text>

              <TextInput
                className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
                placeholder="2026-09-10"
                placeholderTextColor="#64748b"
                value={
                  startDate
                }
                onChangeText={
                  setStartDate
                }
                autoCapitalize="none"
              />

              <Text className="mt-4 text-sm font-semibold text-white">
                Repeat interval
              </Text>

              <TextInput
                className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
                placeholder="1"
                placeholderTextColor="#64748b"
                value={
                  interval
                }
                onChangeText={
                  setInterval
                }
                keyboardType="number-pad"
              />
            </>
          )}

          {recurrenceKind ===
            'weekly' && (
            <>
              <Text className="mt-4 text-sm font-semibold text-white">
                Weekdays
              </Text>

              <View className="flex-row flex-wrap">
                {weekdays.map(
                  (weekday) => (
                    <OptionButton
                      key={
                        weekday
                      }
                      label={formatWeekday(
                        weekday,
                      )}
                      active={selectedWeekdays.includes(
                        weekday,
                      )}
                      onPress={() =>
                        toggleWeekday(
                          weekday,
                        )
                      }
                    />
                  ),
                )}
              </View>
            </>
          )}

          {recurrenceKind ===
            'monthly' && (
            <>
              <Text className="mt-4 text-sm font-semibold text-white">
                Day of month
              </Text>

              <TextInput
                className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
                placeholder="1"
                placeholderTextColor="#64748b"
                value={
                  dayOfMonth
                }
                onChangeText={
                  setDayOfMonth
                }
                keyboardType="number-pad"
              />
            </>
          )}

          {kind ===
            'personal' &&
            recurrenceKind !==
              'one_off' && (
              <>
                <Text className="mt-5 text-sm font-semibold text-white">
                  Unlock Chore
                </Text>

                <View className="flex-row flex-wrap">
                  <OptionButton
                    label="No"
                    active={
                      !isUnlockChore
                    }
                    onPress={() =>
                      setIsUnlockChore(
                        false,
                      )
                    }
                  />

                  <OptionButton
                    label="Yes"
                    active={
                      isUnlockChore
                    }
                    onPress={() =>
                      setIsUnlockChore(
                        true,
                      )
                    }
                  />
                </View>

                <Text className="mt-2 text-xs leading-5 text-slate-500">
                  A Child may have
                  only one active
                  recurring Unlock
                  Chore.
                </Text>
              </>
            )}

          <Text className="mt-5 text-sm font-semibold text-white">
            Availability time
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="Optional HH:mm"
            placeholderTextColor="#64748b"
            value={
              availabilityLocalTime
            }
            onChangeText={
              setAvailabilityLocalTime
            }
            autoCapitalize="none"
          />

          <Text className="mt-2 text-xs leading-5 text-slate-500">
            Leave empty to make
            the chore available at
            00:00 on its scheduled
            day.
          </Text>

          <Text className="mt-4 text-sm font-semibold text-white">
            Deadline time
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="18:00"
            placeholderTextColor="#64748b"
            value={
              deadlineLocalTime
            }
            onChangeText={
              setDeadlineLocalTime
            }
            autoCapitalize="none"
          />

          <Text className="mt-4 text-sm font-semibold text-white">
            Deadline day offset
          </Text>

          <TextInput
            className="px-4 py-3 mt-2 text-white border rounded-xl border-slate-700 bg-slate-900"
            placeholder="0"
            placeholderTextColor="#64748b"
            value={
              deadlineDayOffset
            }
            onChangeText={
              setDeadlineDayOffset
            }
            keyboardType="number-pad"
          />

          <Text className="mt-2 text-xs leading-5 text-slate-500">
            0 means the scheduled
            day. 1 means the
            following day.
          </Text>

          {errorMessage && (
            <Text className="mt-4 text-red-400">
              {errorMessage}
            </Text>
          )}

          <Pressable
            className="px-4 py-3 mt-6 bg-white rounded-xl"
            disabled={working}
            onPress={() =>
              void handleSave()
            }
          >
            <Text className="font-semibold text-center text-slate-950">
              {working
                ? editingDefinitionId
                  ? 'Saving...'
                  : 'Creating...'
                : editingDefinitionId
                  ? 'Save changes'
                  : 'Create chore'}
            </Text>
          </Pressable>

          <Pressable
            className="px-4 py-3 mt-3 border rounded-xl border-slate-700"
            disabled={working}
            onPress={
              closeForm
            }
          >
            <Text className="font-semibold text-center text-white">
              Cancel
            </Text>
          </Pressable>
        </View>
      )}

      <View className="mt-5">
        <Text className="text-sm font-semibold text-white">
          Active definitions
        </Text>

        {definitions ===
          undefined && (
          <Text className="mt-3 text-slate-500">
            Loading chores...
          </Text>
        )}

        {definitions?.length ===
          0 && (
          <Text className="mt-3 text-sm leading-5 text-slate-500">
            No chores configured
            yet.
          </Text>
        )}

        {definitions?.map(
          (definition) => (
            <View
              key={
                definition
                  .choreDefinitionId
              }
              className="p-4 mt-3 border rounded-xl border-slate-800 bg-slate-950"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-semibold text-white">
                    {
                      definition.title
                    }
                  </Text>

                  <Text className="mt-1 text-sm text-slate-400">
                    {definition.kind ===
                    'personal'
                      ? 'Personal'
                      : 'Claimable'}{' '}
                    ·{' '}
                    {
                      definition.valueSek
                    }{' '}
                    kr
                  </Text>
                </View>

                {definition.isUnlockChore && (
                  <Text className="text-xs font-semibold text-amber-400">
                    UNLOCK
                  </Text>
                )}
              </View>

              {definition.description && (
                <Text className="mt-3 text-sm leading-5 text-slate-400">
                  {
                    definition.description
                  }
                </Text>
              )}

              <Text className="mt-3 text-sm text-slate-500">
                {formatRecurrence(
                  definition.recurrence,
                )}
              </Text>

              <Text className="mt-1 text-sm text-slate-500">
                Available:{' '}
                {definition.availabilityLocalTime ??
                  '00:00'}{' '}
                · Deadline:{' '}
                {
                  definition.deadlineLocalTime
                }
                {definition.deadlineDayOffset >
                0
                  ? ` +${definition.deadlineDayOffset} day${
                      definition.deadlineDayOffset ===
                      1
                        ? ''
                        : 's'
                    }`
                  : ''}
              </Text>

              {definition.kind ===
                'personal' &&
                definition.personalChildId && (
                  <Text className="mt-1 text-sm text-slate-500">
                    Child:{' '}
                    {getChildName(
                      definition.personalChildId,
                    )}
                  </Text>
                )}

              {definition.kind ===
                'claimable' && (
                  <Text className="mt-1 text-sm text-slate-500">
                    Eligible:{' '}
                    {definition.eligibleChildIds ===
                    undefined
                      ? 'All Children'
                      : definition.eligibleChildIds
                          .map(
                            getChildName,
                          )
                          .join(
                            ', ',
                          )}
                  </Text>
                )}

              <View className="flex-row mt-4">
                <Pressable
                  className="flex-1 px-4 py-3 mr-2 border rounded-xl border-slate-700"
                  disabled={
                    archivingId !==
                    undefined
                  }
                  onPress={() =>
                    startEditing(
                      definition,
                    )
                  }
                >
                  <Text className="font-semibold text-center text-white">
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  className="flex-1 px-4 py-3 ml-2 border border-red-900 rounded-xl"
                  disabled={
                    archivingId !==
                    undefined
                  }
                  onPress={() =>
                    confirmArchive(
                      definition,
                    )
                  }
                >
                  <Text className="font-semibold text-center text-red-400">
                    {archivingId ===
                    definition.choreDefinitionId
                      ? 'Archiving...'
                      : 'Archive'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ),
        )}
      </View>
    </View>
  );
}
