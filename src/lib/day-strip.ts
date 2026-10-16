/**
 * Shapes an invoice's stored days for drawing: the strip on the invoice page
 * and the mini schedule on the paper. Display only; nothing here touches
 * money, which always comes from the stored line items and total.
 */
import type { DayType, TravelDirection } from "@/lib/billing";

export interface StoredDay {
  /** yyyy-mm-dd */
  date: string;
  type: DayType;
  alsoTravel?: TravelDirection | null;
  direction?: TravelDirection | null;
  overtimeHours?: number | null;
}

export interface StripDay {
  date: string;
  /** "off" fills a gap between the first and last day; it's never stored */
  type: DayType | "off";
  /** Travel days: stored if set, otherwise worked out from neighbours */
  direction?: TravelDirection;
  alsoTravel?: TravelDirection;
  overtimeHours: number;
}

export interface Leg {
  start: number;
  days: number;
  type: StripDay["type"];
  direction?: TravelDirection;
}

const DAY_MS = 86_400_000;
const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Every date from the first day to the last, gaps filled as days off, with
 * each travel day's direction resolved. A stored direction wins; otherwise
 * travel that leads into work (or a dark day) is "out", and travel that leads
 * into a day off or the end of the job is "home".
 */
export const toStripDays = (stored: StoredDay[]): StripDay[] => {
  if (!stored.length) return [];
  const byDate = new Map(stored.map((day) => [day.date, day]));
  const times = stored.map((day) => toUtc(day.date));
  const first = Math.min(...times);
  const last = Math.max(...times);

  const days: StripDay[] = [];
  for (let t = first; t <= last; t += DAY_MS) {
    const date = fromUtc(t);
    const day = byDate.get(date);
    days.push(
      day
        ? {
            date,
            type: day.type,
            direction: day.direction ?? undefined,
            alsoTravel: day.alsoTravel ?? undefined,
            overtimeHours: Number(day.overtimeHours ?? 0),
          }
        : { date, type: "off", overtimeHours: 0 },
    );
  }

  return days.map((day, i) => {
    if (day.type !== "travel" || day.direction) return day;
    const next = days.slice(i + 1).find((d) => d.type !== "travel");
    const intoWork = next?.type === "work" || next?.type === "dark";
    return { ...day, direction: intoWork ? "out" : "home" };
  });
};

/** Consecutive days of one type (and, for travel, one direction) as a leg */
export const toLegs = (days: StripDay[]): Leg[] =>
  days.reduce<Leg[]>((legs, day, i) => {
    const last = legs.at(-1);
    if (last && last.type === day.type && last.direction === day.direction) {
      last.days++;
    } else {
      legs.push({
        start: i,
        days: 1,
        type: day.type,
        direction: day.direction,
      });
    }
    return legs;
  }, []);

export const legLabel = (leg: Leg) =>
  leg.type === "travel"
    ? leg.direction === "home"
      ? { full: "Travel home", short: "Home" }
      : { full: "Travel out", short: "Out" }
    : leg.type === "work"
      ? { full: "Work", short: "Work" }
      : leg.type === "dark"
        ? { full: "Dark", short: "Dark" }
        : { full: "Off", short: "Off" };

/** Calendar dates are stored as plain dates, so format them in UTC */
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    ...options,
    timeZone: "UTC",
  });

export const weekdayShort = (date: string) =>
  format(date, { weekday: "short" });
export const dayOfMonth = (date: string) => Number(date.slice(8, 10));
export const longDate = (date: string) =>
  format(date, { weekday: "long", day: "numeric", month: "long" });

/** "8–13 September 2026", or "28 September – 4 October 2026" across months */
export const dateRange = (first: string, last: string) => {
  const sameMonth = first.slice(0, 7) === last.slice(0, 7);
  return sameMonth
    ? `${dayOfMonth(first)}–${format(last, { day: "numeric", month: "long", year: "numeric" })}`
    : `${format(first, { day: "numeric", month: "long" })} – ${format(last, { day: "numeric", month: "long", year: "numeric" })}`;
};

/** "11, 16 Sep" within a month; "30 Sep, 2 Oct" across months */
export const shortDateList = (dates: string[]) => {
  const sorted = [...dates].sort();
  const months = new Set(sorted.map((d) => d.slice(0, 7)));
  return months.size === 1
    ? `${sorted.map(dayOfMonth).join(", ")} ${format(sorted[0], { month: "short" })}`
    : sorted
        .map((d) => format(d, { day: "numeric", month: "short" }))
        .join(", ");
};
