import { ChoreIcon } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { questTokens as themeColors } from "@/design-system/theme";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Id } from "../../../convex/_generated/dataModel";
import { formatTimestampDateTime } from "@/lib/dates";

type ActiveClaimState = "claimed" | "submitted" | "redo_required";

export type ActiveClaimableClaimViewModel = {
  claimId: Id<"choreClaims">;
  occurrenceId: Id<"choreOccurrences">;
  childId: Id<"children">;
  claimedByDisplayName: string;
  claimState: ActiveClaimState;
  claimedAt: number;
  title: string;
  description?: string;
  valueSek: number;
  scheduledLocalDate: string;
  timezone: string;
  deadlineAt: number;
  redoDeadlineAt?: number;
};

function localDateKey(value: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  } catch {
    return null;
  }
}

function dayNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function relativeDayLabel(timestamp: number, timezone: string) {
  const date = new Date(timestamp);
  const targetKey = localDateKey(date, timezone);
  const todayKey = localDateKey(new Date(), timezone);

  if (targetKey && todayKey) {
    const delta = dayNumber(targetKey) - dayNumber(todayKey);
    if (delta === 0) return "today";
    if (delta === 1) return "tomorrow";
    if (delta === -1) return "yesterday";
  }

  try {
    return formatTimestampDateTime(timestamp, timezone).split(" at ")[0];
  } catch {
    return date.toLocaleDateString();
  }
}

function formatMoment(timestamp: number, timezone: string) {
  try {
    const date = new Date(timestamp);
    const time = new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${relativeDayLabel(timestamp, timezone)}, ${time}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function formatClockTime(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
}

function formatHomeDeadline(timestamp: number, timezone: string) {
  const time = new Intl.DateTimeFormat("en-SE", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
  return `Due ${relativeDayLabel(timestamp, timezone)}, ${time}`;
}

function statusFor(claim: ActiveClaimableClaimViewModel) {
  if (claim.claimState === "submitted")
    return { label: "Waiting for review", tone: "info" as const };
  if (claim.claimState === "redo_required")
    return { label: "Redo required", tone: "urgent" as const };
  return { label: "Claimed", tone: "success" as const };
}

function statusDot(tone: "success" | "info" | "urgent") {
  return (
    <View
      className={`h-3 w-3 rounded-full ${tone === "success" ? "bg-action" : tone === "info" ? "bg-[#7C4DCE]" : "bg-urgency"}`}
    />
  );
}

function ClaimSummary({
  claim,
  homeVariant,
}: {
  claim: ActiveClaimableClaimViewModel;
  homeVariant: boolean;
}) {
  const status = statusFor(claim);
  if (homeVariant) {
    return (
      <Surface className="min-h-[98px] flex-row items-center p-2.5">
        <ChoreIcon title={claim.title} size={72} />
        <View className="ml-3 flex-1">
          <AppText variant="cardTitle" numberOfLines={2}>
            {claim.title}
          </AppText>
          <AppText className="mt-0.5">
            Claimed by {claim.claimedByDisplayName}
          </AppText>
          <View className="mt-2 flex-row items-center">
            <Icon name="clock" color={themeColors.urgency} size={20} />
            <AppText color="urgency" className="ml-1.5 flex-1">
              {formatHomeDeadline(claim.deadlineAt, claim.timezone)}
            </AppText>
          </View>
        </View>
        <Icon name="chevron" color={themeColors.ink} size={22} />
      </Surface>
    );
  }
  return (
    <Surface className="min-h-[116px] flex-row items-center p-3">
      <ChoreIcon title={claim.title} size={80} />
      <View className="ml-3 flex-1">
        <StatusChip
          label={status.label}
          tone={status.tone}
          icon={statusDot(status.tone)}
        />
        <AppText variant="cardTitle" className="mt-2" numberOfLines={2}>
          {claim.title}
        </AppText>
        <AppText className="mt-0.5 font-black">
          {claim.valueSek} kr · {claim.claimedByDisplayName}
        </AppText>
      </View>
      <Icon name="chevron" color={themeColors.ink} size={22} />
    </Surface>
  );
}

function ClaimDetail({
  claim,
  cancellationUnavailable = false,
}: {
  claim: ActiveClaimableClaimViewModel;
  cancellationUnavailable?: boolean;
}) {
  const status = cancellationUnavailable
    ? { label: "Deadline passed", tone: "urgent" as const }
    : statusFor(claim);
  const activeDeadline =
    claim.claimState === "redo_required" && claim.redoDeadlineAt
      ? claim.redoDeadlineAt
      : claim.deadlineAt;

  return (
    <ScrollView
      contentContainerClassName="px-5 pb-32"
      showsVerticalScrollIndicator={false}
    >
      <Surface className="p-3 pb-9">
        <View className="flex-row">
          <ChoreIcon title={claim.title} size={120} />
          <View className="ml-4 flex-1">
            <StatusChip
              label={status.label}
              tone={status.tone}
              icon={statusDot(status.tone)}
            />
            <AppText variant="sectionTitle" className="mt-3">
              {claim.title}
            </AppText>
            <AppText variant="amount" className="mt-1">
              {claim.valueSek} kr
            </AppText>
            <View className="mt-4 flex-row items-center">
              <Avatar
                tone={childAvatarTone(claim.claimedByDisplayName)}
                className="h-11 w-11"
                fallbackLabel={claim.claimedByDisplayName}
              />
              <AppText className="ml-2 flex-1">
                Claimed by {claim.claimedByDisplayName}
              </AppText>
            </View>
          </View>
        </View>

        <View className="mt-4 h-px bg-line" />
        <View className="mt-4 flex-row">
          <View className="flex-1 flex-row items-center pr-3">
            <Icon name="calendar" color={themeColors.inkMuted} size={27} />
            <AppText variant="bodySmall" className="ml-2 flex-1">
              Claimed {formatMoment(claim.claimedAt, claim.timezone)}
            </AppText>
          </View>
          <View className="flex-1 flex-row items-center border-l border-line pl-4">
            <Icon
              name="clock"
              color={
                cancellationUnavailable || claim.claimState === "redo_required"
                  ? themeColors.urgency
                  : themeColors.inkMuted
              }
              size={27}
            />
            <AppText
              variant="bodySmall"
              color={cancellationUnavailable ? "urgency" : "ink"}
              className="ml-2 flex-1"
            >
              {claim.claimState === "redo_required"
                ? "Redo deadline"
                : "Deadline"}{" "}
              {cancellationUnavailable ? "passed · " : ""}
              {cancellationUnavailable
                ? formatClockTime(activeDeadline, claim.timezone)
                : formatMoment(activeDeadline, claim.timezone)}
            </AppText>
          </View>
        </View>
      </Surface>

      <AppText variant="sectionTitle" className="mt-7">
        Instructions
      </AppText>
      <AppText className="mt-2">
        {claim.description || "Complete the chore as agreed with your family."}
      </AppText>

      {cancellationUnavailable ? (
        <Surface
          tone="coral"
          elevated={false}
          className="mt-7 flex-row items-center p-4"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-urgencySoft">
            <Icon name="clock" color={themeColors.urgency} size={29} />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="cardTitle" color="urgency">
              Cancellation unavailable
            </AppText>
            <AppText color="urgency" className="mt-1">
              This {claim.claimState === "redo_required" ? "Redo" : "claim"} has
              already missed its deadline and can no longer be cancelled.
            </AppText>
          </View>
        </Surface>
      ) : (
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-7 flex-row items-center p-4"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
            <Icon name="link" color={themeColors.ink} size={29} />
          </View>
          <View className="ml-5 flex-1">
            <AppText
              variant="cardTitle"
              style={{ fontSize: 19, lineHeight: 23 }}
            >
              Active commitment
            </AppText>
            <AppText className="mt-1" style={{ fontSize: 15, lineHeight: 20 }}>
              {claim.claimedByDisplayName} can claim another Extra when this
              {"\n"}is resolved.
            </AppText>
          </View>
        </Surface>
      )}
    </ScrollView>
  );
}

function isDeadlineCancellationError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("missed its deadline") ||
    normalized.includes("can no longer be cancelled")
  );
}

export function ActiveClaimableClaimsView({
  claims,
  onCancel,
  homeVariant = false,
  initialVisualState,
}: {
  claims: ActiveClaimableClaimViewModel[];
  onCancel: (claimId: Id<"choreClaims">) => Promise<void>;
  homeVariant?: boolean;
  initialVisualState?: "detail" | "confirmation" | "unavailable";
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const initialClaim = claims[0];
  const [selectedClaimId, setSelectedClaimId] =
    useState<Id<"choreClaims"> | null>(
      initialVisualState === "detail" || initialVisualState === "confirmation"
        ? (initialClaim?.claimId ?? null)
        : null,
    );
  const [confirmingClaimId, setConfirmingClaimId] =
    useState<Id<"choreClaims"> | null>(
      initialVisualState === "confirmation"
        ? (initialClaim?.claimId ?? null)
        : null,
    );
  const [cancellingClaimId, setCancellingClaimId] =
    useState<Id<"choreClaims"> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [unavailableClaim, setUnavailableClaim] =
    useState<ActiveClaimableClaimViewModel | null>(
      initialVisualState === "unavailable" ? (initialClaim ?? null) : null,
    );

  const selectedClaim = claims.find(
    (claim) => claim.claimId === selectedClaimId,
  );
  const confirmingClaim = claims.find(
    (claim) => claim.claimId === confirmingClaimId,
  );

  async function handleCancel(claim: ActiveClaimableClaimViewModel) {
    if (cancellingClaimId) return;
    setActionError(null);
    setCancellingClaimId(claim.claimId);
    try {
      await onCancel(claim.claimId);
      setConfirmingClaimId(null);
      setSelectedClaimId(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Could not cancel this claim. Please try again.";
      setConfirmingClaimId(null);
      if (isDeadlineCancellationError(message)) setUnavailableClaim(claim);
      else setActionError(message);
    } finally {
      setCancellingClaimId(null);
    }
  }

  if (claims.length === 0) return null;

  return (
    <View>
      <AppText
        variant="sectionTitle"
        className={`${homeVariant ? "mt-3" : "mt-5"}`}
      >
        {claims.length === 1 ? "Active commitment" : "Active commitments"}
      </AppText>
      {!homeVariant ? (
        <AppText variant="bodySmall" color="ink-muted" className="mt-1">
          Extra chores currently owned by Children in this household.
        </AppText>
      ) : null}

      {actionError ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-3">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </Surface>
      ) : null}

      <View className={`${homeVariant ? "mt-2" : "mt-3"} gap-3`}>
        {claims.map((claim) => (
          <Pressable
            key={claim.claimId}
            accessibilityRole="button"
            accessibilityLabel={`Open active claim ${claim.title}`}
            onPress={() => setSelectedClaimId(claim.claimId)}
          >
            <ClaimSummary claim={claim} homeVariant={homeVariant} />
          </Pressable>
        ))}
      </View>

      <Modal
        visible={selectedClaim !== undefined}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedClaimId(null)}
      >
        {selectedClaim ? (
          <SafeAreaView
            edges={[]}
            className="flex-1 bg-canvas"
            style={{ paddingTop: Math.max(0, safeAreaInsets.top - 8) }}
          >
            <View className="px-5">
              <TopBar
                title="Active claim"
                onBack={() => setSelectedClaimId(null)}
                titleStyle={{ fontSize: 20, lineHeight: 24 }}
              />
            </View>
            <ClaimDetail claim={selectedClaim} />
            <View className="absolute bottom-14 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
              <ActionButton
                label="Cancel claim"
                tone="destructiveSecondary"
                onPress={() => setConfirmingClaimId(selectedClaim.claimId)}
              />
            </View>
            {confirmingClaim ? (
              <View className="absolute inset-0 justify-end bg-scrim">
                <SafeAreaView
                  edges={["bottom"]}
                  className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
                >
                  <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
                  <View className="mt-5 h-16 w-16 items-center justify-center self-center rounded-full bg-urgencySoft">
                    <Icon
                      name="brokenLink"
                      color={themeColors.urgency}
                      size={34}
                    />
                  </View>
                  <AppText variant="screenTitle" className="mt-4 text-center">
                    Cancel this claim?
                  </AppText>
                  <AppText className="mt-2 text-center">
                    {confirmingClaim.title} will be cancelled for{" "}
                    {confirmingClaim.claimedByDisplayName}.
                  </AppText>
                  <AppText
                    color="action"
                    className="mt-2 text-center font-bold"
                  >
                    No penalty, and {confirmingClaim.claimedByDisplayName}’s
                    weekly unclaims are unchanged.
                  </AppText>
                  <ActionButton
                    className="mt-5"
                    label="Cancel claim"
                    tone="destructive"
                    loading={cancellingClaimId === confirmingClaim.claimId}
                    onPress={() => void handleCancel(confirmingClaim)}
                  />
                  <ActionButton
                    className="mt-2"
                    label="Keep claim"
                    tone="secondary"
                    disabled={cancellingClaimId !== null}
                    onPress={() => setConfirmingClaimId(null)}
                  />
                </SafeAreaView>
              </View>
            ) : null}
          </SafeAreaView>
        ) : null}
      </Modal>

      <Modal
        visible={unavailableClaim !== null}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setUnavailableClaim(null);
          setSelectedClaimId(null);
        }}
      >
        {unavailableClaim ? (
          <SafeAreaView
            edges={[]}
            className="flex-1 bg-canvas"
            style={{ paddingTop: Math.max(0, safeAreaInsets.top - 8) }}
          >
            <View className="px-5">
              <TopBar
                title="Active claim"
                titleStyle={{ fontSize: 20, lineHeight: 24 }}
                onBack={() => {
                  setUnavailableClaim(null);
                  setSelectedClaimId(null);
                }}
              />
            </View>
            <ClaimDetail claim={unavailableClaim} cancellationUnavailable />
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
