import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";

import { PiggyPlanet, RocketTrack, StarBuddy } from "@/components/art";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/design-system";
import { questTokens as tokens } from "@/design-system/theme";
import { formatLocalDate } from "@/lib/dates";

import { api } from "../../../convex/_generated/api";

export type ChildMoneyOverview = FunctionReturnType<typeof api.payouts.getMine>;
type Entry = ChildMoneyOverview["child"]["thisPeriodEntries"][number];
type Payout = NonNullable<ChildMoneyOverview["child"]["latestPayout"]>;

const TIMELINE_LIMIT = 6;
/** Matches the server's cap on this period's entries (convex/payouts.ts). */
const SERVER_ENTRY_CAP = 100;
const REFRESH_MS = 10 * 60_000;
const DAY_MS = 86_400_000;

function localDateKey(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

function dayNumber(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** One short label per local date from start to end (inclusive). */
function weekDayLabels(startLocalDate: string, endLocalDate: string) {
  const first = dayNumber(startLocalDate);
  const count = Math.max(1, dayNumber(endLocalDate) - first + 1);
  return Array.from({ length: count }, (_, i) =>
    new Date((first + i) * DAY_MS).toLocaleDateString("en-SE", {
      weekday: "narrow",
      timeZone: "UTC",
    }),
  );
}

function shortWeekday(timestamp: number, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-SE", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function signed(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)} kr`;
}

export function ChildMoneyContent() {
  // `now` picks the payout period, so it must move forward while the tab
  // stays mounted: on return to the app and every few minutes.
  const [queryNow, setQueryNow] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setQueryNow(Date.now());
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  const overview = useQuery(api.payouts.getMine, { now: queryNow });

  if (overview === undefined) {
    return (
      <View className="items-center pb-6 pt-8">
        <PiggyPlanet size={150} />
        <AppText color="ink-muted" className="mt-3 font-body-bold">
          Counting your coins…
        </AppText>
      </View>
    );
  }

  return <ChildMoneyView overview={overview} now={queryNow} />;
}

/**
 * Money as a piggy planet: the balance is the planet, the payout week is a
 * rocket flying to payday, and this week's coins land on a timeline.
 */
export function ChildMoneyView({
  overview,
  now,
}: {
  overview: ChildMoneyOverview;
  now: number;
}) {
  const { child, currentPeriod } = overview;
  const balance = child.runningBalanceSek;
  const negative = balance < 0;

  return (
    <View className="pb-6">
      <View className="items-center">
        <PiggyPlanet size={190} negative={negative} />
        <AppText
          variant="label"
          color="ink-muted"
          className="-mt-2 uppercase tracking-[1.4px]"
        >
          Your planet
        </AppText>
        <AppText
          className="mt-0.5 w-full text-center font-display text-[52px] leading-[60px]"
          color={negative ? "pink" : "gold"}
          numberOfLines={1}
          accessibilityLabel={`Balance ${balance} kr`}
          testID="task14-running-balance-value"
        >
          {balance} kr
        </AppText>
        <AppText
          variant="bodySmall"
          color="ink-muted"
          className="mt-0.5 px-6 text-center font-body-bold"
        >
          {negative
            ? `In the shadow. The next ${Math.abs(balance)} kr you earn brings it back to 0.`
            : "Approved quests add coins to your planet."}
        </AppText>
      </View>

      <WeekFlight period={currentPeriod} now={now} />
      <CoinTimeline
        entries={child.thisPeriodEntries}
        timezone={currentPeriod.timezone}
      />
      <PayoutPostcard payout={child.latestPayout} balance={balance} />
      <HowItWorks />
    </View>
  );
}

function WeekFlight({
  period,
  now,
}: {
  period: ChildMoneyOverview["currentPeriod"];
  now: number;
}) {
  const labels = weekDayLabels(period.startLocalDate, period.endLocalDate);
  const today = localDateKey(now, period.timezone);
  const todayIndex = Math.min(
    labels.length - 1,
    Math.max(0, dayNumber(today) - dayNumber(period.startLocalDate)),
  );
  // The period ends as payday starts, so there's always at least a day left.
  const daysLeft = Math.max(
    1,
    dayNumber(period.endLocalDate) - dayNumber(today),
  );
  const span = Math.max(1, period.endAt - period.startAt);
  const progress = (now - period.startAt) / span;
  const payday = capitalize(period.payoutWeekday);
  const countdown = `${daysLeft} ${daysLeft === 1 ? "day" : "days"} to go`;

  return (
    <View
      className="mt-6 rounded-large bg-surface px-4 pb-3 pt-4"
      accessible
      accessibilityLabel={`Payday ${payday}. ${countdown}.`}
    >
      <View className="flex-row items-baseline justify-between">
        <AppText className="font-display text-[19px]">Payday {payday}</AppText>
        <AppText variant="caption" color="accent">
          {countdown}
        </AppText>
      </View>
      <AppText variant="caption" color="ink-muted" className="mt-0.5">
        {formatLocalDate(period.startLocalDate)} –{" "}
        {formatLocalDate(period.endLocalDate)}
      </AppText>
      <View className="mt-4">
        <RocketTrack
          progress={progress}
          dayLabels={labels}
          todayIndex={todayIndex}
        />
      </View>
    </View>
  );
}

function CoinTimeline({
  entries,
  timezone,
}: {
  entries: Entry[];
  timezone: string;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.amountSek, 0);
  // Past the server cap the list is only the latest entries, so no total.
  const complete = entries.length < SERVER_ENTRY_CAP;
  const shown = entries.slice(0, TIMELINE_LIMIT);
  const hidden = entries.length - shown.length;

  return (
    <View className="mt-6">
      <View className="flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">This week’s coins</AppText>
        {entries.length > 0 && complete ? (
          <AppText
            className="font-display text-[18px]"
            color={total < 0 ? "pink" : "gold"}
          >
            {signed(total)}
          </AppText>
        ) : null}
      </View>

      {entries.length === 0 ? (
        <View className="mt-3 flex-row items-end gap-2">
          <StarBuddy size={52} mood="wave" />
          <View className="mb-5 flex-1 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3">
            <AppText className="font-body-heavy text-[15px]">
              No coins yet this week. Quests fill your planet!
            </AppText>
          </View>
        </View>
      ) : (
        <View className="mt-3 rounded-large bg-surface px-4 py-1">
          {shown.map((entry, i) => (
            <CoinRow
              key={`${entry.createdAt}-${i}`}
              entry={entry}
              timezone={timezone}
              last={i === shown.length - 1 && hidden === 0}
            />
          ))}
          {hidden > 0 ? (
            <AppText
              variant="caption"
              color="ink-muted"
              className="py-3 text-center"
            >
              {complete
                ? `+${hidden} more this week`
                : "Showing your latest coins"}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

function CoinRow({
  entry,
  timezone,
  last,
}: {
  entry: Entry;
  timezone: string;
  last: boolean;
}) {
  const penalty = entry.kind === "penalty";
  const title = entry.choreTitle ?? "A chore";
  return (
    <View
      className={`min-h-[56px] flex-row items-center gap-3 py-2.5 ${last ? "" : "border-b border-nightRaised"}`}
      accessible
      accessibilityLabel={`${title}, ${penalty ? "missed" : "approved"}, ${signed(entry.amountSek)}`}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full border-b-[3px] ${penalty ? "border-nightRaised bg-pink" : "border-goldShade bg-gold"}`}
      >
        <Icon
          name={penalty ? "minus" : "plus"}
          color={tokens.night}
          size={16}
        />
      </View>
      <View className="flex-1">
        <AppText
          className="font-body-heavy text-[15px] leading-[20px]"
          numberOfLines={1}
        >
          {title}
        </AppText>
        <AppText variant="caption" color="ink-muted">
          {penalty ? "Extra not finished" : "Approved"} ·{" "}
          {shortWeekday(entry.createdAt, timezone)}
        </AppText>
      </View>
      <AppText
        className="font-display text-[17px]"
        color={penalty ? "pink" : "gold"}
      >
        {signed(entry.amountSek)}
      </AppText>
    </View>
  );
}

/** The last closed week, told as a postcard from payday. */
function PayoutPostcard({
  payout,
  balance,
}: {
  payout: Payout | null;
  balance: number;
}) {
  return (
    <View className="mt-6">
      <AppText variant="sectionTitle">Last payday</AppText>
      <View className="mt-3 overflow-hidden rounded-large bg-surface p-4">
        {!payout ? (
          <PostcardBody
            badge={{ icon: "star", label: "Coming up", tone: "accent" }}
            title="Your first payday is coming"
            body="When this week closes, a Parent pays out whatever your planet holds above 0 kr."
          />
        ) : payout.status === "pending" ? (
          <>
            <PostcardBody
              badge={{ icon: "clock", label: "On its way", tone: "accent" }}
              title={`A Parent will send you ${payout.amountDueSek} kr`}
              body={`For the week ending ${formatLocalDate(payout.periodEndLocalDate)}. It’s already counted in your balance.`}
            />
            <View className="mt-4 flex-row items-center justify-center gap-3 rounded-control bg-canvas px-3 py-3">
              <AmountStop label="Now" value={balance} />
              <Icon name="chevron" color={tokens.inkMuted} size={18} />
              <AmountStop
                label="After it’s paid"
                value={balance - payout.amountDueSek}
              />
            </View>
          </>
        ) : payout.status === "paid" ? (
          <PostcardBody
            badge={{ icon: "check", label: "Paid", tone: "primary" }}
            title={`${payout.amountDueSek} kr landed`}
            body={`A Parent paid the week ending ${formatLocalDate(payout.periodEndLocalDate)}.`}
          />
        ) : payout.balanceAtCloseSek < 0 ? (
          <PostcardBody
            badge={{ icon: "redo", label: "Carried over", tone: "pink" }}
            title="Nothing to pay this time"
            body={`The week ended at ${payout.balanceAtCloseSek} kr, so it carried into this week.`}
          />
        ) : (
          <PostcardBody
            badge={{ icon: "minus", label: "Empty", tone: "muted" }}
            title="Nothing to pay this time"
            body="Your planet was at 0 kr when the week closed."
          />
        )}
        {payout && payout.pendingOutcomeCount > 0 ? (
          <AppText variant="caption" color="ink-muted" className="mt-3">
            {payout.pendingOutcomeCount === 1
              ? "1 chore wasn’t decided yet when this week closed. It counts in a later week, once a Parent decides."
              : `${payout.pendingOutcomeCount} chores weren’t decided yet when this week closed. They count in a later week, once a Parent decides.`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function PostcardBody({
  badge,
  title,
  body,
}: {
  badge: {
    icon: "star" | "clock" | "check" | "redo" | "minus";
    label: string;
    tone: "accent" | "primary" | "pink" | "muted";
  };
  title: string;
  body: string;
}) {
  const bg = {
    accent: "bg-accent",
    primary: "bg-primary",
    pink: "bg-pink",
    muted: "bg-nightRaised",
  }[badge.tone];
  return (
    <View>
      <View
        className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1 ${bg}`}
      >
        <Icon name={badge.icon} color={tokens.night} size={13} />
        <AppText className="font-body-heavy text-[12px] uppercase tracking-[1.1px] text-night">
          {badge.label}
        </AppText>
      </View>
      <AppText className="mt-2.5 font-display text-[20px] leading-[25px]">
        {title}
      </AppText>
      <AppText
        variant="bodySmall"
        color="ink-muted"
        className="mt-1 font-body-bold"
      >
        {body}
      </AppText>
    </View>
  );
}

function AmountStop({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <AppText variant="caption" color="ink-muted">
        {label}
      </AppText>
      <AppText
        className="font-display text-[20px]"
        color={value < 0 ? "pink" : "gold"}
      >
        {value} kr
      </AppText>
    </View>
  );
}

function HowItWorks() {
  return (
    <View className="mt-6 gap-2 rounded-large border-2 border-dashed border-nightRaised p-4">
      <AppText
        variant="label"
        color="ink-muted"
        className="uppercase tracking-[1.2px]"
      >
        How your planet grows
      </AppText>
      <View className="flex-row items-center gap-2.5">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-gold">
          <Icon name="plus" color={tokens.night} size={13} />
        </View>
        <AppText variant="bodySmall" className="flex-1 font-body-bold">
          Approved quests add their coins
        </AppText>
      </View>
      <View className="flex-row items-center gap-2.5">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-pink">
          <Icon name="minus" color={tokens.night} size={13} />
        </View>
        <AppText variant="bodySmall" className="flex-1 font-body-bold">
          Missed locked Extras take their full value
        </AppText>
      </View>
    </View>
  );
}
