import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { CargoPod, ChoreIcon, PaydayFlight, StarBuddy } from "@/components/art";
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

/** What the cargo pod looked like the last time this child opened Money. */
type MoneySeen = { balance: number; at: number };

function seenKey(childId: string) {
  return `money-seen.${childId}`;
}

/**
 * What changed since the child last opened Money, decided once when the tab
 * opens (a snapshot): how many coins to drop and where the number counts
 * from. Anything that arrives while the tab is open just updates quietly.
 * A first visit or a failed read celebrates nothing.
 */
function useSinceLastVisit(
  childId: string | undefined,
  balance: number,
  entries: Entry[],
) {
  const [seen, setSeen] = useState<MoneySeen | null | undefined>(
    childId ? undefined : null,
  );
  const [snapshot, setSnapshot] = useState<{
    from: number;
    drops: number;
  } | null>(null);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    SecureStore.getItemAsync(seenKey(childId))
      .then((raw) => {
        const parsed = raw ? (JSON.parse(raw) as MoneySeen) : null;
        return parsed &&
          typeof parsed.balance === "number" &&
          typeof parsed.at === "number"
          ? parsed
          : null;
      })
      .catch(() => null)
      .then((value) => {
        if (!cancelled) setSeen(value);
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  // Freeze the comparison the first time we know both sides.
  if (seen !== undefined && snapshot === null) {
    setSnapshot(
      seen
        ? {
            from: seen.balance,
            drops: Math.min(
              3,
              entries.filter(
                (entry) => entry.createdAt > seen.at && entry.amountSek > 0,
              ).length,
            ),
          }
        : { from: balance, drops: 0 },
    );
  }

  const newest = entries.reduce(
    (max, entry) => Math.max(max, entry.createdAt),
    0,
  );
  useEffect(() => {
    if (!childId || seen === undefined) return;
    const mark: MoneySeen = { balance, at: Math.max(newest, seen?.at ?? 0) };
    SecureStore.setItemAsync(seenKey(childId), JSON.stringify(mark)).catch(
      () => {},
    );
  }, [balance, childId, newest, seen]);

  return snapshot
    ? { ready: true, from: snapshot.from, drops: snapshot.drops }
    : { ready: false, from: balance, drops: 0 };
}

/**
 * True once per paid-out week: the first time this child opens Money after a
 * Parent marked a payout paid, the delivery lands on their planet. Decided
 * once when the tab opens; a failed read plays nothing.
 */
/** Older than this, a payout just shows as paid (a new phone, a long break). */
const LANDING_WINDOW_MS = 7 * DAY_MS;

function useDeliveryLanding(
  childId: string | undefined,
  payout: Payout | null,
  now: number,
) {
  const paidId =
    payout &&
    payout.status === "paid" &&
    payout.paidAt !== null &&
    now - payout.paidAt < LANDING_WINDOW_MS
      ? (payout.payoutId as string)
      : null;
  const [result, setResult] = useState<{ id: string; land: boolean }>();
  useEffect(() => {
    if (!childId || !paidId) return;
    let cancelled = false;
    const key = `delivery-seen.${childId}`;
    SecureStore.getItemAsync(key)
      .then((seen) => {
        if (cancelled) return;
        setResult({ id: paidId, land: seen !== paidId });
        if (seen !== paidId) return SecureStore.setItemAsync(key, paidId);
      })
      .catch(() => {
        if (!cancelled) setResult({ id: paidId, land: false });
      });
    return () => {
      cancelled = true;
    };
  }, [childId, paidId]);
  return result !== undefined && result.id === paidId && result.land;
}

/**
 * Counts once from `from` to the balance when the tab opens. The starting
 * value is set in the same render the count begins, so there's no flash of
 * the new number first; later changes jump straight to the new value.
 */
function useCountUp(from: number, to: number, ready: boolean) {
  const reducedMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [value, setValue] = useState(to);
  const animate = ready && !reducedMotion && from !== to && !started;
  if (animate) {
    setStarted(true);
    setValue(from);
  }
  const target = started ? to : null;
  useEffect(() => {
    if (target === null) return;
    let frame = 0;
    const start = Date.now();
    const begin = value;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / 700);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(begin + (target - begin) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Only (re)start when the target changes; `value` is the start point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return started ? value : to;
}

export function ChildMoneyContent({ childId }: { childId?: string }) {
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
        <CargoPod size={130} balance={0} />
        <AppText color="ink-muted" className="mt-3 font-body-bold">
          Counting your coins…
        </AppText>
      </View>
    );
  }

  return (
    <ChildMoneyView overview={overview} now={queryNow} childId={childId} />
  );
}

/**
 * Money as a cargo pod: a compact header with the balance (coins that
 * arrived since the last visit drop into the slot), the payout week as a
 * rocket flying to payday, and this week's coins on a timeline.
 */
export function ChildMoneyView({
  overview,
  now,
  childId,
  previewLanding = false,
}: {
  overview: ChildMoneyOverview;
  now: number;
  /** Enables the "since your last visit" drop; previews omit it. */
  childId?: string;
  /** Previews: play the payday landing. */
  previewLanding?: boolean;
}) {
  const { child, currentPeriod } = overview;
  const balance = child.runningBalanceSek;
  const since = useSinceLastVisit(childId, balance, child.thisPeriodEntries);
  const shown = useCountUp(since.from, balance, since.ready);
  const landed = useDeliveryLanding(childId, child.latestPayout, now);
  const delivery =
    (landed || previewLanding) && child.latestPayout?.status === "paid"
      ? child.latestPayout
      : null;

  return (
    <View className="pb-6">
      <PaydayCard
        period={currentPeriod}
        now={now}
        balance={balance}
        shown={since.ready ? shown : undefined}
        weekTotal={child.thisPeriodEntries.reduce(
          (sum, entry) => sum + entry.amountSek,
          0,
        )}
        drops={since.drops}
        dropKey={since.ready ? "open" : "loading"}
        delivery={delivery}
      />
      <CoinTimeline
        entries={child.thisPeriodEntries}
        timezone={currentPeriod.timezone}
        balance={balance}
      />
      <PayoutPostcard payout={child.latestPayout} balance={balance} />
      <HowItWorks />
    </View>
  );
}

/**
 * Your money as a delivery on its way to you: the balance up top (what will
 * land on payday), then the flight from last payday's depot to your home
 * planet with the cargo pod in tow. Right after a payout, the delivery lands.
 */
function PaydayCard({
  period,
  now,
  balance,
  shown,
  weekTotal,
  drops,
  dropKey,
  delivery,
}: {
  period: ChildMoneyOverview["currentPeriod"];
  now: number;
  balance: number;
  /** The counted-up balance; undefined until the last visit is known. */
  shown: number | undefined;
  weekTotal: number;
  drops: number;
  dropKey: string;
  /** The payout that just landed, if this visit plays the landing. */
  delivery: Payout | null;
}) {
  const negative = balance < 0;
  const today = localDateKey(now, period.timezone);
  // The period ends as payday starts, so there's always at least a day left.
  const daysLeft = Math.max(
    1,
    dayNumber(period.endLocalDate) - dayNumber(today),
  );
  const span = Math.max(1, period.endAt - period.startAt);
  const progress = (now - period.startAt) / span;
  const payday = capitalize(period.payoutWeekday);
  const countdown =
    daysLeft === 1 ? `${payday} is tomorrow` : `${payday} · ${daysLeft} days`;

  return (
    <View
      className="mt-1 rounded-large bg-surface px-4 pb-2 pt-4"
      accessible
      accessibilityLabel={`${balance} kr. ${
        negative ? `Earn ${Math.abs(balance)} kr to get back to 0. ` : ""
      }${drops > 0 ? `${drops} new ${drops === 1 ? "coin" : "coins"} since last time. ` : ""}Payday ${countdown}.`}
    >
      <View className="flex-row items-end justify-between">
        <View className="flex-row items-baseline gap-2">
          <AppText
            className="font-display text-[32px] leading-[38px]"
            color={negative ? "pink" : "primary"}
            numberOfLines={1}
            testID="task14-running-balance-value"
          >
            {shown === undefined ? " " : shown}
            <AppText
              className="font-body-heavy text-[16px]"
              color={negative ? "pink" : "primary"}
            >
              {" "}
              kr
            </AppText>
          </AppText>
          {weekTotal !== 0 ? (
            <AppText
              variant="caption"
              className="font-body-heavy"
              color={weekTotal < 0 ? "pink" : "gold"}
            >
              {signed(weekTotal)} this week
            </AppText>
          ) : null}
        </View>
        <View className="mb-2 flex-row items-center gap-1.5 rounded-full bg-nightRaised px-3 py-1">
          <Icon name="star" color={tokens.gold} size={12} />
          <AppText variant="caption">{countdown}</AppText>
        </View>
      </View>
      {negative ? (
        <AppText variant="caption" color="pink" className="font-body-bold">
          Earn {Math.abs(balance)} kr to clear the debt before payday.
        </AppText>
      ) : null}
      {delivery ? (
        <Animated.View
          entering={FadeIn.delay(1700).duration(300)}
          className="mt-2 flex-row items-center gap-2 self-start rounded-full bg-primary px-3 py-1"
        >
          <Icon name="check" color={tokens.night} size={13} />
          <AppText className="font-body-heavy text-[13px] text-night">
            {delivery.amountDueSek} kr delivered · a Parent paid you
          </AppText>
        </Animated.View>
      ) : null}
      <View className="mt-1">
        <PaydayFlight
          balance={balance}
          weekProgress={progress}
          drops={drops}
          dropKey={dropKey}
          landing={delivery !== null}
        />
      </View>
    </View>
  );
}

/**
 * What's in the pod: every coin loaded this week (an approved quest) and
 * every one dropped (a missed locked Extra), newest day first, plus anything
 * the pod carried in from last week.
 */
function CoinTimeline({
  entries,
  timezone,
  balance,
}: {
  entries: Entry[];
  timezone: string;
  balance: number;
}) {
  const total = entries.reduce((sum, entry) => sum + entry.amountSek, 0);
  // Past the server cap the list is only the latest entries, so no total.
  const complete = entries.length < SERVER_ENTRY_CAP;
  const shown = entries.slice(0, TIMELINE_LIMIT);
  const hidden = entries.length - shown.length;
  const groups = groupByDay(shown, timezone);
  // Whatever the balance holds beyond this week's entries rode in from last
  // week: a debt (below 0) or pay still to be sent.
  const carried = complete ? balance - total : 0;

  return (
    <View className="mt-6">
      <View className="flex-row items-baseline justify-between">
        <AppText variant="sectionTitle">Cargo manifest</AppText>
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
              No coins yet this week. Quests fill your cargo pod!
            </AppText>
          </View>
        </View>
      ) : null}
      {entries.length === 0 && carried !== 0 ? (
        <View className="mt-1 rounded-large bg-surface px-4 py-1">
          <CarriedRow carried={carried} />
        </View>
      ) : null}
      {entries.length === 0 ? null : (
        <View className="mt-3 rounded-large bg-surface px-4 py-1">
          {groups.map((group, g) => (
            <View key={group.day} className={g > 0 ? "mt-1" : ""}>
              <View className="flex-row items-baseline justify-between pb-1 pt-3">
                <AppText
                  variant="label"
                  color="ink-muted"
                  className="uppercase tracking-[1.2px]"
                >
                  {group.day}
                </AppText>
                {group.entries.length > 1 ? (
                  <AppText
                    variant="caption"
                    className="font-body-heavy"
                    color={group.total < 0 ? "pink" : "gold"}
                  >
                    {signed(group.total)}
                  </AppText>
                ) : null}
              </View>
              {group.entries.map((entry, i) => (
                <CoinRow
                  key={`${entry.createdAt}-${i}`}
                  entry={entry}
                  last={
                    i === group.entries.length - 1 &&
                    g === groups.length - 1 &&
                    hidden === 0
                  }
                />
              ))}
            </View>
          ))}
          {carried !== 0 ? <CarriedRow carried={carried} divider /> : null}
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

/** What rode in from last week: a debt, or pay still to be sent. */
function CarriedRow({
  carried,
  divider = false,
}: {
  carried: number;
  divider?: boolean;
}) {
  return (
    <View
      className={`pb-2 pt-3 ${divider ? "mt-1 border-t border-nightRaised" : ""}`}
    >
      <AppText
        variant="label"
        color="ink-muted"
        className="uppercase tracking-[1.2px]"
      >
        From last week
      </AppText>
      <View className="mt-1.5 flex-row items-center gap-3">
        <View
          className={`h-[30px] w-[30px] items-center justify-center rounded-[9px] ${carried < 0 ? "bg-pink" : "bg-gold"}`}
        >
          <Icon
            name={carried < 0 ? "minus" : "clock"}
            color={tokens.night}
            size={15}
          />
        </View>
        <AppText className="flex-1 font-body-heavy text-[15px]">
          {carried < 0 ? "Debt riding along" : "Still to be paid"}
        </AppText>
        <AppText
          className="font-display text-[16px]"
          color={carried < 0 ? "pink" : "gold"}
        >
          {signed(carried)}
        </AppText>
      </View>
    </View>
  );
}

/** This week's coins by day, newest day first, keeping the list's order. */
function groupByDay(entries: Entry[], timezone: string) {
  const groups: { day: string; total: number; entries: Entry[] }[] = [];
  for (const entry of entries) {
    const day = shortWeekday(entry.createdAt, timezone);
    const group = groups.find((candidate) => candidate.day === day);
    if (group) {
      group.entries.push(entry);
      group.total += entry.amountSek;
    } else {
      groups.push({ day, total: entry.amountSek, entries: [entry] });
    }
  }
  return groups;
}

function CoinRow({ entry, last }: { entry: Entry; last: boolean }) {
  const penalty = entry.kind === "penalty";
  const title = entry.choreTitle ?? "A chore";
  return (
    <View
      className={`min-h-[46px] flex-row items-center gap-3 py-1.5 ${last ? "" : "border-b border-nightRaised"}`}
      accessible
      accessibilityLabel={`${title}, ${penalty ? "Extra not finished" : "approved"}, ${signed(entry.amountSek)}`}
    >
      <ChoreIcon title={title} size={30} />
      <View className="flex-1">
        <AppText
          className="font-body-heavy text-[15px] leading-[20px]"
          numberOfLines={1}
        >
          {title}
        </AppText>
        {penalty ? (
          <AppText variant="caption" color="pink">
            Dropped · Extra not finished
          </AppText>
        ) : null}
      </View>
      <AppText
        className="font-display text-[16px]"
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
      <AppText variant="sectionTitle">Last delivery</AppText>
      <View className="mt-3 overflow-hidden rounded-large bg-surface p-4">
        {!payout ? (
          <PostcardBody
            badge={{ icon: "star", label: "Coming up", tone: "accent" }}
            title="Your first payday is coming"
            body="When this week closes, a Parent pays out whatever your cargo pod holds above 0 kr."
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
            title={`${payout.amountDueSek} kr delivered`}
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
            body="Your cargo pod was at 0 kr when the week closed."
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

/** The rules of the delivery, folded away until asked for. */
function HowItWorks() {
  const [open, setOpen] = useState(false);
  const rules = [
    {
      icon: "plus" as const,
      tone: "bg-gold",
      text: "Approved quests load their coins",
    },
    {
      icon: "minus" as const,
      tone: "bg-pink",
      text: "A missed locked Extra drops its full value",
    },
    {
      icon: "check" as const,
      tone: "bg-primary",
      text: "On payday a Parent sends what’s in the pod",
    },
    {
      icon: "redo" as const,
      tone: "bg-nightRaised",
      text: "Below 0, the debt rides along into next week",
    },
  ];
  return (
    <View className="mt-6">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center gap-2 self-start py-1"
      >
        <View className="h-6 w-6 items-center justify-center rounded-full bg-nightRaised">
          <AppText className="font-display text-[13px]">?</AppText>
        </View>
        <AppText variant="label" color="ink-muted">
          How the delivery works
        </AppText>
      </Pressable>
      {open ? (
        <View className="mt-2 gap-2 rounded-large border-2 border-dashed border-nightRaised p-4">
          {rules.map((rule) => (
            <View key={rule.text} className="flex-row items-center gap-2.5">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full ${rule.tone}`}
              >
                <Icon name={rule.icon} color={tokens.night} size={13} />
              </View>
              <AppText variant="bodySmall" className="flex-1 font-body-bold">
                {rule.text}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
