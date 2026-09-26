import { DirectionCIcon } from "@/components/ui/direction-c-icon";
import { DirectionCAvatar } from "@/components/ui/direction-c-avatar";
import { ParentHouseholdActivity } from "@/components/activity/parent-household-activity";
import {
  ParentChildAccessContent,
  type ParentChildAccessVisualFixture,
} from "@/components/child-access/parent-child-access-content";
import { DirectionC } from "@/constants/direction-c";
import {
  ActionButton,
  AppText,
  FormField,
  Surface,
  TopBar,
} from "@/design-system";
import { useServerConfirmedMutation } from "@/hooks/use-server-confirmed-mutation";
import { AppImage as Image } from "@/components/ui/app-image";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { HouseholdSummary, PayoutWeekday } from "./household-card";

const parentAvatar = require("../../../assets/images/direction-c/sam-avatar.png");
const familyArtwork = require("../../../assets/images/direction-c/household-family.png");
const houseArtwork = require("../../../assets/images/direction-c/household-home.png");
const grandmaHouseArtwork = require("../../../assets/images/direction-c/household-grandma.png");

function formatWeekday(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

const payoutWeekdays: PayoutWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export function ParentChildAccessScreen({
  householdId,
  timezone,
  child,
  onBack,
  visualFixture,
}: {
  householdId: Id<"households">;
  timezone: string;
  child: HouseholdSummary["children"][number];
  onBack: () => void;
  visualFixture?: ParentChildAccessVisualFixture;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-canvas">
      <View
        className="px-3"
        style={{ paddingTop: Math.max(0, insets.top - 8) }}
      >
        <TopBar
          title="Child access"
          onBack={onBack}
          titleStyle={{ fontSize: 20, lineHeight: 24 }}
        />
      </View>
      <ScrollView
        contentContainerClassName="px-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <ParentChildAccessContent
          householdId={householdId}
          childId={child.childId}
          childDisplayName={child.displayName}
          timezone={timezone}
          visualFixture={visualFixture}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  value,
  tone = "lavender",
  onPress,
}: {
  icon: "globe" | "calendar" | "refresh";
  label: string;
  value: string;
  tone?: "mint" | "lavender";
  onPress?: () => void;
}) {
  const content = (
    <View className="min-h-[72px] flex-row items-center px-3">
      <View
        className={`h-14 w-14 items-center justify-center rounded-full ${tone === "mint" ? "bg-actionSoftStrong" : "bg-infoSoft"}`}
      >
        <DirectionCIcon
          name={icon}
          color={
            tone === "mint" ? DirectionC.color.greenDeep : DirectionC.color.ink
          }
          size={24}
        />
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
      <View className="px-3">
        <TopBar
          title="Activity"
          onBack={onBack}
          titleStyle={{ fontSize: 22, lineHeight: 28 }}
        />
      </View>
      <ScrollView
        contentContainerClassName="px-3 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <ParentHouseholdActivity
          householdId={household.householdId}
          showHistory
          onAddChore={onAddChore}
          historyHeader={
            <View>
              <AppText
                variant="screenTitle"
                className="mt-1"
                style={{ fontSize: 32, lineHeight: 36 }}
              >
                Household activity
              </AppText>
              <AppText variant="bodySmall" className="mt-1">
                Approved chore wins from {household.name}.
              </AppText>
            </View>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function ParentAccountScreen({
  parentName,
  parentEmail,
  household,
  canSwitchHousehold,
  onBack,
  onSwitchHousehold,
  onOpenHelp,
  onSignOut,
  signingOut,
}: {
  parentName: string;
  parentEmail: string;
  household: HouseholdSummary;
  canSwitchHousehold: boolean;
  onBack: () => void;
  onSwitchHousehold: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-canvas">
      <View
        className="px-5"
        style={{ paddingTop: Math.max(0, insets.top - 8) }}
      >
        <TopBar
          title="Account"
          onBack={onBack}
          titleStyle={{ fontSize: 20, lineHeight: 24 }}
        />
      </View>
      <ScrollView
        contentContainerClassName="px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Surface className="mt-3 flex-row items-center p-3">
          <DirectionCAvatar
            source={parentAvatar}
            tone="parent"
            className="h-28 w-28"
          />
          <View className="ml-7 flex-1">
            <AppText
              variant="screenTitle"
              style={{ fontSize: 32, lineHeight: 36 }}
            >
              {parentName}
            </AppText>
            <AppText className="mt-1" style={{ fontSize: 17, lineHeight: 22 }}>
              {parentEmail}
            </AppText>
          </View>
        </Surface>

        <AppText variant="sectionTitle" className="mt-6">
          Household
        </AppText>
        <Surface
          tone="lavender"
          elevated={false}
          className="mt-1 h-[104px] overflow-hidden p-3"
        >
          <Image
            source={familyArtwork}
            className="absolute -bottom-10 -left-2 h-[160px] w-[180px]"
            contentFit="contain"
          />
          <View className="ml-[46%] flex-1 justify-center">
            <AppText
              variant="cardTitle"
              style={{ fontSize: 19, lineHeight: 23 }}
            >
              {household.name}
            </AppText>
            <AppText className="mt-1" style={{ fontSize: 16, lineHeight: 20 }}>
              Current household
            </AppText>
          </View>
        </Surface>
        {canSwitchHousehold ? (
          <Pressable accessibilityRole="button" onPress={onSwitchHousehold}>
            <Surface className="mt-2 h-[76px] flex-row items-center p-3">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-actionSoft">
                <DirectionCIcon
                  name="family"
                  color={DirectionC.color.green}
                  size={26}
                />
              </View>
              <View className="ml-6 flex-1">
                <AppText
                  variant="cardTitle"
                  style={{ fontSize: 19, lineHeight: 23 }}
                >
                  Switch household
                </AppText>
                <AppText
                  variant="bodySmall"
                  className="mt-0"
                  style={{ fontSize: 14, lineHeight: 18 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
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
        ) : null}

        <AppText variant="sectionTitle" className="mt-4">
          Preferences
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openSettings()}
        >
          <Surface className="mt-2 h-[72px] flex-row items-center p-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-actionSoft">
              <DirectionCIcon
                name="bell"
                color={DirectionC.color.green}
                size={25}
              />
            </View>
            <View className="ml-6 flex-1">
              <AppText
                variant="cardTitle"
                style={{ fontSize: 19, lineHeight: 23 }}
              >
                Notifications
              </AppText>
              <AppText
                variant="bodySmall"
                className="mt-0"
                style={{ fontSize: 14, lineHeight: 18 }}
                numberOfLines={1}
              >
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
          <Surface className="mt-3 h-[72px] flex-row items-center p-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-infoSoft">
              <DirectionCIcon
                name="help"
                color={DirectionC.color.info}
                size={26}
              />
            </View>
            <View className="ml-6 flex-1">
              <AppText
                variant="cardTitle"
                style={{ fontSize: 19, lineHeight: 23 }}
              >
                Help & onboarding
              </AppText>
              <AppText
                variant="bodySmall"
                className="mt-0"
                style={{ fontSize: 14, lineHeight: 18 }}
                numberOfLines={1}
              >
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
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-canvas">
      <View
        className="px-3"
        style={{ paddingTop: Math.max(0, insets.top - 8) }}
      >
        <TopBar
          title="Switch household"
          onBack={onBack}
          titleStyle={{ fontSize: 20, lineHeight: 24 }}
        />
      </View>
      <ScrollView
        contentContainerClassName="px-3 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <AppText
          variant="display"
          className="ml-5 mt-7"
          style={{ fontSize: 34, lineHeight: 38 }}
          numberOfLines={1}
        >
          Choose a household
        </AppText>
        <AppText
          className="ml-5 mt-3 max-w-[280px]"
          style={{ fontSize: 17, lineHeight: 22 }}
        >
          This changes the Household shown in your Parent app.
        </AppText>

        <View className="mt-8 gap-5">
          {households.map((household) => {
            const current = household.householdId === currentHouseholdId;
            const isGrandmasHouse = household.name
              .toLowerCase()
              .includes("grandma");
            return (
              <Pressable
                key={household.householdId}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                onPress={() => onSelect(household.householdId)}
              >
                <Surface
                  tone={current ? "mint" : "raised"}
                  className={`min-h-[144px] overflow-hidden p-3 ${current ? "border-2 border-action" : "border border-infoSoftStrong"}`}
                >
                  <Image
                    source={
                      current
                        ? familyArtwork
                        : isGrandmasHouse
                          ? grandmaHouseArtwork
                          : houseArtwork
                    }
                    className="absolute -bottom-9 -left-2 h-[170px] w-[200px]"
                    contentFit="contain"
                  />
                  <View
                    className={`${current ? "ml-[50%]" : "ml-[45%]"} flex-1 justify-center pr-3`}
                  >
                    <AppText
                      variant="cardTitle"
                      style={{ fontSize: 19, lineHeight: 23 }}
                      numberOfLines={1}
                    >
                      {household.name}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      className="mt-1"
                      style={{ fontSize: 14, lineHeight: 18 }}
                      numberOfLines={1}
                    >
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
                          style={{ fontSize: 16, lineHeight: 20 }}
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
          className="mt-6 min-h-[96px] flex-row items-center p-3"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-infoSoft">
            <View className="relative h-12 w-16">
              <View className="absolute left-0 top-1">
                <DirectionCIcon
                  name="home"
                  color={DirectionC.color.green}
                  size={38}
                />
              </View>
              <View className="absolute left-5 top-0">
                <DirectionCIcon
                  name="home"
                  color={DirectionC.color.info}
                  size={38}
                />
              </View>
            </View>
          </View>
          <AppText className="ml-12 flex-1">
            Your Parent account can belong{"\n"}to more than one Household.
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
}: {
  household: HouseholdSummary;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const setTimezoneSetting = useServerConfirmedMutation(
    api.households.setTimezone,
  );
  const setPayoutWeekdaySetting = useServerConfirmedMutation(
    api.households.setPayoutWeekday,
  );
  const setWeeklyUnclaimAllowance = useServerConfirmedMutation(
    api.households.setWeeklyUnclaimAllowance,
  );
  const [editor, setEditor] = useState<
    "timezone" | "payout" | "unclaims" | null
  >(null);
  const [timezone, setTimezone] = useState(household.timezone);
  const [payoutWeekday, setPayoutWeekday] = useState<PayoutWeekday>(
    household.payoutWeekday,
  );
  const [weeklyUnclaims, setWeeklyUnclaims] = useState(
    String(household.weeklyUnclaimAllowance),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor(nextEditor: "timezone" | "payout" | "unclaims") {
    setTimezone(household.timezone);
    setPayoutWeekday(household.payoutWeekday);
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

    if (editor === "timezone" && !normalizedTimezone) {
      setError("Timezone is required.");
      return;
    }

    if (editor === "unclaims" && !/^\d+$/.test(normalizedAllowance)) {
      setError("Weekly unclaims must be a non-negative whole number.");
      return;
    }

    const allowance = Number(normalizedAllowance);

    if (editor === "unclaims" && !Number.isSafeInteger(allowance)) {
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
      } else if (editor === "payout") {
        await setPayoutWeekdaySetting({
          householdId: household.householdId,
          payoutWeekday,
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
      <SafeAreaView edges={[]} className="flex-1 bg-canvas">
        <View
          className="px-3"
          style={{ paddingTop: Math.max(0, insets.top - 18) }}
        >
          <TopBar
            title="Household settings"
            onBack={onBack}
            titleStyle={{ fontSize: 20, lineHeight: 24 }}
          />
        </View>
        <ScrollView
          contentContainerClassName="px-3 pb-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="relative mt-0 h-[116px]">
            <Image
              source={houseArtwork}
              className="absolute -left-6 h-[120px] w-[170px]"
              contentFit="contain"
            />
            <View className="absolute bottom-[35px] left-[138px] right-0">
              <AppText
                variant="sectionTitle"
                style={{ fontSize: 22, lineHeight: 26 }}
                numberOfLines={1}
              >
                {household.name}
              </AppText>
              <AppText
                variant="bodySmall"
                className="mt-1"
                style={{ fontSize: 13, lineHeight: 17, letterSpacing: -0.2 }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Settings shared by {household.children.length}{" "}
                {household.children.length === 1 ? "child" : "children"} and{" "}
                {household.parents.length}{" "}
                {household.parents.length === 1 ? "parent" : "parents"}
              </AppText>
            </View>
          </View>

          <AppText
            variant="sectionTitle"
            className="mt-5"
            style={{ fontSize: 20, lineHeight: 24 }}
          >
            Schedule & payouts
          </AppText>
          <Surface className="mt-5 overflow-hidden">
            <SettingRow
              icon="globe"
              label="Timezone"
              value={household.timezone}
              onPress={() => openEditor("timezone")}
            />
            <View className="mx-3 h-px bg-line" />
            <SettingRow
              icon="calendar"
              label="Payout day"
              value={formatWeekday(household.payoutWeekday)}
              onPress={() => openEditor("payout")}
            />
          </Surface>
          <Surface
            tone="lavender"
            elevated={false}
            className="mt-5 flex-row p-4"
          >
            <DirectionCIcon
              name="clock"
              color={DirectionC.color.ink}
              size={28}
            />
            <AppText
              variant="bodySmall"
              color="ink-muted"
              className="ml-3 flex-1"
            >
              Time changes affect future chores and payout periods. A payout-day
              change starts with the next period.
            </AppText>
          </Surface>

          <AppText
            variant="sectionTitle"
            className="mt-8"
            style={{ fontSize: 20, lineHeight: 24 }}
          >
            Chore flexibility
          </AppText>
          <Surface className="mt-3">
            <SettingRow
              icon="refresh"
              label="Weekly unclaims"
              value={`${household.weeklyUnclaimAllowance} per child`}
              tone="mint"
              onPress={() => openEditor("unclaims")}
            />
          </Surface>
          <AppText variant="bodySmall" color="ink-muted" className="mt-4">
            The same allowance applies to every child and resets each payout
            week.
          </AppText>

          <View className="mt-8 h-px bg-line" />
          <View className="mt-6 flex-row items-center px-2">
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
              Every parent has equal authority to change household settings.
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
                editor === "timezone"
                  ? "Change timezone"
                  : editor === "payout"
                    ? "Payout day"
                    : "Weekly unclaims"
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
            ) : editor === "payout" ? (
              <>
                <AppText variant="label">Payout weekday</AppText>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {payoutWeekdays.map((day) => {
                    const selected = payoutWeekday === day;
                    return (
                      <Pressable
                        key={day}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setPayoutWeekday(day)}
                        className={`min-h-target min-w-[92px] flex-1 items-center justify-center rounded-control px-3 ${selected ? "bg-action" : "border-2 border-infoSoftStrong bg-surfaceRaised"}`}
                      >
                        <AppText
                          variant="label"
                          color={selected ? "white" : "ink"}
                        >
                          {formatWeekday(day)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <Surface
                  tone="lavender"
                  elevated={false}
                  className="mt-5 flex-row p-4"
                >
                  <DirectionCIcon
                    name="calendar"
                    color={DirectionC.color.ink}
                    size={26}
                  />
                  <AppText variant="bodySmall" className="ml-3 flex-1">
                    The current payout period keeps its saved closing boundary.{" "}
                    {formatWeekday(payoutWeekday)} starts the next period.
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
