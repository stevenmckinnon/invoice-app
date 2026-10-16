/**
 * The calendar editor's model: what's been painted, how a brush stroke
 * changes it, and how it becomes the days the API bills. Pure, so the rules
 * that decide what a tap does are tested rather than eyeballed.
 */
import type { BillableDay, DayType, TravelDirection } from "@/lib/billing";

/** "worktravel" paints a work day that also had travel */
export type Brush = DayType | "off" | "worktravel";

/**
 * One painted date. "off" is painted explicitly but never stored: it only
 * keeps a gap inside the job. `alsoTravel: "auto"` means work out the
 * direction from where the day sits, until it's set by hand.
 */
export interface PaintedDay {
  type: DayType | "off";
  alsoTravel?: TravelDirection | "auto";
  /** Travel days: a manual override of the inferred direction */
  direction?: TravelDirection;
  overtimeHours?: number;
}

export type Painted = Map<string, PaintedDay>;

export const BRUSHES: Array<{ id: Brush; label: string; short?: string }> = [
  { id: "work", label: "Work" },
  { id: "worktravel", label: "Work + travel", short: "Work+travel" },
  { id: "travel", label: "Travel" },
  { id: "dark", label: "Dark" },
  { id: "off", label: "Off" },
];

/** Whether a painted day is exactly what this brush paints */
export const matchesBrush = (day: PaintedDay | undefined, brush: Brush) =>
  brush === "worktravel"
    ? day?.type === "work" && Boolean(day.alsoTravel)
    : brush === "work"
      ? day?.type === "work" && !day.alsoTravel
      : day?.type === brush;

/**
 * Applies one brush stroke to one date. A stroke that started on a day the
 * brush already matches erases (only days of its own kind, so sliding over a
 * different type never wipes it); any other stroke paints. Switching a day
 * between Work and Work + travel keeps its overtime; any other repaint drops
 * it, since only work days carry overtime.
 */
export const applyStroke = (
  painted: Painted,
  date: string,
  brush: Brush,
  erasing: boolean,
): Painted => {
  const current = painted.get(date);
  if (erasing) {
    if (!matchesBrush(current, brush)) return painted;
    const next = new Map(painted);
    next.delete(date);
    return next;
  }
  if (matchesBrush(current, brush)) return painted;

  const keptOvertime =
    current?.type === "work" ? current.overtimeHours : undefined;
  const next = new Map(painted);
  next.set(
    date,
    brush === "worktravel"
      ? { type: "work", alsoTravel: "auto", overtimeHours: keptOvertime }
      : brush === "work"
        ? { type: "work", overtimeHours: keptOvertime }
        : { type: brush },
  );
  return next;
};

const working = (day?: PaintedDay) =>
  day?.type === "work" || day?.type === "dark";

/**
 * The painted days as the API takes them, in date order. Explicit "off"
 * days drop out (a day off is never stored), and an "auto" travel + work day
 * resolves from its neighbours: at the start of a run of work it's the day
 * you flew in; at the end, the day you flew home; mid-run, flew in.
 */
export const toBillableDays = (painted: Painted): BillableDay[] => {
  const dates = [...painted.keys()].sort();
  const dayBefore = (date: string) =>
    new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
  const dayAfter = (date: string) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10);

  return dates
    .map((date) => ({ date, day: painted.get(date)! }))
    .filter(({ day }) => day.type !== "off")
    .map(({ date, day }) => {
      let alsoTravel: TravelDirection | undefined;
      if (day.type === "work" && day.alsoTravel === "auto") {
        const startsRun = !working(painted.get(dayBefore(date)));
        const endsRun = !working(painted.get(dayAfter(date)));
        alsoTravel = startsRun || !endsRun ? "out" : "home";
      } else if (day.type === "work" && day.alsoTravel) {
        // Not "auto" (handled above), so it's a direction set by hand
        alsoTravel = day.alsoTravel as TravelDirection;
      }
      return {
        date,
        type: day.type as DayType,
        ...(alsoTravel && { alsoTravel }),
        ...(day.type === "travel" &&
          day.direction && { direction: day.direction }),
        ...(day.type === "work" && day.overtimeHours
          ? { overtimeHours: day.overtimeHours }
          : {}),
      };
    });
};

/** A stored invoice's days, back into the editor */
export const fromStoredDays = (
  days: Array<{
    date: string;
    type: string;
    alsoTravel?: string | null;
    direction?: string | null;
    overtimeHours?: number | null;
  }>,
): Painted =>
  new Map(
    days.map((day) => [
      day.date,
      {
        type: day.type as DayType,
        ...(day.alsoTravel && {
          alsoTravel: day.alsoTravel as TravelDirection,
        }),
        ...(day.direction && { direction: day.direction as TravelDirection }),
        ...(day.overtimeHours ? { overtimeHours: day.overtimeHours } : {}),
      },
    ]),
  );

/**
 * A month as Monday-first weeks, padded with the neighbouring months' days
 * so every row is full. yyyy-mm-dd strings throughout; `month` is 0-based.
 */
export const monthGrid = (year: number, month: number): string[] => {
  const first = Date.UTC(year, month, 1);
  // getUTCDay: 0 = Sunday. Shift so Monday is the first column.
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) =>
    new Date(first + (i - lead) * 86_400_000).toISOString().slice(0, 10),
  );
};
