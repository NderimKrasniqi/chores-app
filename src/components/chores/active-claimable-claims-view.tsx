import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChoreIcon } from "@/components/art";
import { PRESS, pressTransition } from "@/components/art/motion";
import { childAvatarTone, Avatar } from "@/components/ui/avatar";
import { ActionButton, AppText } from "@/design-system";
import { useTheme } from "@/design-system/theme";
import { formatTimestampDateTime } from "@/lib/dates";

import type { Id } from "../../../convex/_generated/dataModel";

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

function formatHomeDeadline(timestamp: number, timezone: string) {
  const time = new Intl.DateTimeFormat("en-SE", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
  return `Due ${relativeDayLabel(timestamp, timezone)}, ${time}`;
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
  const { tokens } = useTheme();
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

  const stateLabel = (claim: ActiveClaimableClaimViewModel) =>
    claim.claimState === "submitted"
      ? { label: "To check", color: tokens.info }
      : claim.claimState === "redo_required"
        ? { label: "Redo", color: tokens.urgency }
        : { label: "Working on it", color: tokens.action };

  const detailClaim = selectedClaim ?? unavailableClaim ?? undefined;
  const unavailable = unavailableClaim !== null && !selectedClaim;

  return (
    <View className={homeVariant ? "mt-6" : "mt-5"}>
      <AppText variant="sectionTitle">
        {claims.length === 1 ? "Extra in progress" : "Extras in progress"}
      </AppText>
      {actionError ? (
        <View className="mt-3 rounded-[18px] bg-urgencySoft px-4 py-3">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </View>
      ) : null}
      <View className="mt-3 gap-2.5">
        {claims.map((claim) => {
          const state = stateLabel(claim);
          return (
            <Pressable
              key={claim.claimId}
              accessibilityRole="button"
              accessibilityLabel={`Open active claim ${claim.title}, ${claim.claimedByDisplayName}, ${state.label}`}
              onPress={() => setSelectedClaimId(claim.claimId)}
            >
              {({ pressed }) => (
                <Animated.View
                  className="flex-row items-center gap-3 rounded-[22px] p-3"
                  style={[
                    {
                      backgroundColor: tokens.surface,
                      transform: [{ scale: pressed ? PRESS.scale : 1 }],
                    },
                    pressTransition,
                  ]}
                >
                  <ChoreIcon title={claim.title} size={48} animated={false} />
                  <View className="flex-1">
                    <AppText variant="cardTitle" numberOfLines={1}>
                      {claim.title}
                    </AppText>
                    <AppText variant="caption" color="ink-muted">
                      {claim.claimedByDisplayName} ·{" "}
                      {formatHomeDeadline(claim.deadlineAt, claim.timezone)}
                    </AppText>
                  </View>
                  <AppText variant="label" style={{ color: state.color }}>
                    {state.label}
                  </AppText>
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={detailClaim !== undefined}
        onRequestClose={() => {
          if (cancellingClaimId) return;
          setSelectedClaimId(null);
          setConfirmingClaimId(null);
          setUnavailableClaim(null);
        }}
      >
        <View className="flex-1 justify-end bg-scrim">
          {detailClaim ? (
            <SafeAreaView
              edges={["bottom"]}
              className="rounded-t-sheet px-5 pb-2 pt-5"
              style={{ backgroundColor: tokens.canvas }}
            >
              <View className="flex-row items-center gap-4">
                <ChoreIcon title={detailClaim.title} size={72} />
                <View className="flex-1">
                  <AppText variant="sectionTitle" numberOfLines={2}>
                    {detailClaim.title}
                  </AppText>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Avatar
                      tone={childAvatarTone(detailClaim.claimedByDisplayName)}
                      className="rounded-full"
                      fallbackLabel={detailClaim.claimedByDisplayName}
                      size={24}
                    />
                    <AppText variant="label">
                      {detailClaim.claimedByDisplayName} ·{" "}
                      {detailClaim.valueSek} kr
                    </AppText>
                  </View>
                </View>
              </View>

              <View
                className="mt-4 gap-1.5 rounded-[18px] p-4"
                style={{ backgroundColor: tokens.surface }}
              >
                <AppText variant="caption" color="ink-muted">
                  Claimed{" "}
                  {formatMoment(detailClaim.claimedAt, detailClaim.timezone)}
                </AppText>
                <AppText variant="caption" color="ink-muted">
                  {detailClaim.claimState === "redo_required" &&
                  detailClaim.redoDeadlineAt
                    ? `Redo due ${formatMoment(detailClaim.redoDeadlineAt, detailClaim.timezone)}`
                    : `Due ${formatMoment(detailClaim.deadlineAt, detailClaim.timezone)}`}
                </AppText>
                {detailClaim.description ? (
                  <AppText variant="bodySmall" className="mt-1">
                    {detailClaim.description}
                  </AppText>
                ) : null}
              </View>

              {unavailable ? (
                <AppText color="urgency" className="mt-4">
                  The deadline has passed, so this Extra can no longer be
                  cancelled. It resolves as done or not done.
                </AppText>
              ) : confirmingClaim ? (
                <>
                  <AppText variant="cardTitle" className="mt-5">
                    Cancel {confirmingClaim.title}?
                  </AppText>
                  <AppText color="ink-muted" className="mt-1">
                    No penalty for {confirmingClaim.claimedByDisplayName}, and
                    their weekly unclaim keys stay the same.
                  </AppText>
                  <ActionButton
                    className="mt-4"
                    tone="destructive"
                    label="Cancel Extra"
                    loading={cancellingClaimId === confirmingClaim.claimId}
                    onPress={() => void handleCancel(confirmingClaim)}
                  />
                  <ActionButton
                    className="mt-1"
                    tone="quiet"
                    label="Keep it"
                    disabled={cancellingClaimId !== null}
                    onPress={() => setConfirmingClaimId(null)}
                  />
                </>
              ) : (
                <>
                  <AppText variant="caption" color="ink-muted" className="mt-4">
                    Cancelling is on you as a Parent: no penalty for the kid and
                    no unclaim key used.
                  </AppText>
                  <ActionButton
                    className="mt-3"
                    tone="destructiveSecondary"
                    label="Cancel this Extra"
                    onPress={() => setConfirmingClaimId(detailClaim.claimId)}
                  />
                </>
              )}
              <ActionButton
                className="mt-1"
                tone="quiet"
                label="Close"
                disabled={cancellingClaimId !== null}
                onPress={() => {
                  setSelectedClaimId(null);
                  setConfirmingClaimId(null);
                  setUnavailableClaim(null);
                }}
              />
            </SafeAreaView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
