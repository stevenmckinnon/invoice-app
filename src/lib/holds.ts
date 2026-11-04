/**
 * Pencils (holds): dates held for a job before it's confirmed. Pure, so the
 * routes, the Diary and the iOS app (`HoldRules.swift`) share one set of rules.
 *
 * A hold is pencilled until it's confirmed into an invoice, and then that
 * invoice is the record. A 1st pencil is first refusal on the dates; a 2nd
 * is next in line behind someone else's. Pencils never count as money.
 */
import { z } from "zod";

export type HoldRank = 1 | 2;

export interface HoldLike {
  id: string;
  dates: string[];
  rank: number;
  invoiceId: string | null;
}

/** A pencil a job hasn't been confirmed from yet */
export const isPencilled = (hold: HoldLike) => hold.invoiceId === null;

/** The most dates one pencil can hold: a long tour, not a typo */
export const MAX_HOLD_DATES = 90;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Not a calendar date");

/** Dates as stored: valid, unique and in order, whatever order they came in */
export const holdDatesSchema = z
  .array(isoDate)
  .min(1, "Pick at least one date.")
  .max(MAX_HOLD_DATES, `A pencil holds at most ${MAX_HOLD_DATES} dates.`)
  .transform((dates) => [...new Set(dates)].sort());

export const holdInputSchema = z.object({
  clientId: z.string().min(1, "Pick a client."),
  showName: z.string().trim().min(1, "Name the job.").max(200),
  dates: holdDatesSchema,
  rank: z.union([z.literal(1), z.literal(2)]),
});

export const holdUpdateSchema = holdInputSchema.partial();

/** What the Diary and the app show for a pencil */
export const holdSelect = {
  id: true,
  showName: true,
  dates: true,
  rank: true,
  invoiceId: true,
  client: { select: { id: true, name: true } },
  invoice: { select: { id: true, invoiceNumber: true, status: true } },
} as const;


const overlaps = (a: HoldLike, b: HoldLike) =>
  a.dates.some((date) => b.dates.includes(date));

/**
 * For each pencil that shares a date with another hold (pencilled or
 * confirmed), the ones it shares them with. A confirmed job never "clashes"
 * itself: it's the pencils around it that are in question.
 */
export const clashesOf = <T extends HoldLike>(holds: T[]) => {
  const clashes = new Map<string, T[]>();
  for (const hold of holds) {
    if (!isPencilled(hold)) continue;
    const others = holds.filter((other) => other.id !== hold.id && overlaps(hold, other));
    if (others.length > 0) clashes.set(hold.id, others);
  }
  return clashes;
};

/**
 * Releasing a 1st pencil moves the 2nd pencils on any of its dates up to
 * 1st: they were next in line. Releasing a 2nd, or a confirmed job, moves
 * nothing. Returns the ids to promote.
 */
export const promotedByRelease = (holds: HoldLike[], released: HoldLike) => {
  if (!isPencilled(released) || released.rank !== 1) return [];
  return holds
    .filter(
      (hold) =>
        hold.id !== released.id &&
        isPencilled(hold) &&
        hold.rank === 2 &&
        overlaps(hold, released),
    )
    .map((hold) => hold.id);
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const parts = (date: string) => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)) - 1,
  day: Number(date.slice(8, 10)),
});

const nextDay = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * "10–13 Dec", "2–4, 9 Dec", "29 Nov–2 Dec", "30 Dec 2026–2 Jan 2027": runs
 * of consecutive dates joined, the month said once where it can be. Dates
 * outside `currentYear` carry their year.
 */
export const holdRangeLabel = (
  dates: string[],
  currentYear = new Date().getFullYear(),
) => {
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 0) return "";
  const runs: Array<[string, string]> = [];
  for (const date of sorted) {
    const last = runs.at(-1);
    if (last && nextDay(last[1]) === date) last[1] = date;
    else runs.push([date, date]);
  }
  const years = new Set(sorted.map((date) => parts(date).year));
  const showYear = years.size > 1 || !years.has(currentYear);
  const label = (date: string, withMonth: boolean, withYear: boolean) => {
    const { year, month, day } = parts(date);
    return `${day}${withMonth ? ` ${MONTHS[month]}` : ""}${withYear ? ` ${year}` : ""}`;
  };
  const out: string[] = [];
  runs.forEach(([start, end], i) => {
    const s = parts(start);
    const e = parts(end);
    const nextRun = runs[i + 1];
    // The month is said at the end of each stretch of runs in that month
    const endMonthChanges =
      !nextRun ||
      parts(nextRun[0]).month !== e.month ||
      parts(nextRun[0]).year !== e.year;
    const yearHere = showYear && (endMonthChanges || s.year !== e.year);
    if (start === end) {
      out.push(label(start, endMonthChanges, yearHere));
    } else {
      const sameMonth = s.month === e.month && s.year === e.year;
      out.push(
        `${label(start, !sameMonth, showYear && s.year !== e.year)}–${label(end, endMonthChanges, yearHere)}`,
      );
    }
  });
  return out.join(", ");
};
