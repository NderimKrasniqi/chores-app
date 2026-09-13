import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  StatusChip,
  Surface,
  TopBar,
} from "@/design-system";
import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const artwork = {
  bedroom: require("../../../assets/images/direction-c/chore-bedroom.png"),
  dog: require("../../../assets/images/direction-c/chore-dog-bowl.png"),
  dogWalk: require("../../../assets/images/direction-c/chore-dog-walk.png"),
  carWash: require("../../../assets/images/direction-c/chore-car-wash.png"),
  recycling: require("../../../assets/images/direction-c/chore-recycling.png"),
};
const childAvatar = require("../../../assets/images/direction-c/alex-avatar.png");

function artworkForTitle(title: string) {
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

function formatMoment(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function statusFor(claim: ActiveClaimableClaimViewModel) {
  if (claim.claimState === "submitted")
    return { label: "Waiting for review", tone: "info" as const };
  if (claim.claimState === "redo_required")
    return { label: "Redo required", tone: "urgent" as const };
  return { label: "Claimed", tone: "success" as const };
}

function ClaimSummary({ claim }: { claim: ActiveClaimableClaimViewModel }) {
  const status = statusFor(claim);
  return (
    <Surface className="min-h-[116px] flex-row items-center p-3">
      <Image
        source={artworkForTitle(claim.title)}
        className="h-24 w-28 rounded-control bg-[#F7EDDF]"
        contentFit="contain"
        accessible={false}
      />
      <View className="ml-3 flex-1">
        <StatusChip label={status.label} tone={status.tone} />
        <AppText variant="cardTitle" className="mt-2" numberOfLines={2}>
          {claim.title}
        </AppText>
        <AppText className="mt-0.5 font-black">
          {claim.valueSek} kr · {claim.claimedByDisplayName}
        </AppText>
      </View>
      <DirectionCIcon name="chevron" color={DirectionC.color.ink} size={22} />
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
      <Surface className="p-3">
        <View className="flex-row">
          <Image
            source={artworkForTitle(claim.title)}
            className="h-[180px] w-[145px] rounded-control bg-[#F7EDDF]"
            contentFit="contain"
            accessible={false}
          />
          <View className="ml-4 flex-1">
            <StatusChip label={status.label} tone={status.tone} />
            <AppText variant="sectionTitle" className="mt-3">
              {claim.title}
            </AppText>
            <AppText variant="amount" className="mt-1">
              {claim.valueSek} kr
            </AppText>
            <View className="mt-4 flex-row items-center">
              <Image
                source={childAvatar}
                className="h-11 w-11 rounded-full bg-rewardSoft"
                contentFit="cover"
                accessible={false}
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
            <DirectionCIcon
              name="calendar"
              color={DirectionC.color.inkMuted}
              size={27}
            />
            <AppText variant="bodySmall" className="ml-2 flex-1">
              Claimed {formatMoment(claim.claimedAt, claim.timezone)}
            </AppText>
          </View>
          <View className="flex-1 flex-row items-center border-l border-line pl-4">
            <DirectionCIcon
              name="clock"
              color={DirectionC.color.coral}
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
              {formatMoment(activeDeadline, claim.timezone)}
            </AppText>
          </View>
        </View>
      </Surface>

      <AppText variant="sectionTitle" className="mt-6">
        Instructions
      </AppText>
      <AppText className="mt-2">
        {claim.description || "Complete the chore as agreed with your family."}
      </AppText>

      {cancellationUnavailable ? (
        <Surface
          tone="coral"
          elevated={false}
          className="mt-6 flex-row items-center p-4"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-urgencySoft">
            <DirectionCIcon
              name="clock"
              color={DirectionC.color.coral}
              size={29}
            />
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
          className="mt-6 flex-row items-center p-4"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoftStrong">
            <DirectionCIcon
              name="brokenLink"
              color={DirectionC.color.ink}
              size={29}
            />
          </View>
          <View className="ml-4 flex-1">
            <AppText variant="cardTitle">Active commitment</AppText>
            <AppText className="mt-1">
              {claim.claimedByDisplayName} can claim another Extra when this is
              resolved.
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
}: {
  claims: ActiveClaimableClaimViewModel[];
  onCancel: (claimId: Id<"choreClaims">) => Promise<void>;
}) {
  const [selectedClaimId, setSelectedClaimId] =
    useState<Id<"choreClaims"> | null>(null);
  const [confirmingClaimId, setConfirmingClaimId] =
    useState<Id<"choreClaims"> | null>(null);
  const [cancellingClaimId, setCancellingClaimId] =
    useState<Id<"choreClaims"> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [unavailableClaim, setUnavailableClaim] =
    useState<ActiveClaimableClaimViewModel | null>(null);

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
      <AppText variant="sectionTitle" className="mt-5">
        Active commitments
      </AppText>
      <AppText variant="bodySmall" color="ink-muted" className="mt-1">
        Extra chores currently owned by Children in this household.
      </AppText>

      {actionError ? (
        <Surface tone="coral" elevated={false} className="mt-3 p-3">
          <AppText variant="bodySmall" color="urgency">
            {actionError}
          </AppText>
        </Surface>
      ) : null}

      <View className="mt-3 gap-3">
        {claims.map((claim) => (
          <Pressable
            key={claim.claimId}
            accessibilityRole="button"
            accessibilityLabel={`Open active claim ${claim.title}`}
            onPress={() => setSelectedClaimId(claim.claimId)}
          >
            <ClaimSummary claim={claim} />
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
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <TopBar
              title="Active claim"
              onBack={() => setSelectedClaimId(null)}
            />
            <ClaimDetail claim={selectedClaim} />
            <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-7 pt-3">
              <ActionButton
                label="Cancel claim"
                tone="secondary"
                onPress={() => setConfirmingClaimId(selectedClaim.claimId)}
                className="border-urgency"
              />
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={confirmingClaim !== undefined}
        onRequestClose={() => setConfirmingClaimId(null)}
      >
        <View className="flex-1 justify-end bg-scrim">
          {confirmingClaim ? (
            <SafeAreaView
              edges={["bottom"]}
              className="rounded-t-sheet bg-canvas px-5 pb-3 pt-3"
            >
              <View className="h-1.5 w-16 self-center rounded-full bg-infoSoftStrong" />
              <View className="mt-5 h-16 w-16 items-center justify-center self-center rounded-full bg-urgencySoft">
                <DirectionCIcon
                  name="brokenLink"
                  color={DirectionC.color.coral}
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
              <AppText color="action" className="mt-2 text-center font-bold">
                No penalty, and {confirmingClaim.claimedByDisplayName}’s weekly
                unclaims are unchanged.
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
          ) : null}
        </View>
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
          <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
            <TopBar
              title="Active claim"
              onBack={() => {
                setUnavailableClaim(null);
                setSelectedClaimId(null);
              }}
            />
            <ClaimDetail claim={unavailableClaim} cancellationUnavailable />
          </SafeAreaView>
        ) : null}
      </Modal>
    </View>
  );
}
