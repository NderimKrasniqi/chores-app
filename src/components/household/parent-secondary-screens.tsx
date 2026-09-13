import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { ParentHouseholdActivity } from "@/components/activity/parent-household-activity";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { HouseholdSummary } from "./household-card";

const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");
const familyArtwork = require("../../../assets/images/direction-c/onboarding-family.png");
const houseArtwork = require("../../../assets/images/direction-c/parent-access-hero.png");

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: "info" | "calendar" | "refresh";
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="min-h-[76px] flex-row items-center px-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoft">
        <DirectionCIcon name={icon} color={DirectionC.color.ink} size={25} />
      </View>
      <AppText color="ink-muted" className="ml-4 flex-1">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
      {onPress ? (
        <View className="ml-2">
          <DirectionCIcon
            name="chevron"
            color={DirectionC.color.ink}
            size={20}
          />
        </View>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function ParentActivityScreen({
  household,
  onBack,
  onAddChore,
}: {
  household: HouseholdSummary;
  onBack: () => void;
  onAddChore: () => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <View className="px-5">
        <TopBar title="Activity" onBack={onBack} />
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="display" className="mt-4">
          Household activity
        </AppText>
        <AppText variant="sectionTitle" className="mt-2 font-semibold">
          Approved chore wins from {household.name}.
        </AppText>
        <ParentHouseholdActivity
          householdId={household.householdId}
          showHistory
          onAddChore={onAddChore}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function ParentAccountScreen({
  parentName,
  parentEmail,
  household,
  onBack,
  onSwitchHousehold,
  onOpenHelp,
  onSignOut,
  signingOut,
}: {
  parentName: string;
  parentEmail: string;
  household: HouseholdSummary;
  onBack: () => void;
  onSwitchHousehold: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <View className="px-5">
        <TopBar title="Account" onBack={onBack} />
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Surface className="mt-3 flex-row items-center p-5">
          <Image
            source={parentAvatar}
            className="h-24 w-24 rounded-full bg-rewardSoft"
            contentFit="cover"
          />
          <View className="ml-5 flex-1">
            <AppText variant="screenTitle">{parentName}</AppText>
            <AppText className="mt-1">{parentEmail}</AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-6">
          Household
        </AppText>
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-2 h-[112px] overflow-hidden p-4"
        >
          <Image
            source={familyArtwork}
            className="absolute -bottom-10 -left-2 h-[150px] w-[190px]"
            contentFit="contain"
          />
          <View className="ml-[48%] flex-1 justify-center">
            <AppText variant="cardTitle">{household.name}</AppText>
            <AppText className="mt-1">Current household</AppText>
          </View>
        </Surface>
        <Pressable accessibilityRole="button" onPress={onSwitchHousehold}>
          <Surface className="mt-3 min-h-[82px] flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-actionSoft">
              <DirectionCIcon
                name="family"
                color={DirectionC.color.green}
                size={26}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">Switch household</AppText>
              <AppText variant="bodySmall" className="mt-1">
                Choose another household you belong to
              </AppText>
            </View>
            <DirectionCIcon
              name="chevron"
              color={DirectionC.color.ink}
              size={22}
            />
          </Surface>
        </Pressable>

        <AppText variant="sectionTitle" className="mt-6">
          Preferences
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
        >
          <Surface className="mt-2 min-h-[82px] flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-actionSoft">
              <DirectionCIcon
                name="info"
                color={DirectionC.color.green}
                size={25}
              />
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">Notifications</AppText>
              <AppText variant="bodySmall" className="mt-1">
                Manage device notification settings
              </AppText>
            </View>
            <DirectionCIcon
              name="chevron"
              color={DirectionC.color.ink}
              size={22}
            />
          </Surface>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpenHelp}>
          <Surface className="mt-3 min-h-[82px] flex-row items-center p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-infoSoft">
              <AppText variant="sectionTitle">?</AppText>
            </View>
            <View className="ml-4 flex-1">
              <AppText variant="cardTitle">Help & onboarding</AppText>
              <AppText variant="bodySmall" className="mt-1">
                Review how the app works
              </AppText>
            </View>
            <DirectionCIcon
              name="chevron"
              color={DirectionC.color.ink}
              size={22}
            />
          </Surface>
        </Pressable>

        <ActionButton
          tone="secondary"
          className="mt-7"
          label="Sign out"
          loading={signingOut}
          onPress={onSignOut}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function HouseholdSwitcherScreen({
  households,
  currentHouseholdId,
  onBack,
  onSelect,
}: {
  households: HouseholdSummary[];
  currentHouseholdId: HouseholdSummary["householdId"];
  onBack: () => void;
  onSelect: (householdId: HouseholdSummary["householdId"]) => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
      <View className="px-5">
        <TopBar title="Switch household" onBack={onBack} />
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="display" className="mt-5">
          Choose a household
        </AppText>
        <AppText className="mt-3 max-w-[350px]">
          This changes the Household shown in your Parent app.
        </AppText>

        <View className="mt-6 gap-4">
          {households.map((household) => {
            const current = household.householdId === currentHouseholdId;
            return (
              <Pressable
                key={household.householdId}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                onPress={() => onSelect(household.householdId)}
              >
                <Surface
                  tone={current ? "mint" : "raised"}
                  className={`min-h-[132px] overflow-hidden p-4 ${current ? "border-2 border-action" : "border border-infoSoftStrong"}`}
                >
                  <Image
                    source={familyArtwork}
                    className="absolute -bottom-9 -left-2 h-[170px] w-[200px]"
                    contentFit="contain"
                  />
                  <View className="ml-[48%] flex-1 justify-center pr-4">
                    <AppText variant="cardTitle">{household.name}</AppText>
                    <AppText variant="bodySmall" className="mt-1">
                      {household.children.length}{" "}
                      {household.children.length === 1 ? "child" : "children"} ·
                      Payout {formatWeekday(household.payoutWeekday)}
                    </AppText>
                    {current ? (
                      <View className="mt-2 flex-row items-center">
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-action">
                          <DirectionCIcon
                            name="check"
                            color={DirectionC.color.white}
                            size={18}
                          />
                        </View>
                        <AppText
                          variant="label"
                          color="action"
                          className="ml-2"
                        >
                          Current
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  {!current ? (
                    <View className="absolute right-3 top-1/2 -mt-5 h-10 w-10 items-center justify-center">
                      <DirectionCIcon
                        name="chevron"
                        color={DirectionC.color.ink}
                        size={23}
                      />
                    </View>
                  ) : null}
                </Surface>
              </Pressable>
            );
          })}
        </View>

        <Surface
          tone="lavender"
          elevated={false}
          className="mt-6 flex-row items-center p-4"
        >
          <DirectionCIcon
            name="family"
            color={DirectionC.color.green}
            size={32}
          />
          <AppText className="ml-4 flex-1">
            Your Parent account can belong to more than one Household.
          </AppText>
        </Surface>
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-5 text-center"
        >
          Child profiles stay separate and do not switch Households.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

export function HouseholdSettingsScreen({
  household,
  onBack,
  onOpenMoney,
}: {
  household: HouseholdSummary;
  onBack: () => void;
  onOpenMoney: () => void;
}) {
  const setTimezoneSetting = useServerConfirmedMutation(
    api.households.setTimezone,
  );
  const setWeeklyUnclaimAllowance = useServerConfirmedMutation(
    api.households.setWeeklyUnclaimAllowance,
  );
  const [editor, setEditor] = useState<"timezone" | "unclaims" | null>(null);
  const [timezone, setTimezone] = useState(household.timezone);
  const [weeklyUnclaims, setWeeklyUnclaims] = useState(
    String(household.weeklyUnclaimAllowance),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor(nextEditor: "timezone" | "unclaims") {
    setTimezone(household.timezone);
    setWeeklyUnclaims(String(household.weeklyUnclaimAllowance));
    setError(null);
    setEditor(nextEditor);
  }

  function closeEditor() {
    if (saving) return;
    setEditor(null);
    setError(null);
  }

  async function saveSetting() {
    const normalizedTimezone = timezone.trim();
    const normalizedAllowance = weeklyUnclaims.trim();

    if (!normalizedTimezone) {
      setError("Timezone is required.");
      return;
    }

    if (!/^\d+$/.test(normalizedAllowance)) {
      setError("Weekly unclaims must be a non-negative whole number.");
      return;
    }

    const allowance = Number(normalizedAllowance);

    if (!Number.isSafeInteger(allowance)) {
      setError("Weekly unclaims is too large.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editor === "timezone") {
        await setTimezoneSetting({
          householdId: household.householdId,
          timezone: normalizedTimezone,
        });
      } else {
        await setWeeklyUnclaimAllowance({
          householdId: household.householdId,
          weeklyUnclaimAllowance: allowance,
        });
      }
      setEditor(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update household settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
        <View className="px-5">
          <TopBar title="Household settings" onBack={onBack} />
        </View>
        <ScrollView
          contentContainerClassName="px-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-4 flex-row items-center">
            <Image
              source={houseArtwork}
              className="h-28 w-40"
              contentFit="contain"
            />
            <View className="ml-2 flex-1">
              <AppText variant="sectionTitle">{household.name}</AppText>
              <AppText variant="bodySmall" className="mt-1">
                Settings shared by {household.children.length}{" "}
                {household.children.length === 1 ? "child" : "children"} and{" "}
                {household.parents.length}{" "}
                {household.parents.length === 1 ? "parent" : "parents"}
              </AppText>
            </View>
          </View>

          <AppText variant="sectionTitle" className="mt-7">
            Schedule & payouts
          </AppText>
          <Surface className="mt-3 overflow-hidden">
            <SettingRow
              icon="info"
              label="Timezone"
              value={household.timezone}
              onPress={() => openEditor("timezone")}
            />
            <View className="mx-4 h-px bg-line" />
            <SettingRow
              icon="calendar"
              label="Payout day"
              value={formatWeekday(household.payoutWeekday)}
              onPress={onOpenMoney}
            />
          </Surface>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-4 flex-row p-4"
          >
            <DirectionCIcon
              name="clock"
              color={DirectionC.color.ink}
              size={28}
            />
            <AppText variant="bodySmall" className="ml-3 flex-1">
              Time changes affect future chores and payout periods. A payout-day
              change starts with the next period.
            </AppText>
          </Surface>

          <AppText variant="sectionTitle" className="mt-7">
            Chore flexibility
          </AppText>
          <Surface className="mt-3">
            <SettingRow
              icon="refresh"
              label="Weekly unclaims"
              value={`${household.weeklyUnclaimAllowance} per child`}
              onPress={() => openEditor("unclaims")}
            />
          </Surface>
          <AppText variant="bodySmall" color="ink-muted" className="mt-3">
            The same allowance applies to every child and resets each payout
            week.
          </AppText>

          <View className="mt-7 h-px bg-line" />
          <View className="mt-5 flex-row items-center px-2">
            <DirectionCIcon
              name="family"
              color={DirectionC.color.green}
              size={30}
            />
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="ml-4 flex-1"
            >
              Every Parent has equal authority to change household settings.
            </AppText>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={editor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditor}
      >
        <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-canvas">
          <View className="px-5">
            <TopBar
              title={
                editor === "timezone" ? "Change timezone" : "Weekly unclaims"
              }
              onBack={closeEditor}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-5 pb-8 pt-5"
          >
            {editor === "timezone" ? (
              <>
                <FormField
                  label="Household timezone"
                  value={timezone}
                  onChangeText={setTimezone}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Europe/Stockholm"
                  error={error}
                  helper="Use an IANA timezone such as Europe/Stockholm."
                />
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-5 flex-row p-4"
                >
                  <DirectionCIcon
                    name="clock"
                    color={DirectionC.color.ink}
                    size={26}
                  />
                  <AppText variant="bodySmall" className="ml-3 flex-1">
                    Existing chores and the open payout period keep their saved
                    times. The new timezone applies to future scheduling.
                  </AppText>
                </Surface>
              </>
            ) : (
              <>
                <FormField
                  label="Weekly unclaims per child"
                  value={weeklyUnclaims}
                  onChangeText={setWeeklyUnclaims}
                  keyboardType="number-pad"
                  placeholder="2"
                  error={error}
                  helper="Enter a whole number, including 0."
                />
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-5 flex-row p-4"
                >
                  <DirectionCIcon
                    name="refresh"
                    color={DirectionC.color.ink}
                    size={26}
                  />
                  <AppText variant="bodySmall" className="ml-3 flex-1">
                    The new limit applies equally to every Child. Unclaims
                    already used this payout week are not reset.
                  </AppText>
                </Surface>
              </>
            )}

            <ActionButton
              className="mt-6"
              label="Save setting"
              loading={saving}
              onPress={() => void saveSetting()}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
