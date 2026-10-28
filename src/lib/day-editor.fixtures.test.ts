/**
 * The iOS app ports `day-editor.ts` by hand (`ios/Caley/Caley/DayEditor.swift`). This builds a
 * set of scenarios, runs them through the real rules here, and compares the answers with the
 * file the Swift tests replay (`ios/Caley/CaleyTests/day-editor-fixtures.json`).
 *
 * If you change `day-editor.ts`, this test fails until the fixtures are regenerated:
 *
 *   UPDATE_FIXTURES=1 pnpm test
 *
 * and then the iOS tests (see CLAUDE.md) fail until `DayEditor.swift` agrees.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { BillableDay, TravelDirection } from "@/lib/billing";
import {
  type Brush,
  type Painted,
  applyStroke,
  fromStoredDays,
  monthGrid,
  toBillableDays,
} from "@/lib/day-editor";

const FIXTURE_PATH = "ios/Caley/CaleyTests/day-editor-fixtures.json";

type StoredDay = {
  date: string;
  type: string;
  alsoTravel: string | null;
  direction: string | null;
  overtimeHours: number | null;
};

type Op =
  | { op: "stroke"; date: string; brush: Brush; erasing: boolean }
  | { op: "overtime"; date: string; hours: number }
  | { op: "alsoTravel"; date: string; side: TravelDirection };

interface Case {
  name: string;
  stored: StoredDay[];
  ops: Op[];
  billable: BillableDay[];
}

/** Small seeded generator, so the fixtures are the same every time they're built */
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const run = (stored: StoredDay[], ops: Op[]): BillableDay[] => {
  let painted: Painted = fromStoredDays(stored);
  for (const op of ops) {
    if (op.op === "stroke") {
      painted = applyStroke(painted, op.date, op.brush, op.erasing);
    } else {
      const day = painted.get(op.date);
      if (!day) continue;
      painted = new Map(painted).set(
        op.date,
        op.op === "overtime"
          ? { ...day, overtimeHours: op.hours }
          : { ...day, alsoTravel: op.side },
      );
    }
  }
  return toBillableDays(painted);
};

const BRUSHES: Brush[] = ["work", "worktravel", "travel", "dark", "off"];
const TYPES = ["work", "travel", "dark"];
const DATES = Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2026, 8, 8 + i)).toISOString().slice(0, 10),
);

const build = (): { cases: Case[]; months: Record<string, string[]> } => {
  const cases: Case[] = [];
  const add = (name: string, stored: StoredDay[], ops: Op[]) =>
    cases.push({ name, stored, ops, billable: run(stored, ops) });
  const stroke = (date: string, brush: Brush, erasing = false): Op => ({
    op: "stroke",
    date,
    brush,
    erasing,
  });
  const day = (
    date: string,
    type: string,
    extra: Partial<StoredDay> = {},
  ): StoredDay => ({
    date,
    type,
    alsoTravel: null,
    direction: null,
    overtimeHours: null,
    ...extra,
  });

  // Hand-written: the situations the rules exist for
  add("empty", [], []);
  add("one work day", [], [stroke(DATES[0], "work")]);
  add(
    "auto travel + work: start of a run flies in",
    [],
    [stroke(DATES[0], "worktravel"), stroke(DATES[1], "work")],
  );
  add(
    "auto travel + work: end of a run flies home",
    [],
    [stroke(DATES[0], "work"), stroke(DATES[1], "worktravel")],
  );
  add(
    "auto travel + work: middle of a run flies in",
    [],
    [
      stroke(DATES[0], "work"),
      stroke(DATES[1], "worktravel"),
      stroke(DATES[2], "work"),
    ],
  );
  add(
    "auto travel + work: a lone day flies in",
    [],
    [stroke(DATES[3], "worktravel")],
  );
  add(
    "dark days count as a run",
    [],
    [
      stroke(DATES[0], "dark"),
      stroke(DATES[1], "worktravel"),
      stroke(DATES[2], "dark"),
    ],
  );
  add(
    "a travel day does not count as a run",
    [],
    [
      stroke(DATES[0], "travel"),
      stroke(DATES[1], "worktravel"),
      stroke(DATES[2], "travel"),
    ],
  );
  add(
    "an explicit off day breaks nothing and is never stored",
    [],
    [stroke(DATES[0], "work"), stroke(DATES[1], "off"), stroke(DATES[2], "work")],
  );
  add(
    "overtime survives work <-> work + travel, not other repaints",
    [],
    [
      stroke(DATES[0], "work"),
      { op: "overtime", date: DATES[0], hours: 3 },
      stroke(DATES[0], "worktravel"),
      stroke(DATES[1], "work"),
      { op: "overtime", date: DATES[1], hours: 2 },
      stroke(DATES[1], "travel"),
      stroke(DATES[1], "work"),
    ],
  );
  add(
    "erasing only removes days of its own kind",
    [],
    [
      stroke(DATES[0], "work"),
      stroke(DATES[1], "travel"),
      stroke(DATES[0], "travel", true),
      stroke(DATES[1], "travel", true),
    ],
  );
  add(
    "a hand-set direction wins over the inferred one",
    [],
    [
      stroke(DATES[0], "worktravel"),
      { op: "alsoTravel", date: DATES[0], side: "home" },
    ],
  );
  add(
    "stored days round-trip, direction included",
    [
      day(DATES[0], "travel", { direction: "out" }),
      day(DATES[1], "work", { alsoTravel: "out", overtimeHours: 1.5 }),
      day(DATES[2], "work", { overtimeHours: 0 }),
      day(DATES[3], "dark", { overtimeHours: 2 }),
      day(DATES[4], "travel", { direction: "home" }),
    ],
    [],
  );
  add(
    "stored days: strokes on top",
    [
      day(DATES[0], "work", { alsoTravel: "home", overtimeHours: 2 }),
      day(DATES[1], "travel", { direction: "home" }),
    ],
    [stroke(DATES[0], "worktravel"), stroke(DATES[1], "dark")],
  );

  // Generated: many random sessions, so a rule that drifts in one corner is caught
  const rand = mulberry32(20261028);
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];

  for (let i = 0; i < 150; i++) {
    const ops: Op[] = [];
    for (let n = 1 + Math.floor(rand() * 10); n > 0; n--) {
      const roll = rand();
      const date = pick(DATES);
      if (roll < 0.75) {
        ops.push(stroke(date, pick(BRUSHES), rand() < 0.25));
      } else if (roll < 0.9) {
        ops.push({ op: "overtime", date, hours: pick([1, 1.5, 2, 3.5]) });
      } else {
        ops.push({ op: "alsoTravel", date, side: pick(["out", "home"]) });
      }
    }
    add(`random session ${i + 1}`, [], ops);
  }

  for (let i = 0; i < 40; i++) {
    const stored = DATES.filter(() => rand() < 0.5).map((date) =>
      day(date, pick(TYPES), {
        alsoTravel: rand() < 0.3 ? pick(["out", "home"]) : null,
        direction: rand() < 0.3 ? pick(["out", "home"]) : null,
        overtimeHours: rand() < 0.4 ? pick([0, 1, 1.5, 2]) : null,
      }),
    );
    const ops: Op[] = [];
    for (let n = Math.floor(rand() * 4); n > 0; n--) {
      ops.push(stroke(pick(DATES), pick(BRUSHES), rand() < 0.25));
    }
    add(`stored session ${i + 1}`, stored, ops);
  }

  // The calendar grid, for months that start on every weekday and for leap February
  const months: Record<string, string[]> = {};
  for (const [year, month] of [
    [2026, 0],
    [2026, 1],
    [2026, 2],
    [2026, 3],
    [2026, 4],
    [2026, 5],
    [2026, 8],
    [2026, 9],
    [2026, 11],
    [2027, 1],
    [2028, 1],
    [2024, 8],
  ] as const) {
    months[`${year}-${month}`] = monthGrid(year, month);
  }

  return { cases, months };
};

describe("iOS parity fixtures", () => {
  it("match what day-editor.ts produces", () => {
    const { cases, months } = build();
    // One case per line, so a change to the rules shows as a readable diff
    const text = `{"cases":[\n${cases.map((c) => JSON.stringify(c)).join(",\n")}\n],\n"months":${JSON.stringify(months)}}\n`;
    if (process.env.UPDATE_FIXTURES) {
      writeFileSync(FIXTURE_PATH, text);
      return;
    }
    let saved = "";
    try {
      saved = readFileSync(FIXTURE_PATH, "utf8");
    } catch {
      // Missing file reads as stale, below
    }
    assert.equal(
      saved,
      text,
      `${FIXTURE_PATH} is out of date: run UPDATE_FIXTURES=1 pnpm test, then run the iOS tests and bring DayEditor.swift in line.`,
    );
  });
});
