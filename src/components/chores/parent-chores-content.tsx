import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
type ChoreKind = "personal" | "claimable";
type RecurrenceKind = "one_off" | "daily" | "weekly" | "monthly";
type Recurrence =
  | { kind: "one_off"; scheduledDate: string }
  | { kind: "daily"; startDate: string; interval: number }
  | { kind: "weekly"; startDate: string; interval: number; weekdays: Weekday[] }
  | {
      kind: "monthly";
      startDate: string;
      interval: number;
      dayOfMonth: number;
    };

type ChildSummary = { childId: Id<"children">; displayName: string };
type Definition = {
  choreDefinitionId: Id<"choreDefinitions">;
  kind: ChoreKind;
  title: string;
  description?: string;
  valueSek: number;
  recurrence: Recurrence;
  availabilityLocalTime?: string;
  deadlineLocalTime: string;
  deadlineDayOffset: number;
  personalChildId?: Id<"children">;
  eligibleChildIds?: Id<"children">[];
  isUnlockChore: boolean;
};

const weekdays: Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};

function getArtwork(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("car") || normalized.includes("wash"))
    return artwork.carWash;
  if (normalized.includes("walk") && normalized.includes("dog"))
    return artwork.dogWalk;
  if (normalized.includes("dog") || normalized.includes("pet"))
    return artwork.dog;
  if (normalized.includes("recycl") || normalized.includes("trash"))
    return artwork.recycling;
  return artwork.bedroom;
}

function recurrenceLabel(recurrence: Recurrence) {
  switch (recurrence.kind) {
    case "one_off":
      return `One-off · ${recurrence.scheduledDate}`;
    case "daily":
      return recurrence.interval === 1
        ? "Daily"
        : `Every ${recurrence.interval} days`;
    case "weekly":
      return `Weekly · ${recurrence.weekdays.map((day) => day.slice(0, 3)).join(", ")}`;
    case "monthly":
      return `Monthly · day ${recurrence.dayOfMonth}`;
  }
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`mr-2 mt-2 min-h-target justify-center rounded-control px-4 ${
        active ? "bg-action" : "border border-infoSoftStrong bg-surfaceRaised"
      }`}
    >
      <AppText variant="label" color={active ? "white" : "ink"}>
        {label}
      </AppText>
    </Pressable>
  );
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: ChoreKind;
  onChange: (value: ChoreKind) => void;
}) {
  return (
    <View className="flex-row rounded-control bg-infoSoft p-1">
      {(["personal", "claimable"] as const).map((kind) => {
        const active = value === kind;
        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(kind)}
            className={`min-h-target flex-1 items-center justify-center rounded-control ${
              active ? "bg-actionSoftStrong" : "bg-transparent"
            }`}
          >
            <AppText variant="cardTitle" color={active ? "action" : "ink"}>
              {kind === "personal" ? "Personal" : "Claimable"}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ParentChoresContent({
  householdId,
  children,
}: {
  householdId: Id<"households">;
  children: ChildSummary[];
}) {
  const definitions = useQuery(api.choreDefinitions.listActiveForHousehold, {
    householdId,
  });
  const createDefinition = useServerConfirmedMutation(
    api.choreDefinitions.create,
  );
  const updateDefinition = useServerConfirmedMutation(
    api.choreDefinitions.update,
  );
  const archiveDefinition = useServerConfirmedMutation(
    api.choreDefinitions.archive,
  );

  const [listKind, setListKind] = useState<ChoreKind>("personal");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"choreDefinitions"> | null>(
    null,
  );
  const [kind, setKind] = useState<ChoreKind>("personal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [valueSek, setValueSek] = useState("");
  const [personalChildId, setPersonalChildId] = useState<
    Id<"children"> | undefined
  >(children[0]?.childId);
  const [restrictEligibility, setRestrictEligibility] = useState(false);
  const [eligibleChildIds, setEligibleChildIds] = useState<Id<"children">[]>(
    [],
  );
  const [recurrenceKind, setRecurrenceKind] =
    useState<RecurrenceKind>("one_off");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [interval, setInterval] = useState("1");
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [availabilityTime, setAvailabilityTime] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:00");
  const [deadlineOffset, setDeadlineOffset] = useState("0");
  const [isUnlockChore, setIsUnlockChore] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm(nextKind: ChoreKind = listKind) {
    setEditingId(null);
    setKind(nextKind);
    setTitle("");
    setDescription("");
    setValueSek("");
    setPersonalChildId(children[0]?.childId);
    setRestrictEligibility(false);
    setEligibleChildIds([]);
    setRecurrenceKind("one_off");
    setScheduledDate("");
    setStartDate("");
    setInterval("1");
    setSelectedWeekdays([]);
    setDayOfMonth("1");
    setAvailabilityTime("");
    setDeadlineTime("18:00");
    setDeadlineOffset("0");
    setIsUnlockChore(false);
    setError(null);
  }

  function openNew() {
    resetForm(listKind);
    setShowForm(true);
  }

  function openEdit(definition: Definition) {
    setEditingId(definition.choreDefinitionId);
    setKind(definition.kind);
    setTitle(definition.title);
    setDescription(definition.description ?? "");
    setValueSek(String(definition.valueSek));
    setPersonalChildId(definition.personalChildId ?? children[0]?.childId);
    setRestrictEligibility(definition.eligibleChildIds !== undefined);
    setEligibleChildIds(definition.eligibleChildIds ?? []);
    setRecurrenceKind(definition.recurrence.kind);
    setScheduledDate(
      definition.recurrence.kind === "one_off"
        ? definition.recurrence.scheduledDate
        : "",
    );
    setStartDate(
      definition.recurrence.kind !== "one_off"
        ? definition.recurrence.startDate
        : "",
    );
    setInterval(
      definition.recurrence.kind !== "one_off"
        ? String(definition.recurrence.interval)
        : "1",
    );
    setSelectedWeekdays(
      definition.recurrence.kind === "weekly"
        ? definition.recurrence.weekdays
        : [],
    );
    setDayOfMonth(
      definition.recurrence.kind === "monthly"
        ? String(definition.recurrence.dayOfMonth)
        : "1",
    );
    setAvailabilityTime(definition.availabilityLocalTime ?? "");
    setDeadlineTime(definition.deadlineLocalTime);
    setDeadlineOffset(String(definition.deadlineDayOffset));
    setIsUnlockChore(definition.isUnlockChore);
    setError(null);
    setShowForm(true);
  }

  function buildRecurrence(): Recurrence {
    if (recurrenceKind === "one_off")
      return { kind: "one_off", scheduledDate: scheduledDate.trim() };
    if (recurrenceKind === "daily")
      return {
        kind: "daily",
        startDate: startDate.trim(),
        interval: Number(interval),
      };
    if (recurrenceKind === "weekly") {
      return {
        kind: "weekly",
        startDate: startDate.trim(),
        interval: Number(interval),
        weekdays: selectedWeekdays,
      };
    }
    return {
      kind: "monthly",
      startDate: startDate.trim(),
      interval: Number(interval),
      dayOfMonth: Number(dayOfMonth),
    };
  }

  async function save() {
    setWorking(true);
    setError(null);
    const recurrence = buildRecurrence();
    const input = {
      kind,
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      valueSek: Number(valueSek),
      recurrence,
      ...(availabilityTime.trim()
        ? { availabilityLocalTime: availabilityTime.trim() }
        : {}),
      deadlineLocalTime: deadlineTime.trim(),
      deadlineDayOffset: Number(deadlineOffset),
      ...(kind === "personal" && personalChildId ? { personalChildId } : {}),
      ...(kind === "claimable" && restrictEligibility
        ? { eligibleChildIds }
        : {}),
      isUnlockChore:
        kind === "personal" && recurrenceKind !== "one_off" && isUnlockChore,
    };

    try {
      if (editingId)
        await updateDefinition({ choreDefinitionId: editingId, ...input });
      else await createDefinition({ householdId, ...input });
      setListKind(kind);
      setShowForm(false);
      resetForm(kind);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save chore.",
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmArchive(definition: Definition) {
    Alert.alert(
      "Archive chore?",
      `“${definition.title}” will stop generating future chores. Existing history stays unchanged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () =>
            void archiveDefinition({
              choreDefinitionId: definition.choreDefinitionId,
            }).catch((archiveError) => {
              Alert.alert(
                "Could not archive chore",
                archiveError instanceof Error
                  ? archiveError.message
                  : "Please try again.",
              );
            }),
        },
      ],
    );
  }

  const visibleDefinitions =
    definitions?.filter((definition) => definition.kind === listKind) ?? [];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={openNew}
        className="min-h-control flex-row items-center rounded-control bg-actionSoft px-4"
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="plus"
            color={DirectionC.color.white}
            size={24}
          />
        </View>
        <AppText variant="cardTitle" color="action" className="ml-3 flex-1">
          Add chore
        </AppText>
        <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={22} />
      </Pressable>

      <View className="mt-4">
        <SegmentedControl value={listKind} onChange={setListKind} />
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <AppText variant="sectionTitle">Active chores</AppText>
        <View className="min-w-12 items-center rounded-full bg-infoSoft px-3 py-1.5">
          <AppText variant="label">{visibleDefinitions.length}</AppText>
        </View>
      </View>

      {definitions === undefined ? (
        <AppText color="ink-muted" className="mt-4">
          Loading chores…
        </AppText>
      ) : visibleDefinitions.length === 0 ? (
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-3 items-center p-7"
        >
          <DirectionCIcon
            name="chores"
            color={DirectionC.color.inkMuted}
            size={40}
          />
          <AppText variant="cardTitle" className="mt-3">
            No {listKind} chores yet
          </AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-1 text-center"
          >
            Add one when your family is ready.
          </AppText>
        </Surface>
      ) : (
        <View className="mt-3 gap-3">
          {visibleDefinitions.map((definition) => {
            const childName =
              definition.kind === "personal"
                ? children.find(
                    (child) => child.childId === definition.personalChildId,
                  )?.displayName
                : definition.eligibleChildIds === undefined
                  ? "All children"
                  : definition.eligibleChildIds
                      .map(
                        (id) =>
                          children.find((child) => child.childId === id)
                            ?.displayName,
                      )
                      .filter(Boolean)
                      .join(", ");
            return (
              <Surface
                key={definition.choreDefinitionId}
                className="flex-row overflow-hidden p-3"
              >
                <Image
                  source={getArtwork(definition.title)}
                  className="h-[112px] w-[112px] rounded-control bg-infoSoft"
                  contentFit="cover"
                  accessible={false}
                />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start">
                    <View className="flex-1 pr-2">
                      <AppText variant="cardTitle">{definition.title}</AppText>
                      <AppText variant="cardTitle" className="mt-0.5">
                        {definition.valueSek} kr
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${definition.title}`}
                      onPress={() => openEdit(definition)}
                      className="min-h-target justify-center rounded-full bg-infoSoft px-3"
                    >
                      <AppText variant="label">Edit</AppText>
                    </Pressable>
                  </View>
                  <AppText variant="bodySmall" className="mt-1">
                    {childName || "No child selected"}
                  </AppText>
                  <AppText variant="bodySmall" className="mt-1">
                    {recurrenceLabel(definition.recurrence)}
                  </AppText>
                  <AppText variant="caption" color="ink-muted" className="mt-1">
                    Available {definition.availabilityLocalTime ?? "00:00"} ·
                    Deadline {definition.deadlineLocalTime}
                  </AppText>
                  <View className="mt-2 flex-row items-center justify-between">
                    {definition.isUnlockChore ? (
                      <View className="rounded-full bg-actionSoft px-3 py-1">
                        <AppText variant="caption" color="action">
                          Unlock chore
                        </AppText>
                      </View>
                    ) : (
                      <View />
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => confirmArchive(definition)}
                      className="min-h-target justify-center px-1"
                    >
                      <AppText variant="caption" color="urgency">
                        Archive
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </Surface>
            );
          })}
        </View>
      )}

      <Surface
        tone="muted"
        elevated={false}
        className="mt-4 flex-row items-center p-3"
      >
        <DirectionCIcon
          name="info"
          color={DirectionC.color.inkMuted}
          size={22}
        />
        <AppText variant="bodySmall" color="ink-muted" className="ml-3 flex-1">
          Edits apply to future chores.
        </AppText>
      </Surface>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="px-5">
              <TopBar
                title={editingId ? "Edit chore" : "New chore"}
                onBack={() => setShowForm(false)}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pb-5"
            >
              <SegmentedControl
                value={kind}
                onChange={(next) => {
                  setKind(next);
                  if (next === "claimable") setIsUnlockChore(false);
                }}
              />

              <AppText variant="sectionTitle" className="mt-5">
                Basics
              </AppText>
              <Surface className="mt-2 gap-4 p-4">
                <FormField
                  label="Chore name"
                  placeholder="Clean your room"
                  value={title}
                  onChangeText={setTitle}
                />
                <FormField
                  label="What to do"
                  helper="Optional instructions shown on the chore detail."
                  placeholder="Add clear instructions"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
                <FormField
                  label="Value in SEK"
                  placeholder="30"
                  value={valueSek}
                  onChangeText={setValueSek}
                  keyboardType="number-pad"
                />
              </Surface>

              <AppText variant="sectionTitle" className="mt-5">
                {kind === "personal" ? "Assigned child" : "Who can claim it"}
              </AppText>
              <Surface className="mt-2 p-4">
                {kind === "personal" ? (
                  <View className="flex-row flex-wrap">
                    {children.map((child) => (
                      <Choice
                        key={child.childId}
                        label={child.displayName}
                        active={personalChildId === child.childId}
                        onPress={() => setPersonalChildId(child.childId)}
                      />
                    ))}
                  </View>
                ) : (
                  <View>
                    <View className="flex-row flex-wrap">
                      <Choice
                        label="All children"
                        active={!restrictEligibility}
                        onPress={() => setRestrictEligibility(false)}
                      />
                      <Choice
                        label="Selected children"
                        active={restrictEligibility}
                        onPress={() => setRestrictEligibility(true)}
                      />
                    </View>
                    {restrictEligibility ? (
                      <View className="mt-2 flex-row flex-wrap">
                        {children.map((child) => (
                          <Choice
                            key={child.childId}
                            label={child.displayName}
                            active={eligibleChildIds.includes(child.childId)}
                            onPress={() =>
                              setEligibleChildIds((current) =>
                                current.includes(child.childId)
                                  ? current.filter((id) => id !== child.childId)
                                  : [...current, child.childId],
                              )
                            }
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                )}
              </Surface>

              <AppText variant="sectionTitle" className="mt-5">
                Schedule
              </AppText>
              <Surface className="mt-2 p-4">
                <AppText variant="label">Repeats</AppText>
                <View className="flex-row flex-wrap">
                  {(["one_off", "daily", "weekly", "monthly"] as const).map(
                    (value) => (
                      <Choice
                        key={value}
                        label={
                          {
                            one_off: "One-off",
                            daily: "Daily",
                            weekly: "Weekly",
                            monthly: "Monthly",
                          }[value]
                        }
                        active={recurrenceKind === value}
                        onPress={() => {
                          setRecurrenceKind(value);
                          if (value === "one_off") setIsUnlockChore(false);
                        }}
                      />
                    ),
                  )}
                </View>

                <View className="mt-4 gap-4">
                  {recurrenceKind === "one_off" ? (
                    <FormField
                      label="Scheduled date"
                      placeholder="2026-09-13"
                      value={scheduledDate}
                      onChangeText={setScheduledDate}
                      autoCapitalize="none"
                    />
                  ) : (
                    <>
                      <FormField
                        label="Start date"
                        placeholder="2026-09-13"
                        value={startDate}
                        onChangeText={setStartDate}
                        autoCapitalize="none"
                      />
                      <FormField
                        label="Repeat interval"
                        placeholder="1"
                        value={interval}
                        onChangeText={setInterval}
                        keyboardType="number-pad"
                      />
                    </>
                  )}
                  {recurrenceKind === "weekly" ? (
                    <View>
                      <AppText variant="label">Weekdays</AppText>
                      <View className="flex-row flex-wrap">
                        {weekdays.map((day) => (
                          <Choice
                            key={day}
                            label={day.slice(0, 3)}
                            active={selectedWeekdays.includes(day)}
                            onPress={() =>
                              setSelectedWeekdays((current) =>
                                current.includes(day)
                                  ? current.filter((item) => item !== day)
                                  : [...current, day],
                              )
                            }
                          />
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {recurrenceKind === "monthly" ? (
                    <FormField
                      label="Day of month"
                      placeholder="1"
                      value={dayOfMonth}
                      onChangeText={setDayOfMonth}
                      keyboardType="number-pad"
                    />
                  ) : null}
                  <FormField
                    label="Available from"
                    helper="Leave empty for 00:00."
                    placeholder="Optional HH:mm"
                    value={availabilityTime}
                    onChangeText={setAvailabilityTime}
                    autoCapitalize="none"
                  />
                  <FormField
                    label="Deadline time"
                    placeholder="18:00"
                    value={deadlineTime}
                    onChangeText={setDeadlineTime}
                    autoCapitalize="none"
                  />
                  <FormField
                    label="Deadline day offset"
                    helper="0 is the scheduled day; 1 is the next day."
                    placeholder="0"
                    value={deadlineOffset}
                    onChangeText={setDeadlineOffset}
                    keyboardType="number-pad"
                  />
                </View>
              </Surface>

              {kind === "personal" && recurrenceKind !== "one_off" ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isUnlockChore }}
                  onPress={() => setIsUnlockChore((current) => !current)}
                >
                  <Surface
                    tone="mint"
                    elevated={false}
                    className="mt-4 flex-row items-center p-4"
                  >
                    <View
                      className={`h-7 w-12 rounded-full p-1 ${isUnlockChore ? "bg-action" : "bg-disabledSurface"}`}
                    >
                      <View
                        className={`h-5 w-5 rounded-full bg-white ${isUnlockChore ? "ml-5" : ""}`}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="label">Unlock chore</AppText>
                      <AppText
                        variant="bodySmall"
                        color="ink-muted"
                        className="mt-1"
                      >
                        A child can have one active recurring Unlock Chore.
                      </AppText>
                    </View>
                  </Surface>
                </Pressable>
              ) : null}

              {error ? (
                <Surface tone="coral" elevated={false} className="mt-4 p-3">
                  <AppText variant="bodySmall" color="urgency">
                    {error}
                  </AppText>
                </Surface>
              ) : null}
            </ScrollView>

            <View className="border-t border-line bg-surfaceRaised px-5 pt-3">
              <ActionButton
                label={editingId ? "Save changes" : "Create chore"}
                loading={working}
                onPress={() => void save()}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
