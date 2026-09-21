import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import {
  childAvatarTone,
  DirectionCAvatar,
} from "@/components/ui/direction-c-avatar";
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
import { AppImage as Image } from "@/components/ui/app-image";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

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
const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dishwasher: require("../../../assets/images/direction-c/chore-dishwasher.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  laundry: require("../../../assets/images/direction-c/chore-laundry.png"),
  plants: require("../../../assets/images/direction-c/chore-plants.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
  table: require("../../../assets/images/direction-c/chore-table.png"),
};
const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");

function avatarForName(name: string | undefined) {
  const normalized = name?.trim().toLowerCase();
  if (normalized === "alex") return alexAvatar;
  if (normalized === "maya") return mayaAvatar;
  return null;
}

function getArtwork(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("dishwasher") || normalized.includes("dishes"))
    return artwork.dishwasher;
  if (normalized.includes("table")) return artwork.table;
  if (normalized.includes("laundry") || normalized.includes("fold"))
    return artwork.laundry;
  if (normalized.includes("plant") || normalized.includes("water"))
    return artwork.plants;
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

function formatRepeatValue(recurrenceKind: RecurrenceKind, interval: string) {
  const count = Number(interval);
  if (!Number.isSafeInteger(count) || count <= 0) return "Choose interval";

  if (recurrenceKind === "daily") {
    return count === 1 ? "Every day" : `Every ${count} days`;
  }

  if (recurrenceKind === "weekly") {
    return count === 1 ? "Every week" : `Every ${count} weeks`;
  }

  return count === 1 ? "Every month" : `Every ${count} months`;
}

function formatDeadlineValue(deadlineTime: string, deadlineOffset: string) {
  const time = deadlineTime.trim() || "18:00";
  const offset = Number(deadlineOffset);
  const dayLabel =
    Number.isSafeInteger(offset) && offset > 0
      ? `${offset === 1 ? "next day" : `in ${offset} days`}`
      : "same day";

  return `${time} · ${dayLabel}`;
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

function PersonChoice({
  child,
  active,
  onPress,
}: {
  child: ChildSummary;
  active: boolean;
  onPress: () => void;
}) {
  const avatar = avatarForName(child.displayName);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-[50px] flex-1 flex-row items-center rounded-control border px-2.5 ${
        active
          ? "border-action bg-actionSoft"
          : "border-infoSoftStrong bg-surfaceRaised"
      }`}
    >
      {avatar ? (
        <DirectionCAvatar
          source={avatar}
          tone={childAvatarTone(child.displayName)}
          className="h-9 w-9"
        />
      ) : (
        <View className="h-9 w-9 items-center justify-center rounded-full bg-infoSoft">
          <DirectionCIcon
            name="person"
            color={DirectionC.color.ink}
            size={24}
          />
        </View>
      )}
      <AppText
        variant="cardTitle"
        color={active ? "action" : "ink"}
        className="ml-2 flex-1"
        numberOfLines={1}
      >
        {child.displayName}
      </AppText>
      <View
        className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
          active
            ? "border-action bg-action"
            : "border-infoSoftStrong bg-transparent"
        }`}
      >
        {active ? (
          <DirectionCIcon
            name="check"
            color={DirectionC.color.white}
            size={18}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function EligibilityChoice({
  label,
  active,
  onPress,
  selectedChildren,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  selectedChildren?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-[50px] flex-1 flex-row items-center rounded-control border px-2.5 ${
        active
          ? "border-action bg-actionSoft"
          : "border-infoSoftStrong bg-surfaceRaised"
      }`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-infoSoft">
        <DirectionCIcon
          name={selectedChildren ? "person" : "family"}
          color={active ? DirectionC.color.green : DirectionC.color.ink}
          size={26}
        />
      </View>
      <AppText
        variant="cardTitle"
        color={active ? "action" : "ink"}
        className="ml-2 flex-1"
        numberOfLines={2}
      >
        {label}
      </AppText>
      <View
        className={`h-7 w-7 items-center justify-center rounded-full border-2 ${
          active
            ? "border-action bg-action"
            : "border-infoSoftStrong bg-transparent"
        }`}
      >
        {active ? (
          <DirectionCIcon
            name="check"
            color={DirectionC.color.white}
            size={18}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function ScheduleFieldRow({
  icon,
  label,
  displayValue,
  onPress,
}: {
  icon: "calendar" | "clock" | "repeat";
  label: string;
  displayValue: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${displayValue}`}
      onPress={onPress}
      className="min-h-target flex-row items-center border-b border-line px-1"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-infoSoft">
        <DirectionCIcon name={icon} color={DirectionC.color.ink} size={23} />
      </View>
      <AppText className="ml-3 flex-1" numberOfLines={1}>
        {label}
      </AppText>
      <AppText
        color={displayValue.startsWith("Choose") ? "ink-muted" : "ink"}
        className="max-w-[190px] text-right"
        numberOfLines={1}
      >
        {displayValue}
      </AppText>
      <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={20} />
    </Pressable>
  );
}

type ScheduleEditorKey =
  | "scheduledDate"
  | "startDate"
  | "interval"
  | "dayOfMonth"
  | "availabilityTime"
  | "deadline";

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
  visualFixture,
}: {
  householdId: Id<"households">;
  children: ChildSummary[];
  visualFixture?: ParentChoresVisualFixture;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const queriedDefinitions = useQuery(
    api.choreDefinitions.listActiveForHousehold,
    visualFixture ? "skip" : { householdId },
  );
  const definitions = visualFixture?.definitions ?? queriedDefinitions;
  const visualForm = visualFixture?.form;
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
  const [scheduleEditor, setScheduleEditor] =
    useState<ScheduleEditorKey | null>(null);

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

  function scheduleEditorValue(key: ScheduleEditorKey) {
    switch (key) {
      case "scheduledDate":
        return scheduledDate;
      case "startDate":
        return startDate;
      case "interval":
        return interval;
      case "dayOfMonth":
        return dayOfMonth;
      case "availabilityTime":
        return availabilityTime;
      case "deadline":
        return deadlineTime;
    }
  }

  function updateScheduleEditorValue(key: ScheduleEditorKey, value: string) {
    switch (key) {
      case "scheduledDate":
        setScheduledDate(value);
        return;
      case "startDate":
        setStartDate(value);
        return;
      case "interval":
        setInterval(value);
        return;
      case "dayOfMonth":
        setDayOfMonth(value);
        return;
      case "availabilityTime":
        setAvailabilityTime(value);
        return;
      case "deadline":
        setDeadlineTime(value);
        return;
    }
  }

  function scheduleEditorConfig(key: ScheduleEditorKey) {
    switch (key) {
      case "scheduledDate":
        return {
          title: "Choose date",
          label: "Date",
          placeholder: "YYYY-MM-DD",
          helper: "Use the household-local date, for example 2026-09-14.",
          keyboardType: "default" as const,
        };
      case "startDate":
        return {
          title: "Choose start date",
          label: "Starts",
          placeholder: "YYYY-MM-DD",
          helper: "Recurring chores use the household-local start date.",
          keyboardType: "default" as const,
        };
      case "interval":
        return {
          title: "Choose repeat interval",
          label: "Repeats",
          placeholder: "1",
          helper: "Enter a positive whole number.",
          keyboardType: "number-pad" as const,
        };
      case "dayOfMonth":
        return {
          title: "Choose day of month",
          label: "Day of month",
          placeholder: "1",
          helper: "Choose a day from 1 to 31.",
          keyboardType: "number-pad" as const,
        };
      case "availabilityTime":
        return {
          title: "Choose availability",
          label: "Available from",
          placeholder: "Start of day",
          helper: "Leave empty to start at the beginning of the scheduled day.",
          keyboardType: "default" as const,
        };
      case "deadline":
        return {
          title: "Choose deadline",
          label: "Deadline time",
          placeholder: "18:00",
          helper: "Use 24-hour HH:mm. The day offset is edited below.",
          keyboardType: "default" as const,
        };
    }
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
  const scheduleConfig = scheduleEditor
    ? scheduleEditorConfig(scheduleEditor)
    : null;
  const scheduleValue = scheduleEditor
    ? scheduleEditorValue(scheduleEditor)
    : "";

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={openNew}
        className="min-h-[72px] flex-row items-center rounded-control bg-actionSoft px-4"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-action">
          <DirectionCIcon
            name="plus"
            color={DirectionC.color.white}
            size={25}
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
        <Surface className="mt-3 p-5">
          <AppText variant="cardTitle">Loading chores…</AppText>
          <AppText variant="bodySmall" color="ink-muted" className="mt-1">
            Your active chore plans will appear here.
          </AppText>
        </Surface>
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
            const childAvatar = avatarForName(childName);
            return (
              <Surface
                key={definition.choreDefinitionId}
                className="min-h-[116px] flex-row overflow-hidden p-2.5"
              >
                <Image
                  source={getArtwork(definition.title)}
                  className="h-24 w-24 rounded-control bg-[#F7EDDF]"
                  contentFit="contain"
                  accessible={false}
                />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start">
                    <View className="flex-1 pr-1">
                      <AppText
                        variant="cardTitle"
                        className="text-[17px] leading-[20px]"
                        numberOfLines={1}
                      >
                        {definition.title}
                      </AppText>
                      <AppText
                        variant="cardTitle"
                        className="mt-0.5 text-[17px] leading-[20px]"
                      >
                        {definition.valueSek} kr
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${definition.title}`}
                      onPress={() => openEdit(definition)}
                      className="min-h-target flex-row items-center justify-center rounded-full bg-infoSoft px-2.5"
                    >
                      <DirectionCIcon
                        name="edit"
                        color={DirectionC.color.ink}
                        size={17}
                      />
                      <AppText variant="label" className="ml-1">
                        Edit
                      </AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More options for ${definition.title}`}
                      onPress={() => confirmArchive(definition)}
                      className="ml-1 min-h-target w-10 items-center justify-center rounded-full bg-infoSoft"
                    >
                      <DirectionCIcon
                        name="more"
                        color={DirectionC.color.ink}
                        size={19}
                      />
                    </Pressable>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    {childAvatar ? (
                      <DirectionCAvatar
                        source={childAvatar}
                        tone={childAvatarTone(childName ?? "")}
                        className="h-9 w-9"
                      />
                    ) : null}
                    <AppText
                      variant="bodySmall"
                      className={childAvatar ? "ml-1.5" : ""}
                    >
                      {childName || "No child selected"}
                    </AppText>
                    {definition.isUnlockChore ? (
                      <View className="ml-auto flex-row items-center rounded-full bg-actionSoft px-2 py-1">
                        <DirectionCIcon
                          name="key"
                          color={DirectionC.color.green}
                          size={13}
                        />
                        <AppText variant="caption" color="action">
                          {" "}
                          Unlock chore
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <DirectionCIcon
                      name="repeat"
                      color={DirectionC.color.inkMuted}
                      size={16}
                    />
                    <AppText variant="bodySmall" className="ml-1.5 flex-1">
                      {recurrenceLabel(definition.recurrence)}
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    color="ink-muted"
                    className="mt-1"
                    numberOfLines={1}
                  >
                    Available {definition.availabilityLocalTime ?? "00:00"} ·
                    Deadline {definition.deadlineLocalTime}
                  </AppText>
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
        <SafeAreaView
          edges={["bottom"]}
          className="flex-1 bg-canvas"
          style={{ paddingTop: safeAreaInsets.top }}
        >
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
              {editingId ? (
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-1 flex-row items-center p-3"
                >
                  <DirectionCIcon
                    name="info"
                    color={DirectionC.color.inkMuted}
                    size={25}
                  />
                  <View className="ml-3 flex-1">
                    <AppText variant="cardTitle">
                      Changes apply to future chores only.
                    </AppText>
                    <AppText variant="bodySmall" className="mt-0.5">
                      Existing chores keep their current value and deadlines.
                    </AppText>
                  </View>
                </Surface>
              ) : null}

              <SegmentedControl
                value={kind}
                onChange={(next) => {
                  setKind(next);
                  if (next === "claimable") setIsUnlockChore(false);
                }}
              />

              <Surface className="mt-3 p-2.5">
                <FormField
                  label="Chore name"
                  placeholder="Clean your room"
                  value={title}
                  onChangeText={setTitle}
                  className="mt-1 min-h-[44px] py-2"
                />
              </Surface>
              <Surface className="mt-2 p-2.5">
                <FormField
                  label="Instructions (optional)"
                  placeholder="Add clear instructions"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  className="mt-1 min-h-[58px] py-2"
                />
              </Surface>
              <Surface className="mt-2 p-2.5">
                <FormField
                  label="Reward"
                  placeholder="30 kr"
                  value={valueSek}
                  onChangeText={setValueSek}
                  keyboardType="number-pad"
                  className="mt-1 min-h-[44px] py-2"
                />
              </Surface>

              <AppText variant="sectionTitle" className="mt-3">
                {kind === "personal" ? "Assigned to" : "Eligibility"}
              </AppText>
              <Surface className="mt-2 p-2">
                {kind === "personal" ? (
                  <View className="flex-row gap-2">
                    {children.map((child) => (
                      <PersonChoice
                        key={child.childId}
                        child={child}
                        active={personalChildId === child.childId}
                        onPress={() => setPersonalChildId(child.childId)}
                      />
                    ))}
                  </View>
                ) : (
                  <View>
                    <View className="flex-row gap-2">
                      <EligibilityChoice
                        label="All children"
                        active={!restrictEligibility}
                        onPress={() => setRestrictEligibility(false)}
                      />
                      <EligibilityChoice
                        label="Selected children"
                        active={restrictEligibility}
                        selectedChildren
                        onPress={() => setRestrictEligibility(true)}
                      />
                    </View>
                    {restrictEligibility ? (
                      <View className="mt-2 flex-row gap-2">
                        {children.map((child) => (
                          <PersonChoice
                            key={child.childId}
                            child={child}
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

              <AppText variant="sectionTitle" className="mt-3">
                Schedule
              </AppText>
              <View className="mt-2">
                <View className="flex-row rounded-control bg-infoSoft p-1">
                  {(["one_off", "daily", "weekly", "monthly"] as const).map(
                    (value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: recurrenceKind === value,
                        }}
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-control px-1 ${
                          recurrenceKind === value
                            ? "bg-actionSoftStrong"
                            : "bg-transparent"
                        }`}
                        onPress={() => {
                          setRecurrenceKind(value);
                          if (value === "one_off") setIsUnlockChore(false);
                        }}
                      >
                        <AppText
                          variant="label"
                          color={recurrenceKind === value ? "action" : "ink"}
                        >
                          {
                            {
                              one_off: "One-off",
                              daily: "Daily",
                              weekly: "Weekly",
                              monthly: "Monthly",
                            }[value]
                          }
                        </AppText>
                      </Pressable>
                    ),
                  )}
                </View>

                <Surface className="mt-2 overflow-hidden p-2">
                  {recurrenceKind === "one_off" ? (
                    <ScheduleFieldRow
                      icon="calendar"
                      label="Date"
                      displayValue={
                        scheduledDate
                          ? formatScheduleDate(scheduledDate)
                          : "Choose a date"
                      }
                      onPress={() => setScheduleEditor("scheduledDate")}
                    />
                  ) : (
                    <>
                      <ScheduleFieldRow
                        icon="calendar"
                        label="Starts"
                        displayValue={
                          startDate
                            ? formatScheduleDate(startDate)
                            : "Choose a start date"
                        }
                        onPress={() => setScheduleEditor("startDate")}
                      />
                      <ScheduleFieldRow
                        icon="repeat"
                        label="Repeats"
                        displayValue={formatRepeatValue(
                          recurrenceKind,
                          interval,
                        )}
                        onPress={() => setScheduleEditor("interval")}
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
                    <ScheduleFieldRow
                      icon="calendar"
                      label="Day of month"
                      displayValue={
                        dayOfMonth ? `Day ${dayOfMonth}` : "Choose a day"
                      }
                      onPress={() => setScheduleEditor("dayOfMonth")}
                    />
                  ) : null}
                  <ScheduleFieldRow
                    icon="clock"
                    label="Available"
                    displayValue={availabilityTime || "Start of day"}
                    onPress={() => setScheduleEditor("availabilityTime")}
                  />
                  <ScheduleFieldRow
                    icon="clock"
                    label="Deadline"
                    displayValue={formatDeadlineValue(
                      deadlineTime,
                      deadlineOffset,
                    )}
                    onPress={() => setScheduleEditor("deadline")}
                  />
                </Surface>
              </View>

              {kind === "personal" && recurrenceKind !== "one_off" ? (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: isUnlockChore }}
                  onPress={() => setIsUnlockChore((current) => !current)}
                >
                  <Surface
                    tone="mint"
                    elevated={false}
                    className="mt-3 flex-row items-center p-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-actionSoftStrong">
                      <DirectionCIcon
                        name="key"
                        color={DirectionC.color.green}
                        size={25}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <AppText variant="label">Unlock Chore</AppText>
                      <AppText
                        variant="bodySmall"
                        color="ink-muted"
                        className="mt-1"
                        numberOfLines={1}
                      >
                        Approval unlocks Extras for{" "}
                        {children.find(
                          (child) => child.childId === personalChildId,
                        )?.displayName ?? "your child"}
                      </AppText>
                    </View>
                    <View
                      className={`h-7 w-12 rounded-full p-1 ${isUnlockChore ? "bg-action" : "bg-disabledSurface"}`}
                    >
                      <View
                        className={`h-5 w-5 rounded-full bg-white ${isUnlockChore ? "ml-5" : ""}`}
                      />
                    </View>
                  </Surface>
                </Pressable>
              ) : null}

              {kind === "personal" && recurrenceKind !== "one_off" ? (
                <View className="mt-2 flex-row items-center px-1">
                  <DirectionCIcon
                    name="info"
                    color={DirectionC.color.inkMuted}
                    size={20}
                  />
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="ml-2 flex-1"
                  >
                    A child can have one active recurring Unlock Chore.
                  </AppText>
                </View>
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

      <Modal
        visible={scheduleEditor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScheduleEditor(null)}
      >
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
          <View className="px-5">
            <TopBar
              title={scheduleConfig?.title ?? "Schedule"}
              onBack={() => setScheduleEditor(null)}
            />
          </View>
          {scheduleEditor && scheduleConfig ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="px-5 pb-8 pt-5"
            >
              <FormField
                label={scheduleConfig.label}
                value={scheduleValue}
                onChangeText={(value) =>
                  updateScheduleEditorValue(scheduleEditor, value)
                }
                placeholder={scheduleConfig.placeholder}
                keyboardType={scheduleConfig.keyboardType}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Surface
                tone="lavender"
                elevated={false}
                className="mt-5 flex-row p-4"
              >
                <DirectionCIcon
                  name={scheduleEditor === "deadline" ? "clock" : "info"}
                  color={DirectionC.color.ink}
                  size={26}
                />
                <AppText variant="bodySmall" className="ml-3 flex-1">
                  {scheduleConfig.helper}
                </AppText>
              </Surface>
              {scheduleEditor === "deadline" ? (
                <FormField
                  label="Deadline day offset"
                  value={deadlineOffset === "0" ? "" : deadlineOffset}
                  onChangeText={(value) => setDeadlineOffset(value || "0")}
                  placeholder="0"
                  keyboardType="number-pad"
                  helper="0 means the same day."
                />
              ) : null}
              <ActionButton
                className="mt-6"
                label="Done"
                onPress={() => setScheduleEditor(null)}
              />
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
