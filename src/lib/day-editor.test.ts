import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type Painted,
  applyStroke,
  fromStoredDays,
  monthGrid,
  toBillableDays,
} from "@/lib/day-editor";

const paint = (entries: Array<[string, Parameters<typeof applyStroke>[2]]>) =>
  entries.reduce<Painted>(
    (painted, [date, brush]) => applyStroke(painted, date, brush, false),
    new Map(),
  );

describe("applyStroke", () => {
  it("paints an empty date", () => {
    const painted = paint([["2026-09-10", "work"]]);
    assert.deepEqual(painted.get("2026-09-10"), {
      type: "work",
      overtimeHours: undefined,
    });
  });

  it("erases only days of the stroke's own kind", () => {
    let painted = paint([
      ["2026-09-10", "work"],
      ["2026-09-11", "travel"],
    ]);
    painted = applyStroke(painted, "2026-09-10", "work", true);
    painted = applyStroke(painted, "2026-09-11", "work", true);
    assert.equal(painted.has("2026-09-10"), false);
    assert.equal(painted.get("2026-09-11")?.type, "travel");
  });

  it("keeps overtime switching between Work and Work + travel", () => {
    let painted: Painted = new Map([
      ["2026-09-10", { type: "work", overtimeHours: 3 }],
    ]);
    painted = applyStroke(painted, "2026-09-10", "worktravel", false);
    assert.deepEqual(painted.get("2026-09-10"), {
      type: "work",
      alsoTravel: "auto",
      overtimeHours: 3,
    });
  });

  it("drops overtime when a work day is repainted as travel", () => {
    let painted: Painted = new Map([
      ["2026-09-10", { type: "work", overtimeHours: 3 }],
    ]);
    painted = applyStroke(painted, "2026-09-10", "travel", false);
    assert.deepEqual(painted.get("2026-09-10"), { type: "travel" });
  });

  it("leaves the map untouched when nothing changes", () => {
    const painted = paint([["2026-09-10", "work"]]);
    assert.equal(applyStroke(painted, "2026-09-10", "work", false), painted);
  });
});

describe("toBillableDays", () => {
  it("drops explicit days off and sorts by date", () => {
    const painted = paint([
      ["2026-09-12", "travel"],
      ["2026-09-11", "off"],
      ["2026-09-10", "work"],
    ]);
    assert.deepEqual(
      toBillableDays(painted).map((d) => [d.date, d.type]),
      [
        ["2026-09-10", "work"],
        ["2026-09-12", "travel"],
      ],
    );
  });

  it("resolves an auto travel + work day from where it sits", () => {
    const painted = paint([
      ["2026-09-10", "worktravel"], // starts a run: flew in
      ["2026-09-11", "work"],
      ["2026-09-12", "worktravel"], // ends a run: flew home
    ]);
    assert.deepEqual(
      toBillableDays(painted).map((d) => [d.date, d.alsoTravel]),
      [
        ["2026-09-10", "out"],
        ["2026-09-11", undefined],
        ["2026-09-12", "home"],
      ],
    );
  });

  it("keeps a direction set by hand", () => {
    const painted: Painted = new Map([
      ["2026-09-10", { type: "work", alsoTravel: "home" }],
      ["2026-09-11", { type: "travel", direction: "out" }],
    ]);
    assert.deepEqual(toBillableDays(painted), [
      { date: "2026-09-10", type: "work", alsoTravel: "home" },
      { date: "2026-09-11", type: "travel", direction: "out" },
    ]);
  });

  it("only sends overtime on work days that have some", () => {
    const painted: Painted = new Map([
      ["2026-09-10", { type: "work", overtimeHours: 0 }],
      ["2026-09-11", { type: "work", overtimeHours: 2 }],
    ]);
    assert.deepEqual(toBillableDays(painted), [
      { date: "2026-09-10", type: "work" },
      { date: "2026-09-11", type: "work", overtimeHours: 2 },
    ]);
  });

  it("round-trips a stored invoice's days", () => {
    const stored = [
      { date: "2026-09-08", type: "travel", direction: null },
      { date: "2026-09-10", type: "work", overtimeHours: 2, alsoTravel: "out" },
      { date: "2026-09-12", type: "dark" },
    ];
    assert.deepEqual(toBillableDays(fromStoredDays(stored)), [
      { date: "2026-09-08", type: "travel" },
      { date: "2026-09-10", type: "work", alsoTravel: "out", overtimeHours: 2 },
      { date: "2026-09-12", type: "dark" },
    ]);
  });
});

describe("monthGrid", () => {
  it("lays September 2026 out in Monday-first weeks", () => {
    const grid = monthGrid(2026, 8);
    assert.equal(grid[0], "2026-08-31"); // Monday before 1 Sept (a Tuesday)
    assert.equal(grid.at(-1), "2026-10-04"); // Sunday after 30 Sept
    assert.equal(grid.length % 7, 0);
  });

  it("needs no lead days when the 1st is a Monday", () => {
    assert.equal(monthGrid(2026, 5)[0], "2026-06-01");
  });
});
