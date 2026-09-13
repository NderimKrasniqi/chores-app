import { SubmissionEvidenceViewer } from "@/components/evidence/submission-evidence-viewer";
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
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};

function getArtwork(title: string) {
  const value = title.toLowerCase();
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

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function ParentReviewsContent({
  householdId,
  householdTimezone,
}: {
  householdId: Id<"households">;
  householdTimezone: string;
}) {
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
  const [redoDate, setRedoDate] = useState(tomorrowDate);
  const [redoTime, setRedoTime] = useState("18:00");
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
    <View>
      <Surface
        tone={items.length > 0 ? "coral" : "mint"}
        elevated={false}
        className="flex-row items-center p-4"
      >
        <View
          className={`h-16 w-16 items-center justify-center rounded-full ${items.length > 0 ? "bg-urgency" : "bg-action"}`}
        >
          <DirectionCIcon
            name={items.length > 0 ? "chores" : "check"}
            color={DirectionC.color.white}
            size={31}
          />
        </View>
        <View className="ml-4 flex-1">
          <AppText variant="sectionTitle">
            {loading
              ? "Checking submissions…"
              : items.length > 0
                ? `${items.length} waiting for you`
                : "All caught up"}
          </AppText>
          <AppText className="mt-1">
            {items.length > 0
              ? "Completed work is ready to check."
              : "New submissions will appear here."}
          </AppText>
        </View>
      </Surface>

      <View className="mt-6 flex-row items-center justify-between">
        <AppText variant="sectionTitle">Waiting for review</AppText>
        <View className="min-w-12 items-center rounded-full bg-infoSoft px-3 py-1.5">
          <AppText variant="label">{items.length}</AppText>
        </View>
      </View>

      {items.length > 0 ? (
        <View className="mt-3 gap-3">
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
              <Surface className="min-h-[118px] flex-row items-center p-3">
                <Image
                  source={getArtwork(item.title)}
                  className="h-24 w-24 rounded-control bg-infoSoft"
                  contentFit="cover"
                />
                <View className="ml-3 flex-1">
                  <View className="flex-row items-start">
                    <View className="flex-1">
                      <AppText variant="cardTitle">{item.title}</AppText>
                      <AppText
                        variant="cardTitle"
                        color="urgency"
                        className="mt-0.5"
                      >
                        {item.valueSek} kr
                      </AppText>
                    </View>
                    {item.source === "redo" ? (
                      <View className="rounded-full bg-urgencySoft px-2 py-1">
                        <AppText variant="caption" color="urgency">
                          Redo
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <View className="mt-2 flex-row items-center">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-rewardSoft">
                      <AppText variant="caption">
                        {item.childDisplayName.charAt(0)}
                      </AppText>
                    </View>
                    <AppText variant="bodySmall" className="ml-2">
                      {item.childDisplayName}
                    </AppText>
                    <DirectionCIcon
                      name="calendar"
                      color={DirectionC.color.inkMuted}
                      size={18}
                    />
                    <AppText variant="bodySmall" className="ml-1">
                      {formatTime(item.submittedAt, item.timezone)}
                    </AppText>
                  </View>
                  <View className="mt-2 flex-row gap-2">
                    {item.isUnlockChore ? (
                      <View className="rounded-full bg-actionSoft px-2 py-1">
                        <AppText variant="caption" color="action">
                          Unlock chore
                        </AppText>
                      </View>
                    ) : null}
                    {item.hasEvidence ? (
                      <View className="rounded-full bg-infoSoft px-2 py-1">
                        <AppText variant="caption">Photo</AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
                <DirectionCIcon
                  name="chevron"
                  color={DirectionC.color.ink}
                  size={22}
                />
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
          <DirectionCIcon
            name="reviews"
            color={DirectionC.color.green}
            size={44}
          />
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

      <Surface
        tone="lavender"
        elevated={false}
        className="mt-5 flex-row items-center p-3"
      >
        <DirectionCIcon
          name="info"
          color={DirectionC.color.inkMuted}
          size={23}
        />
        <AppText variant="bodySmall" className="ml-3 flex-1">
          Approval creates the earning. A first rejection requires one Redo
          deadline.
        </AppText>
      </Surface>

      <Modal
        visible={selected !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelected(null)}
      >
        {selected ? (
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <View className="px-5">
              <TopBar
                title={settingRedo ? "Set Redo deadline" : "Review work"}
                onBack={() =>
                  settingRedo ? setSettingRedo(false) : setSelected(null)
                }
              />
            </View>
            <ScrollView
              contentContainerClassName="px-5 pb-7"
              showsVerticalScrollIndicator={false}
            >
              <Surface className="mt-2 p-4">
                <View className="flex-row items-center">
                  <Image
                    source={getArtwork(selected.title)}
                    className="h-24 w-24 rounded-full bg-rewardSoft"
                    contentFit="cover"
                  />
                  <View className="ml-4 flex-1">
                    <View className="self-start rounded-full bg-infoSoft px-3 py-1">
                      <AppText variant="caption">
                        {selected.source === "redo"
                          ? "Redo submission"
                          : "First submission"}
                      </AppText>
                    </View>
                    <AppText variant="cardTitle" className="mt-2">
                      {selected.childDisplayName}
                    </AppText>
                    <AppText variant="sectionTitle" className="mt-0.5">
                      {selected.title}
                    </AppText>
                    <View className="mt-2 flex-row gap-2">
                      <View className="rounded-control bg-urgencySoft px-3 py-2">
                        <AppText variant="cardTitle" color="urgency">
                          {selected.valueSek} kr
                        </AppText>
                      </View>
                      {selected.isUnlockChore ? (
                        <View className="rounded-control bg-actionSoft px-3 py-2">
                          <AppText variant="label" color="action">
                            Unlock chore
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View className="mt-4 h-px bg-line" />
                <View className="mt-4 flex-row">
                  <View className="flex-1 flex-row items-center">
                    <DirectionCIcon
                      name="calendar"
                      color={DirectionC.color.inkMuted}
                      size={23}
                    />
                    <AppText variant="bodySmall" className="ml-2">
                      Submitted{" "}
                      {formatTime(selected.submittedAt, selected.timezone)}
                    </AppText>
                  </View>
                  {selected.deadlineAt || selected.redoDeadlineAt ? (
                    <View className="flex-1 flex-row items-center">
                      <DirectionCIcon
                        name="clock"
                        color={DirectionC.color.inkMuted}
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
              </Surface>

              {settingRedo ? (
                <View>
                  <Surface
                    tone="coral"
                    elevated={false}
                    className="mt-5 flex-row items-center p-5"
                  >
                    <View className="h-16 w-16 items-center justify-center rounded-full bg-urgency">
                      <DirectionCIcon
                        name="refresh"
                        color={DirectionC.color.white}
                        size={31}
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <AppText variant="cardTitle">
                        Give {selected.childDisplayName} one more try
                      </AppText>
                      <AppText className="mt-1">
                        They can submit this chore once more before the new
                        deadline.
                      </AppText>
                    </View>
                  </Surface>
                  <AppText variant="sectionTitle" className="mt-6">
                    New deadline
                  </AppText>
                  <Surface className="mt-3 gap-4 p-4">
                    <FormField
                      label="Date"
                      placeholder="YYYY-MM-DD"
                      value={redoDate}
                      onChangeText={setRedoDate}
                      autoCapitalize="none"
                    />
                    <FormField
                      label="Time"
                      placeholder="HH:mm"
                      value={redoTime}
                      onChangeText={setRedoTime}
                      autoCapitalize="none"
                    />
                  </Surface>
                  <AppText
                    variant="bodySmall"
                    color="ink-muted"
                    className="mt-3"
                  >
                    Household time · {householdTimezone}
                  </AppText>
                  <Surface
                    tone="lavender"
                    elevated={false}
                    className="mt-4 p-4"
                  >
                    <AppText variant="bodySmall">
                      Extras stay locked until an Unlock Chore Redo is approved.
                    </AppText>
                  </Surface>
                </View>
              ) : (
                <View>
                  {selected.description ? (
                    <View className="mt-5">
                      <AppText variant="cardTitle">Parent instructions</AppText>
                      <AppText className="mt-2">{selected.description}</AppText>
                    </View>
                  ) : null}
                  {selected.hasEvidence ? (
                    <SubmissionEvidenceViewer
                      submissionId={selected.submissionId}
                    />
                  ) : null}
                  <View className="mt-5 flex-row items-center justify-center">
                    <DirectionCIcon
                      name="check"
                      color={DirectionC.color.green}
                      size={23}
                    />
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

            <View className="border-t border-line bg-surfaceRaised px-5 pt-3">
              {settingRedo ? (
                <ActionButton
                  tone="destructive"
                  label="Reject & require Redo"
                  loading={working === "reject"}
                  onPress={() => void rejectInitial(selected)}
                />
              ) : (
                <View className="gap-2">
                  <ActionButton
                    label={`Approve ${selected.valueSek} kr`}
                    loading={working === "approve"}
                    onPress={() => void approve(selected)}
                  />
                  <ActionButton
                    tone="secondary"
                    label={
                      selected.source === "redo"
                        ? "Mark incomplete"
                        : "Set Redo deadline"
                    }
                    loading={working === "reject"}
                    onPress={() =>
                      selected.source === "redo"
                        ? rejectRedo(selected)
                        : setSettingRedo(true)
                    }
                  />
                </View>
              )}
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
