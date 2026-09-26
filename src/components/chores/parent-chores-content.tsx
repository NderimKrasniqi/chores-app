import { useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "convex/react";

import { ChoreIcon } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type ChoreKind = "personal" | "claimable";
export type RecurrenceKind = "one_off" | "daily" | "weekly" | "monthly";
export type Recurrence =
  | { kind: "one_off"; scheduledDate: string }
  | { kind: "daily"; startDate: string; interval: number }
  | { kind: "weekly"; startDate: string; interval: number; weekdays: Weekday[] }
  | {
      kind: "monthly";
      startDate: string;
      interval: number;
      dayOfMonth: number;
    };

export type ChildSummary = { childId: Id<"children">; displayName: string };
export type Definition = {
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

export type ParentChoresVisualForm = {
  editingId?: Id<"choreDefinitions">;
  kind: ChoreKind;
  title?: string;
  description?: string;
  valueSek?: string;
  personalChildId?: Id<"children">;
  restrictEligibility?: boolean;
  eligibleChildIds?: Id<"children">[];
  recurrenceKind?: RecurrenceKind;
  scheduledDate?: string;
  startDate?: string;
  interval?: string;
  selectedWeekdays?: Weekday[];
  dayOfMonth?: string;
  availabilityTime?: string;
  deadlineTime?: string;
  deadlineOffset?: string;
  isUnlockChore?: boolean;
};

export type ParentChoresVisualFixture = {
  definitions: Definition[];
  form?: ParentChoresVisualForm;
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
function formatScheduleDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value;

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function recurrenceLabel(recurrence: Recurrence) {
  switch (recurrence.kind) {
    case "one_off":
      return `One-off · ${formatScheduleDate(recurrence.scheduledDate)}`;
    case "daily":
      return recurrence.interval === 1
        ? "Daily"
        : `Every ${recurrence.interval} days`;
    case "weekly":
      return recurrence.weekdays.join(",") ===
        "monday,tuesday,wednesday,thursday,friday"
        ? "Weekly · Mon–Fri"
        : `Weekly · ${recurrence.weekdays.map((day) => day.slice(0, 3)).join(", ")}`;
    case "monthly":
      return `Monthly · day ${recurrence.dayOfMonth}`;
  }
}

export function ParentChoresContent({
  householdId,
  children,
  visualFixture,
  timezone,
}: {
  householdId: Id<"households">;
  /** Household time zone, for the Today/Tomorrow date chips. */
  timezone?: string;
  children: ChildSummary[];
  visualFixture?: ParentChoresVisualFixture;
}) {
  const queriedDefinitions = useQuery(
    api.choreDefinitions.listActiveForHousehold,
    visualFixture ? "skip" : { householdId },
  );
  const definitions = visualFixture?.definitions ?? queriedDefinitions;
  const visualForm = visualFixture?.form;
  const { tokens: themeColors } = useTheme();
  const createDefinition = useServerConfirmedMutation(
    api.choreDefinitions.create,
  );
  const updateDefinition = useServerConfirmedMutation(
    api.choreDefinitions.update,
  );
  const archiveDefinition = useServerConfirmedMutation(
    api.choreDefinitions.archive,
  );

  const [listKind, setListKind] = useState<ChoreKind>(
    visualForm?.kind ?? "personal",
  );
  const [showForm, setShowForm] = useState(Boolean(visualForm));
  const [editingId, setEditingId] = useState<Id<"choreDefinitions"> | null>(
    visualForm?.editingId ?? null,
  );
  const [kind, setKind] = useState<ChoreKind>(visualForm?.kind ?? "personal");
  const [title, setTitle] = useState(visualForm?.title ?? "");
  const [description, setDescription] = useState(visualForm?.description ?? "");
  const [valueSek, setValueSek] = useState(visualForm?.valueSek ?? "");
  const [personalChildId, setPersonalChildId] = useState<
    Id<"children"> | undefined
  >(visualForm?.personalChildId ?? children[0]?.childId);
  const [restrictEligibility, setRestrictEligibility] = useState(
    visualForm?.restrictEligibility ?? false,
  );
  const [eligibleChildIds, setEligibleChildIds] = useState<Id<"children">[]>(
    visualForm?.eligibleChildIds ?? [],
  );
  const [recurrenceKind, setRecurrenceKind] = useState<RecurrenceKind>(
    visualForm?.recurrenceKind ?? "one_off",
  );
  const [scheduledDate, setScheduledDate] = useState(
    visualForm?.scheduledDate ?? "",
  );
  const [startDate, setStartDate] = useState(visualForm?.startDate ?? "");
  const [interval, setInterval] = useState(visualForm?.interval ?? "1");
  const [selectedWeekdays, setSelectedWeekdays] = useState<Weekday[]>(
    visualForm?.selectedWeekdays ?? [],
  );
  const [dayOfMonth, setDayOfMonth] = useState(visualForm?.dayOfMonth ?? "1");
  const [availabilityTime, setAvailabilityTime] = useState(
    visualForm?.availabilityTime ?? "",
  );
  const [deadlineTime, setDeadlineTime] = useState(
    visualForm?.deadlineTime ?? "18:00",
  );
  const [deadlineOffset, setDeadlineOffset] = useState(
    visualForm?.deadlineOffset ?? "0",
  );
  const [isUnlockChore, setIsUnlockChore] = useState(
    visualForm?.isUnlockChore ?? false,
  );
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
    // Only kids still in the household (removed kids aren't shown).
    setEligibleChildIds(
      (definition.eligibleChildIds ?? []).filter((id) =>
        children.some((child) => child.childId === id),
      ),
    );
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
    if (!(Number(valueSek) > 0)) {
      setError("Give the chore a reward of at least 1 kr.");
      return;
    }
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

  function confirmArchive(definition: Definition, onArchived?: () => void) {
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
            })
              .then(() => onArchived?.())
              .catch((archiveError) => {
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

  function applyTemplate(template: ChoreTemplate) {
    setTitle(template.title);
    if (!valueSek) setValueSek(String(template.valueSek));
  }

  return (
    <View className="pb-6">
      <KindTabs value={listKind} onChange={setListKind} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          listKind === "personal" ? "New chore for a kid" : "New Extra"
        }
        onPress={openNew}
        className="mt-4"
      >
        {({ pressed }) => (
          <Animated.View
            className="min-h-[64px] flex-row items-center gap-3 rounded-[22px] border-2 border-dashed border-line px-4"
            style={[
              { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
              pressTransition,
            ]}
          >
            <Icon name="plus" color={themeColors.action} size={22} />
            <AppText variant="cardTitle" color="action">
              {listKind === "personal" ? "New chore" : "New Extra"}
            </AppText>
          </Animated.View>
        )}
      </Pressable>

      <View className="mt-4 gap-2.5">
        {definitions === undefined ? (
          <AppText color="ink-muted" className="mt-2">
            Loading chores…
          </AppText>
        ) : visibleDefinitions.length === 0 ? (
          <View className="items-center py-8">
            <ChoreIcon
              title={
                listKind === "personal" ? "Clean your room" : "Wash the car"
              }
              size={72}
            />
            <AppText variant="cardTitle" className="mt-3 text-center">
              {listKind === "personal"
                ? "No chores for the kids yet"
                : "No Extras on offer yet"}
            </AppText>
            <AppText color="ink-muted" className="mt-1 text-center">
              {listKind === "personal"
                ? "Give each kid their own jobs — one can unlock Extras."
                : "Extras are up for grabs: first to claim does it."}
            </AppText>
          </View>
        ) : (
          visibleDefinitions.map((definition) => (
            <ChoreRow
              key={definition.choreDefinitionId}
              definition={definition}
              childName={
                children.find(
                  (child) => child.childId === definition.personalChildId,
                )?.displayName
              }
              onPress={() => openEdit(definition)}
            />
          ))
        )}
      </View>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowForm(false)}
                hitSlop={8}
              >
                <AppText variant="label" color="ink-muted">
                  Cancel
                </AppText>
              </Pressable>
              <AppText variant="cardTitle">
                {editingId ? "Edit chore" : "New chore"}
              </AppText>
              <View className="w-12" />
            </View>
            <ScrollView
              contentContainerClassName="px-5 pb-10"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="items-center pt-2">
                <ChoreIcon title={title || "Chore"} size={96} />
              </View>

              {!editingId ? (
                <TemplateGrid onPick={applyTemplate} selectedTitle={title} />
              ) : null}

              <Field label="Name">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What needs doing?"
                  placeholderTextColor={themeColors.inkFaint}
                  className="min-h-[52px] rounded-[16px] bg-surface px-4 font-body-heavy text-ink"
                />
              </Field>

              <Field label="Reward">
                <CoinStepper value={valueSek} onChange={setValueSek} />
              </Field>

              {!editingId ? (
                <Field label="Type">
                  <ChipRow
                    options={[
                      { key: "personal", label: "For one kid" },
                      { key: "claimable", label: "Up for grabs (Extra)" },
                    ]}
                    selected={[kind]}
                    onSelect={(key) => setKind(key as ChoreKind)}
                  />
                </Field>
              ) : null}

              {kind === "personal" ? (
                <Field label="Who">
                  <KidPicker
                    children={children}
                    selected={personalChildId ? [personalChildId] : []}
                    onToggle={(childId) => setPersonalChildId(childId)}
                  />
                </Field>
              ) : (
                <Field label="Who can claim it">
                  <ChipRow
                    options={[
                      { key: "all", label: "Everyone" },
                      { key: "some", label: "Only some kids" },
                    ]}
                    selected={[restrictEligibility ? "some" : "all"]}
                    onSelect={(key) => setRestrictEligibility(key === "some")}
                  />
                  {restrictEligibility ? (
                    <View className="mt-3">
                      <KidPicker
                        children={children}
                        selected={eligibleChildIds}
                        onToggle={(childId) =>
                          setEligibleChildIds((current) =>
                            current.includes(childId)
                              ? current.filter((id) => id !== childId)
                              : [...current, childId],
                          )
                        }
                      />
                    </View>
                  ) : null}
                </Field>
              )}

              <Field label="How often">
                <ChipRow
                  options={[
                    { key: "one_off", label: "Once" },
                    { key: "daily", label: "Daily" },
                    { key: "weekly", label: "Weekly" },
                    { key: "monthly", label: "Monthly" },
                  ]}
                  selected={[recurrenceKind]}
                  onSelect={(key) => setRecurrenceKind(key as RecurrenceKind)}
                />
                {recurrenceKind === "weekly" ? (
                  <View className="mt-3">
                    <ChipRow
                      options={weekdays.map((day) => ({
                        key: day,
                        label: day
                          .slice(0, 2)
                          .replace(/^./, (c) => c.toUpperCase()),
                      }))}
                      selected={selectedWeekdays}
                      onSelect={(key) =>
                        setSelectedWeekdays((current) =>
                          current.includes(key as Weekday)
                            ? current.filter((day) => day !== key)
                            : weekdays.filter(
                                (day) => day === key || current.includes(day),
                              ),
                        )
                      }
                    />
                  </View>
                ) : null}
                {recurrenceKind !== "one_off" ? (
                  <View className="mt-3 flex-row gap-3">
                    <SmallInput
                      label={
                        recurrenceKind === "daily"
                          ? "Every … days"
                          : recurrenceKind === "weekly"
                            ? "Every … weeks"
                            : "Every … months"
                      }
                      value={interval}
                      onChange={setInterval}
                      numeric
                    />
                    {recurrenceKind === "monthly" ? (
                      <SmallInput
                        label="Day of month"
                        value={dayOfMonth}
                        onChange={setDayOfMonth}
                        numeric
                      />
                    ) : null}
                  </View>
                ) : null}
              </Field>

              <Field label={recurrenceKind === "one_off" ? "On" : "Starting"}>
                <DatePicker
                  timezone={timezone}
                  value={
                    recurrenceKind === "one_off" ? scheduledDate : startDate
                  }
                  onChange={
                    recurrenceKind === "one_off"
                      ? setScheduledDate
                      : setStartDate
                  }
                />
              </Field>

              <Field label="Due by">
                <ChipRow
                  options={["12:00", "16:00", "18:00", "20:00"].map((time) => ({
                    key: time,
                    label: time,
                  }))}
                  selected={[deadlineTime]}
                  onSelect={setDeadlineTime}
                />
                <View className="mt-3 flex-row gap-3">
                  <SmallInput
                    label="Or a time (HH:mm)"
                    value={deadlineTime}
                    onChange={setDeadlineTime}
                  />
                  <SmallInput
                    label="Opens at (optional)"
                    value={availabilityTime}
                    onChange={setAvailabilityTime}
                  />
                </View>
                <View className="mt-3">
                  <ChipRow
                    options={[
                      { key: "0", label: "Same day" },
                      { key: "1", label: "Next day" },
                    ]}
                    selected={[deadlineOffset === "0" ? "0" : "1"]}
                    onSelect={setDeadlineOffset}
                  />
                </View>
              </Field>

              {kind === "personal" && recurrenceKind !== "one_off" ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isUnlockChore }}
                  onPress={() => setIsUnlockChore((value) => !value)}
                  className="mt-6 flex-row items-center gap-3 rounded-[20px] bg-surface p-4"
                >
                  <View
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: isUnlockChore
                        ? themeColors.reward
                        : themeColors.surfaceMuted,
                    }}
                  >
                    <Icon
                      name="lock"
                      color={
                        isUnlockChore ? themeColors.ink : themeColors.inkMuted
                      }
                      size={20}
                    />
                  </View>
                  <View className="flex-1">
                    <AppText variant="cardTitle">Unlock chore</AppText>
                    <AppText variant="caption" color="ink-muted">
                      Approving it opens Extras for this kid.
                    </AppText>
                  </View>
                  <Icon
                    name={isUnlockChore ? "check" : "plus"}
                    color={
                      isUnlockChore ? themeColors.action : themeColors.inkMuted
                    }
                    size={20}
                  />
                </Pressable>
              ) : null}

              <Field label="Notes (optional)">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What does done look like?"
                  placeholderTextColor={themeColors.inkFaint}
                  multiline
                  className="min-h-[80px] rounded-[16px] bg-surface px-4 py-3 font-body text-ink"
                />
              </Field>

              {error ? (
                <AppText color="urgency" className="mt-4">
                  {error}
                </AppText>
              ) : null}

              <ActionButton
                className="mt-6"
                label={editingId ? "Save changes" : "Add chore"}
                loading={working}
                onPress={() => void save()}
              />
              {editingId ? (
                <ActionButton
                  className="mt-2"
                  tone="destructiveSecondary"
                  label="Archive chore"
                  disabled={working}
                  onPress={() => {
                    const definition = definitions?.find(
                      (item) => item.choreDefinitionId === editingId,
                    );
                    // Ask while the sheet is still up; iOS won't present an
                    // alert on a modal that is already dismissing.
                    if (definition)
                      confirmArchive(definition, () => setShowForm(false));
                  }}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

type ChoreTemplate = { title: string; valueSek: number };

const TEMPLATES: ChoreTemplate[] = [
  { title: "Clean your room", valueSek: 30 },
  { title: "Load dishwasher", valueSek: 20 },
  { title: "Set the table", valueSek: 15 },
  { title: "Walk the dog", valueSek: 25 },
  { title: "Feed the dog", valueSek: 10 },
  { title: "Water the plants", valueSek: 15 },
  { title: "Fold laundry", valueSek: 20 },
  { title: "Take out recycling", valueSek: 15 },
  { title: "Wash the car", valueSek: 50 },
];

function TemplateGrid({
  onPick,
  selectedTitle,
}: {
  onPick: (template: ChoreTemplate) => void;
  selectedTitle: string;
}) {
  const { tokens } = useTheme();
  return (
    <View className="mt-5">
      <AppText variant="label" color="ink-muted">
        Start from
      </AppText>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {TEMPLATES.map((template) => {
          const active = template.title === selectedTitle;
          return (
            <Pressable
              key={template.title}
              accessibilityRole="button"
              accessibilityLabel={`${template.title}, ${template.valueSek} kronor`}
              accessibilityState={{ selected: active }}
              onPress={() => onPick(template)}
              className="items-center rounded-[18px] p-2"
              style={{
                width: "31.5%",
                backgroundColor: active ? tokens.actionSoft : tokens.surface,
                borderWidth: 2,
                borderColor: active ? tokens.action : "transparent",
              }}
            >
              <ChoreIcon title={template.title} size={44} animated={false} />
              <AppText
                variant="caption"
                className="mt-1 text-center"
                numberOfLines={2}
              >
                {template.title}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function KindTabs({
  value,
  onChange,
}: {
  value: ChoreKind;
  onChange: (kind: ChoreKind) => void;
}) {
  const { tokens } = useTheme();
  const tabs: { key: ChoreKind; label: string }[] = [
    { key: "personal", label: "Kids' chores" },
    { key: "claimable", label: "Extras" },
  ];
  return (
    <View
      className="flex-row rounded-full p-1"
      style={{ backgroundColor: tokens.surfaceMuted }}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.key)}
            className="min-h-[44px] flex-1 items-center justify-center rounded-full"
            style={{ backgroundColor: active ? tokens.surface : "transparent" }}
          >
            <AppText variant="label" color={active ? "ink" : "ink-muted"}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoreRow({
  definition,
  childName,
  onPress,
}: {
  definition: Definition;
  childName?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${definition.title}, ${definition.valueSek} kronor. ${recurrenceLabel(definition.recurrence)}. Edit`}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Animated.View
          className="flex-row items-center gap-3 rounded-[22px] bg-surface p-3"
          style={[
            { transform: [{ scale: pressed ? PRESS.scale : 1 }] },
            pressTransition,
          ]}
        >
          <ChoreIcon title={definition.title} size={52} animated={false} />
          <View className="flex-1">
            <AppText variant="cardTitle" numberOfLines={1}>
              {definition.title}
            </AppText>
            <AppText variant="caption" color="ink-muted" numberOfLines={1}>
              {[
                childName,
                recurrenceLabel(definition.recurrence),
                `due ${definition.deadlineLocalTime}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            {definition.isUnlockChore ? (
              <View className="mt-1 flex-row items-center gap-1">
                <Icon name="lock" color="#B8860B" size={11} />
                <AppText variant="caption" color="ink-muted">
                  Unlocks Extras
                </AppText>
              </View>
            ) : null}
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full border-b-[3px] border-goldShade bg-gold">
            <AppText variant="label" className="text-night">
              {definition.valueSek}
            </AppText>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <AppText variant="label" color="ink-muted" className="mb-2">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onSelect: (key: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.key);
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.key)}
            className="min-h-[44px] items-center justify-center rounded-full px-4"
            style={{
              backgroundColor: active ? tokens.ink : tokens.surface,
            }}
          >
            <AppText
              variant="label"
              style={{ color: active ? tokens.surface : tokens.ink }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function KidPicker({
  children,
  selected,
  onToggle,
}: {
  children: ChildSummary[];
  selected: Id<"children">[];
  onToggle: (childId: Id<"children">) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View className="flex-row flex-wrap gap-3">
      {children.map((child) => {
        const active = selected.includes(child.childId);
        return (
          <Pressable
            key={child.childId}
            accessibilityRole="button"
            accessibilityLabel={child.displayName}
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(child.childId)}
            className="items-center"
          >
            <View
              className="rounded-full p-1"
              style={{
                borderWidth: 3,
                borderColor: active ? tokens.action : "transparent",
              }}
            >
              <Avatar
                tone={childAvatarTone(child.displayName)}
                className="rounded-full"
                fallbackLabel={child.displayName}
                size={52}
              />
            </View>
            <AppText
              variant="caption"
              color={active ? "ink" : "ink-muted"}
              className="mt-1"
            >
              {child.displayName}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The reward as a coin you tap up or down in 5 kr steps. */
function CoinStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { tokens } = useTheme();
  const amount = Number(value) || 0;
  const step = (delta: number) =>
    onChange(String(Math.max(1, Math.min(1000, amount + delta))));
  return (
    <View className="flex-row items-center justify-center gap-5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="5 kronor less"
        onPress={() => step(-5)}
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: tokens.surface }}
      >
        <Icon name="minus" color={tokens.ink} size={20} />
      </Pressable>
      <View className="h-24 w-24 items-center justify-center rounded-full border-b-[6px] border-goldShade bg-gold">
        <TextInput
          accessibilityLabel="Reward in kronor"
          value={value}
          onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          placeholder="0"
          className="min-w-[60px] text-center font-display text-night"
          style={{ fontSize: 30 }}
        />
        <AppText variant="caption" className="-mt-1 text-night">
          kr
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="5 kronor more"
        onPress={() => step(5)}
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: tokens.surface }}
      >
        <Icon name="plus" color={tokens.ink} size={20} />
      </Pressable>
    </View>
  );
}

function SmallInput({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
}) {
  const { tokens } = useTheme();
  return (
    <View className="flex-1">
      <AppText variant="caption" color="ink-muted" className="mb-1">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "number-pad" : "default"}
        placeholderTextColor={tokens.inkFaint}
        className="min-h-[48px] rounded-[14px] bg-surface px-3 font-body-heavy text-ink"
      />
    </View>
  );
}

/** YYYY-MM-DD `days` from today in the household's time zone. */
function isoDateInDays(days: number, timezone?: string) {
  let today: string;
  try {
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    today = new Date().toISOString().slice(0, 10);
  }
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Quick date chips (today / tomorrow / +2) plus a free YYYY-MM-DD field. */
function DatePicker({
  value,
  onChange,
  timezone,
}: {
  value: string;
  onChange: (value: string) => void;
  timezone?: string;
}) {
  const quick = [0, 1, 2].map((days) => ({
    key: isoDateInDays(days, timezone),
    label:
      days === 0
        ? "Today"
        : days === 1
          ? "Tomorrow"
          : formatScheduleDate(isoDateInDays(days, timezone)),
  }));
  return (
    <View>
      <ChipRow options={quick} selected={[value]} onSelect={onChange} />
      <View className="mt-3 flex-row">
        <SmallInput
          label="Or a date (YYYY-MM-DD)"
          value={value}
          onChange={onChange}
        />
      </View>
    </View>
  );
}
