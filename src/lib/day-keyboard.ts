/**
 * Keyboard rules for the day editor, kept apart from the components so they
 * can be tested: moving about the calendar, moving between the paint options,
 * and reading typed overtime. Dates are `yyyy-mm-dd`, as everywhere in the
 * editor, and are worked in UTC so a clock change can't move a day.
 */

const DAY_MS = 86_400_000;

const toMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const shiftDays = (date: string, days: number) =>
  toDate(toMs(date) + days * DAY_MS);

/** The same day of another month, or that month's last day if it has no such day */
export const shiftMonths = (date: string, months: number) => {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const target = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
  return toDate(Date.UTC(year, target, Math.min(day, lastDay)));
};

/** Monday is the first column, as in the grid */
const weekdayIndex = (date: string) => (new Date(toMs(date)).getUTCDay() + 6) % 7;

/**
 * Where a key takes you from a day, or null if it isn't a calendar key.
 * Arrows move a day or a week, Home and End go to the ends of the week,
 * PageUp and PageDown change month.
 */
export const calendarKeyTarget = (date: string, key: string): string | null => {
  switch (key) {
    case "ArrowLeft":
      return shiftDays(date, -1);
    case "ArrowRight":
      return shiftDays(date, 1);
    case "ArrowUp":
      return shiftDays(date, -7);
    case "ArrowDown":
      return shiftDays(date, 7);
    case "Home":
      return shiftDays(date, -weekdayIndex(date));
    case "End":
      return shiftDays(date, 6 - weekdayIndex(date));
    case "PageUp":
      return shiftMonths(date, -1);
    case "PageDown":
      return shiftMonths(date, 1);
    default:
      return null;
  }
};

/**
 * Which option of a radio group a key moves to, or null if it isn't one of
 * its keys. Arrows wrap round; Home and End go to the first and last.
 */
export const radioKeyTarget = (
  count: number,
  current: number,
  key: string,
): number | null => {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
};

/** Overtime is logged in half hours, up to this many in a day */
export const OT_STEP = 0.5;
export const OT_MAX = 14;

/**
 * What was typed into the overtime field, as hours: nearest half hour, kept
 * between none and the day's limit. Null if it isn't a number at all, so the
 * field can go back to what it was instead of guessing.
 */
export const parseOvertime = (text: string): number | null => {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return 0;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  const snapped = Math.round(value / OT_STEP) * OT_STEP;
  return Math.min(OT_MAX, Math.max(0, snapped));
};
