import { Scene } from "@/components/art";
import { SubmissionEvidenceViewer } from "@/components/evidence/submission-evidence-viewer";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { homeTokens as themeColors } from "@/design-system/theme";
import { ActionButton, AppText, Surface, TopBar } from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { useQuery } from "convex/react";
import { AppImage as Image } from "@/components/ui/app-image";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatLocalDate, formatTimestampDateTime } from "@/lib/dates";

type ReviewSource = "personal" | "claimable" | "redo";
type ReviewItem = {
  submissionId: Id<"choreSubmissions">;
  source: ReviewSource;
  kind: "personal" | "claimable";
  childDisplayName: string;
  title: string;
  description?: string;
  valueSek: number;
  submittedAt: number;
  deadlineAt?: number;
  redoDeadlineAt?: number;
  timezone?: string;
  isUnlockChore: boolean;
  hasEvidence: boolean;
};

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dishwasher: require("../../../assets/images/direction-c/chore-dishwasher.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  laundry: require("../../../assets/images/direction-c/chore-laundry.png"),
  plants: require("../../../assets/images/direction-c/chore-plants.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
  table: require("../../../assets/images/direction-c/chore-table.png"),
};
const alexAvatar = require("../../../assets/images/direction-c/alex-avatar.png");
const mayaAvatar = require("../../../assets/images/direction-c/maya-avatar.png");

function avatarForName(name: string) {
  const normalized = name.trim().toLowerCase();
  if (normalized === "alex") return alexAvatar;
  if (normalized === "maya") return mayaAvatar;
  return null;
}

function getArtwork(title: string) {
  const value = title.toLowerCase();
  if (value.includes("dishwasher") || value.includes("dishes"))
    return artwork.dishwasher;
  if (value.includes("table")) return artwork.table;
  if (value.includes("laundry") || value.includes("fold"))
    return artwork.laundry;
  if (value.includes("plant") || value.includes("water")) return artwork.plants;
  if (value.includes("dog") || value.includes("pet")) return artwork.dog;
  if (value.includes("recycl") || value.includes("trash"))
    return artwork.recycling;
  return artwork.bedroom;
}

function formatTime(timestamp: number, timezone?: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      ...(timezone ? { timeZone: timezone } : {}),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

function submittedLabel(timestamp: number, timezone?: string) {
  try {
    const dateTime = formatTimestampDateTime(timestamp, timezone);
    const date = dateTime.split(" at ")[0];
    const today = formatTimestampDateTime(Date.now(), timezone).split(
      " at ",
    )[0];
    return `${date === today ? "Today" : date}, ${formatTime(timestamp, timezone)}`;
  } catch {
    return formatTime(timestamp, timezone);
  }
}

function tomorrowDate(timezone: string) {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [year, month, day] = today.split("-").map(Number);
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 12));
    return [
      tomorrow.getUTCFullYear(),
      String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
      String(tomorrow.getUTCDate()).padStart(2, "0"),
    ].join("-");
  } catch {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }
}

function formatRedoDate(value: string, timezone: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;

  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return value;

  const label =
    value === tomorrowDate(timezone)
      ? "Tomorrow"
      : new Intl.DateTimeFormat("en-GB", {
          timeZone: "UTC",
          weekday: "short",
        }).format(date);
  const compactDate = formatLocalDate(value);
  return `${label}, ${compactDate}`;
}

export function ParentReviewsContent({
  householdId,
  householdTimezone,
}: {
  householdId: Id<"households">;
  householdTimezone: string;
}) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const personal = useQuery(api.personalChoreReviews.listPending, {
    householdId,
  });
  const claimable = useQuery(api.claimableChoreReviews.listPending, {
    householdId,
  });
  const redos = useQuery(api.redoChoreReviews.listPending, { householdId });
  const approvePersonal = useServerConfirmedMutation(
    api.personalChoreReviews.approve,
  );
  const rejectPersonal = useServerConfirmedMutation(
    api.personalChoreReviews.reject,
  );
  const approveClaimable = useServerConfirmedMutation(
    api.claimableChoreReviews.approve,
  );
  const rejectClaimable = useServerConfirmedMutation(
    api.claimableChoreReviews.reject,
  );
  const approvePersonalRedo = useServerConfirmedMutation(
    api.personalChoreReviews.approveRedo,
  );
  const rejectPersonalRedo = useServerConfirmedMutation(
    api.personalChoreReviews.rejectRedo,
  );
  const approveClaimableRedo = useServerConfirmedMutation(
    api.claimableChoreReviews.approveRedo,
  );
  const rejectClaimableRedo = useServerConfirmedMutation(
    api.claimableChoreReviews.rejectRedo,
  );

  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [settingRedo, setSettingRedo] = useState(false);
  const [redoDate, setRedoDate] = useState(() =>
    tomorrowDate(householdTimezone),
  );
  const [redoTime, setRedoTime] = useState("18:00");
  const [editingDeadlineField, setEditingDeadlineField] = useState<
    "date" | "time" | null
  >(null);
  const [working, setWorking] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items: ReviewItem[] = [
    ...(personal ?? []).map((item) => ({
      ...item,
      source: "personal" as const,
      kind: "personal" as const,
      timezone: householdTimezone,
    })),
    ...(claimable ?? []).map((item) => ({
      ...item,
      source: "claimable" as const,
      kind: "claimable" as const,
      isUnlockChore: false,
    })),
    ...(redos ?? []).map((item) => ({ ...item, source: "redo" as const })),
  ].sort((left, right) => left.submittedAt - right.submittedAt);

  const loading =
    personal === undefined || claimable === undefined || redos === undefined;
  const waitingNames = [...new Set(items.map((item) => item.childDisplayName))];

  async function approve(item: ReviewItem) {
    setWorking("approve");
    setError(null);
    try {
      if (item.source === "personal")
        await approvePersonal({ submissionId: item.submissionId });
      else if (item.source === "claimable")
        await approveClaimable({ submissionId: item.submissionId });
      else if (item.kind === "personal")
        await approvePersonalRedo({ submissionId: item.submissionId });
      else await approveClaimableRedo({ submissionId: item.submissionId });
      setSelected(null);
    } catch (approveError) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Could not approve this submission.",
      );
    } finally {
      setWorking(null);
    }
  }

  async function rejectInitial(item: ReviewItem) {
    setWorking("reject");
    setError(null);
    try {
      if (item.source === "personal") {
        await rejectPersonal({
          submissionId: item.submissionId,
          redoDeadlineLocalDate: redoDate.trim(),
          redoDeadlineLocalTime: redoTime.trim(),
        });
      } else {
        await rejectClaimable({
          submissionId: item.submissionId,
          redoDeadlineLocalDate: redoDate.trim(),
          redoDeadlineLocalTime: redoTime.trim(),
        });
      }
      setSelected(null);
      setSettingRedo(false);
    } catch (rejectError) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Could not require a Redo.",
      );
    } finally {
      setWorking(null);
    }
  }

  function rejectRedo(item: ReviewItem) {
    Alert.alert(
      "Mark Redo incomplete?",
      `${item.childDisplayName} will earn 0 kr for this chore.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark incomplete",
          style: "destructive",
          onPress: () => {
            setWorking("reject");
            setError(null);
            const mutation =
              item.kind === "personal"
                ? rejectPersonalRedo
                : rejectClaimableRedo;
            void mutation({ submissionId: item.submissionId })
              .then(() => setSelected(null))
              .catch((rejectError) =>
                setError(
                  rejectError instanceof Error
                    ? rejectError.message
                    : "Could not finish the Redo review.",
                ),
              )
              .finally(() => setWorking(null));
          },
        },
      ],
    );
  }

  return (
    <View
      style={{
        minHeight: Math.max(0, screenHeight - insets.top - insets.bottom - 130),
      }}
    >
      <Surface
        tone={items.length > 0 ? "coral" : "mint"}
        elevated={false}
        className="flex-row items-center p-4"
      >
        {items.length > 0 ? (
          <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-urgency">
            <Scene name="clipboard" size={76} />
          </View>
        ) : (
          <View className="h-16 w-16 items-center justify-center rounded-full bg-action">
            <Icon name="check" color={themeColors.onAction} size={31} />
          </View>
        )}
        <View className="ml-4 flex-1">
          <AppText style={{ fontSize: 25, lineHeight: 30, fontWeight: "900" }}>
            {loading
              ? "Checking submissions…"
              : items.length > 0
                ? `${items.length} waiting for you`
                : "All caught up"}
          </AppText>
          <AppText
            variant="bodySmall"
            className="mt-1"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {items.length > 0
              ? waitingNames.length > 0
                ? `${waitingNames.join(" and ")} sent work to check.`
                : "Completed work is ready to check."
              : "New submissions will appear here."}
          </AppText>
        </View>
      </Surface>

      <View className="mt-4 flex-row items-center justify-between">
        <AppText style={{ fontSize: 26, lineHeight: 31, fontWeight: "900" }}>
          Waiting for review
        </AppText>
        <View className="min-w-12 items-center rounded-full bg-infoSoft px-3 py-1.5">
          <AppText variant="label">{items.length}</AppText>
        </View>
      </View>

      {items.length > 0 ? (
        <View className="mt-2 gap-2">
          {items.map((item) => (
            <Pressable
              key={item.submissionId}
              accessibilityRole="button"
              onPress={() => {
                setSelected(item);
                setSettingRedo(false);
                setError(null);
              }}
            >
              <Surface className="min-h-[96px] flex-row items-center p-2">
                <Image
                  source={getArtwork(item.title)}
                  className="h-20 w-20 rounded-control bg-infoSoft"
                  contentFit="contain"
                />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start">
                    <View className="flex-1">
                      <AppText className="text-[18px] font-extrabold leading-[21px]">
                        {item.title}
                      </AppText>
                      <View className="mt-0.5 flex-row flex-wrap items-center gap-2">
                        <AppText
                          color="urgency"
                          className="text-[18px] font-extrabold leading-[21px]"
                        >
                          {item.valueSek} kr
                        </AppText>
                        {item.isUnlockChore ? (
                          <View className="flex-row items-center rounded-full bg-actionSoft px-2 py-1">
                            <Icon
                              name="key"
                              color={themeColors.action}
                              size={13}
                            />
                            <AppText variant="caption" color="action">
                              {" "}
                              Unlock chore
                            </AppText>
                          </View>
                        ) : null}
                        {item.hasEvidence ? (
                          <View className="flex-row items-center rounded-full bg-infoSoft px-2 py-1">
                            <Icon
                              name="camera"
                              color={themeColors.ink}
                              size={13}
                            />
                            <AppText variant="caption"> Photo</AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {item.source === "redo" ? (
                      <View className="rounded-full bg-urgencySoft px-2 py-1">
                        <AppText variant="caption" color="urgency">
                          Redo
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-1 flex-row items-center">
                    {avatarForName(item.childDisplayName) ? (
                      <Avatar
                        source={avatarForName(item.childDisplayName)}
                        tone={childAvatarTone(item.childDisplayName)}
                        className="h-7 w-7"
                      />
                    ) : (
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-rewardSoft">
                        <AppText variant="caption">
                          {item.childDisplayName.charAt(0)}
                        </AppText>
                      </View>
                    )}
                    <AppText variant="bodySmall" className="ml-2">
                      {item.childDisplayName}
                    </AppText>
                    <View className="ml-3 flex-row items-center">
                      <Icon
                        name="calendar"
                        color={themeColors.inkMuted}
                        size={18}
                      />
                      <AppText variant="bodySmall" className="ml-1">
                        {submittedLabel(item.submittedAt, item.timezone)}
                      </AppText>
                    </View>
                  </View>
                </View>
                <Icon name="chevron" color={themeColors.ink} size={22} />
              </Surface>
            </Pressable>
          ))}
        </View>
      ) : !loading ? (
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-3 items-center p-8"
        >
          <Icon name="reviews" color={themeColors.action} size={44} />
          <AppText variant="cardTitle" className="mt-3">
            Nothing waiting
          </AppText>
          <AppText
            variant="bodySmall"
            color="ink-muted"
            className="mt-1 text-center"
          >
            Submitted chores will appear here.
          </AppText>
        </Surface>
      ) : null}

      <View style={{ marginTop: "auto", paddingTop: 20 }}>
        <Surface
          tone="lavender"
          elevated={false}
          className="flex-row items-center p-3"
        >
          <Icon name="info" color={themeColors.inkMuted} size={23} />
          <AppText variant="bodySmall" className="ml-3 flex-1">
            Approval creates the earning. Rejection requires one Redo deadline.
          </AppText>
        </Surface>
      </View>

      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <SafeAreaView
            edges={["bottom"]}
            className="flex-1 bg-canvas"
            style={{ paddingTop: Math.max(0, insets.top - 12) }}
          >
            <View className="px-5">
              <TopBar
                title={settingRedo ? "Set Redo deadline" : "Review work"}
                titleStyle={{ fontSize: 22, lineHeight: 27 }}
                onBack={() =>
                  settingRedo ? setSettingRedo(false) : setSelected(null)
                }
              />
            </View>
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-5 pb-7"
              showsVerticalScrollIndicator={false}
            >
              <Surface className="mt-2 p-3">
                <View className="flex-row items-center">
                  {avatarForName(selected.childDisplayName) ? (
                    <Avatar
                      source={avatarForName(selected.childDisplayName)!}
                      tone={childAvatarTone(selected.childDisplayName)}
                      className={
                        settingRedo ? "h-[72px] w-[72px]" : "h-[84px] w-[84px]"
                      }
                    />
                  ) : (
                    <Image
                      source={getArtwork(selected.title)}
                      className={`${settingRedo ? "h-[72px] w-[72px]" : "h-[84px] w-[84px]"} rounded-full bg-rewardSoft`}
                      contentFit="cover"
                    />
                  )}
                  <View className="ml-4 flex-1">
                    {!settingRedo ? (
                      <View className="self-start rounded-full bg-infoSoft px-3 py-1">
                        <AppText variant="caption">
                          {selected.source === "redo"
                            ? "Redo submission"
                            : "First submission"}
                        </AppText>
                      </View>
                    ) : null}
                    <AppText
                      variant="cardTitle"
                      className={settingRedo ? "" : "mt-2"}
                    >
                      {selected.childDisplayName}
                    </AppText>
                    <AppText
                      className="mt-0.5"
                      style={{
                        fontSize: 24,
                        lineHeight: 29,
                        fontWeight: "900",
                      }}
                    >
                      {selected.title}
                    </AppText>
                    <View className="mt-2 flex-row gap-2">
                      <View className="flex-row items-center rounded-control bg-urgencySoft px-3 py-2">
                        <Icon
                          name="tag"
                          color={themeColors.urgency}
                          size={17}
                        />
                        <AppText
                          variant="cardTitle"
                          color="urgency"
                          className="ml-2"
                        >
                          {selected.valueSek} kr
                        </AppText>
                      </View>
                      {selected.isUnlockChore && !settingRedo ? (
                        <View className="flex-row items-center rounded-control bg-actionSoft px-3 py-2">
                          <Icon
                            name="key"
                            color={themeColors.action}
                            size={17}
                          />
                          <AppText variant="label" color="action">
                            {" "}
                            Unlock chore
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                {!settingRedo ? (
                  <>
                    <View className="mt-4 h-px bg-line" />
                    <View className="mt-4 flex-row">
                      <View className="flex-1 flex-row items-center">
                        <Icon
                          name="calendar"
                          color={themeColors.inkMuted}
                          size={23}
                        />
                        <AppText variant="bodySmall" className="ml-2">
                          Submitted{" "}
                          {formatTime(selected.submittedAt, selected.timezone)}
                        </AppText>
                      </View>
                      {selected.deadlineAt || selected.redoDeadlineAt ? (
                        <View className="flex-1 flex-row items-center">
                          <Icon
                            name="clock"
                            color={themeColors.inkMuted}
                            size={23}
                          />
                          <AppText variant="bodySmall" className="ml-2">
                            Deadline{" "}
                            {formatTime(
                              selected.redoDeadlineAt ?? selected.deadlineAt!,
                              selected.timezone,
                            )}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </Surface>

              {settingRedo ? (
                <View>
                  <Surface
                    tone="coral"
                    elevated={false}
                    className="mt-4 flex-row items-center p-4"
                  >
                    <View className="h-[76px] w-[76px] items-center justify-center">
                      <Scene name="calendar" size={108} />
                    </View>
                    <View className="ml-3 flex-1">
                      <AppText variant="cardTitle">
                        Give {selected.childDisplayName} one more try
                      </AppText>
                      <AppText className="mt-1">
                        {selected.childDisplayName} can submit this chore once
                        more before the new deadline.
                      </AppText>
                    </View>
                  </Surface>
                  <AppText
                    className="mt-5"
                    style={{ fontSize: 24, lineHeight: 29, fontWeight: "900" }}
                  >
                    New deadline
                  </AppText>
                  <Surface className="mt-3 px-4 py-3">
                    <View className="flex-row items-center">
                      <Icon
                        name="calendar"
                        color={themeColors.inkMuted}
                        size={30}
                      />
                      <View className="ml-4 flex-1">
                        <AppText variant="bodySmall" color="ink-muted">
                          Date
                        </AppText>
                        <TextInput
                          accessibilityLabel="Redo deadline date"
                          autoCapitalize="none"
                          className="m-0 p-0 font-rounded text-[20px] font-bold leading-[24px] text-ink"
                          onBlur={() => setEditingDeadlineField(null)}
                          onChangeText={setRedoDate}
                          onFocus={() => setEditingDeadlineField("date")}
                          placeholder="YYYY-MM-DD"
                          value={
                            editingDeadlineField === "date"
                              ? redoDate
                              : formatRedoDate(redoDate, householdTimezone)
                          }
                        />
                      </View>
                      <Icon
                        name="chevron"
                        color={themeColors.inkMuted}
                        size={21}
                      />
                    </View>
                  </Surface>
                  <Surface className="mt-3 px-4 py-3">
                    <View className="flex-row items-center">
                      <Icon
                        name="clock"
                        color={themeColors.inkMuted}
                        size={30}
                      />
                      <View className="ml-4 flex-1">
                        <AppText variant="bodySmall" color="ink-muted">
                          Time
                        </AppText>
                        <TextInput
                          accessibilityLabel="Redo deadline time"
                          autoCapitalize="none"
                          className="m-0 p-0 font-rounded text-[20px] font-bold leading-[24px] text-ink"
                          onBlur={() => setEditingDeadlineField(null)}
                          onChangeText={setRedoTime}
                          onFocus={() => setEditingDeadlineField("time")}
                          placeholder="HH:mm"
                          value={redoTime}
                        />
                      </View>
                      <Icon
                        name="chevron"
                        color={themeColors.inkMuted}
                        size={21}
                      />
                    </View>
                  </Surface>
                  <View className="mt-3 flex-row items-center">
                    <Icon name="globe" color={themeColors.inkMuted} size={21} />
                    <AppText
                      variant="bodySmall"
                      color="ink-muted"
                      className="ml-2"
                    >
                      Household time · {householdTimezone}
                    </AppText>
                  </View>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-2"
                  >
                    The deadline must be later than now.
                  </AppText>
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-4 flex-row p-4"
                  >
                    <Icon name="info" color={themeColors.ink} size={23} />
                    <AppText
                      variant="bodySmall"
                      className="ml-3 flex-1"
                      style={{ fontSize: 13, lineHeight: 18 }}
                    >
                      Extras stay locked until the Redo is approved.{"\n"}
                      {selected.kind === "personal"
                        ? `If this Personal Chore fails, ${selected.childDisplayName} earns 0 kr with no penalty.`
                        : `If this claimed chore fails, ${selected.childDisplayName} receives the full ${selected.valueSek} kr penalty.`}
                    </AppText>
                  </Surface>
                </View>
              ) : (
                <View>
                  {selected.description ? (
                    <View className="mt-4">
                      <AppText variant="cardTitle">Parent instructions</AppText>
                      <AppText variant="bodySmall" className="mt-1">
                        {selected.description}
                      </AppText>
                    </View>
                  ) : null}
                  {selected.hasEvidence ? (
                    <SubmissionEvidenceViewer
                      submissionId={selected.submissionId}
                    />
                  ) : null}
                  <View className="mt-4 flex-row items-center justify-center">
                    <Icon name="check" color={themeColors.action} size={23} />
                    <AppText className="ml-2">
                      Approval adds {selected.valueSek} kr
                      {selected.isUnlockChore ? " and unlocks Extras" : ""}.
                    </AppText>
                  </View>
                </View>
              )}

              {error ? (
                <Surface tone="coral" elevated={false} className="mt-4 p-3">
                  <AppText variant="bodySmall" color="urgency">
                    {error}
                  </AppText>
                </Surface>
              ) : null}
            </ScrollView>

            <View
              className="border-t border-line bg-surfaceRaised px-5 pt-3"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              {settingRedo ? (
                <View>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mb-3 text-center"
                  >
                    This sends the chore back to {selected.childDisplayName}.
                  </AppText>
                  <ActionButton
                    tone="destructive"
                    label="Reject & require Redo"
                    trailing={
                      <Icon
                        name="check"
                        color={themeColors.onAction}
                        size={20}
                      />
                    }
                    loading={working === "reject"}
                    onPress={() => void rejectInitial(selected)}
                  />
                </View>
              ) : (
                <View className="gap-2">
                  <ActionButton
                    className="min-h-[44px]"
                    label={`Approve ${selected.valueSek} kr`}
                    trailing={
                      <Icon
                        name="check"
                        color={themeColors.onAction}
                        size={20}
                      />
                    }
                    loading={working === "approve"}
                    onPress={() => void approve(selected)}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={working === "reject"}
                    onPress={() =>
                      selected.source === "redo"
                        ? rejectRedo(selected)
                        : setSettingRedo(true)
                    }
                    className="min-h-[58px] items-center justify-center rounded-control border-2 border-urgency bg-surfaceRaised px-12"
                  >
                    <AppText variant="cardTitle" color="urgency">
                      {selected.source === "redo"
                        ? "Mark incomplete"
                        : "Set Redo deadline"}
                    </AppText>
                    {selected.source !== "redo" ? (
                      <AppText
                        variant="caption"
                        color="urgency"
                        className="mt-0.5"
                      >
                        Confirm rejection on the next screen
                      </AppText>
                    ) : null}
                    <View className="absolute right-4">
                      <Icon
                        name="chevron"
                        color={themeColors.urgency}
                        size={19}
                      />
                    </View>
                  </Pressable>
                </View>
              )}
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
