import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  OT_MAX,
  calendarKeyTarget,
  parseOvertime,
  radioKeyTarget,
  shiftDays,
  shiftMonths,
} from "@/lib/day-keyboard";

describe("moving about the calendar", () => {
  // 2026-11-04 is a Wednesday
  it("moves a day or a week with the arrows", () => {
    assert.equal(calendarKeyTarget("2026-11-04", "ArrowRight"), "2026-11-05");
    assert.equal(calendarKeyTarget("2026-11-04", "ArrowLeft"), "2026-11-03");
    assert.equal(calendarKeyTarget("2026-11-04", "ArrowDown"), "2026-11-11");
    assert.equal(calendarKeyTarget("2026-11-04", "ArrowUp"), "2026-10-28");
  });

  it("crosses a month or a year without losing a day", () => {
    assert.equal(shiftDays("2026-11-30", 1), "2026-12-01");
    assert.equal(shiftDays("2026-12-31", 1), "2027-01-01");
    assert.equal(shiftDays("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftDays("2028-03-01", -1), "2028-02-29");
  });

  it("ignores a clock change", () => {
    // The UK clocks go back on 25 October 2026 and forward on 29 March
    assert.equal(shiftDays("2026-10-24", 1), "2026-10-25");
    assert.equal(shiftDays("2026-10-25", 1), "2026-10-26");
    assert.equal(shiftDays("2026-03-28", 1), "2026-03-29");
    assert.equal(shiftDays("2026-03-29", 1), "2026-03-30");
  });

  it("takes Home and End to Monday and Sunday of the same week", () => {
    assert.equal(calendarKeyTarget("2026-11-04", "Home"), "2026-11-02");
    assert.equal(calendarKeyTarget("2026-11-04", "End"), "2026-11-08");
    // Already on the end of the week
    assert.equal(calendarKeyTarget("2026-11-02", "Home"), "2026-11-02");
    assert.equal(calendarKeyTarget("2026-11-08", "End"), "2026-11-08");
  });

  it("changes month with PageUp and PageDown, keeping the day where it can", () => {
    assert.equal(calendarKeyTarget("2026-11-15", "PageDown"), "2026-12-15");
    assert.equal(calendarKeyTarget("2026-11-15", "PageUp"), "2026-10-15");
    assert.equal(shiftMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(shiftMonths("2028-01-31", 1), "2028-02-29");
    assert.equal(shiftMonths("2026-12-10", 1), "2027-01-10");
    assert.equal(shiftMonths("2026-01-10", -1), "2025-12-10");
  });

  it("leaves other keys alone, so Space and Tab still do their usual job", () => {
    for (const key of [" ", "Enter", "Tab", "a", "Escape"]) {
      assert.equal(calendarKeyTarget("2026-11-04", key), null, key);
    }
  });
});

describe("moving between the paint options", () => {
  it("steps along and wraps round", () => {
    assert.equal(radioKeyTarget(5, 0, "ArrowRight"), 1);
    assert.equal(radioKeyTarget(5, 4, "ArrowRight"), 0);
    assert.equal(radioKeyTarget(5, 0, "ArrowLeft"), 4);
    assert.equal(radioKeyTarget(5, 2, "ArrowDown"), 3);
    assert.equal(radioKeyTarget(5, 2, "ArrowUp"), 1);
  });

  it("goes to the ends with Home and End", () => {
    assert.equal(radioKeyTarget(5, 3, "Home"), 0);
    assert.equal(radioKeyTarget(5, 1, "End"), 4);
  });

  it("ignores everything else", () => {
    assert.equal(radioKeyTarget(5, 1, " "), null);
    assert.equal(radioKeyTarget(5, 1, "Tab"), null);
  });
});

describe("typed overtime", () => {
  it("takes whole and half hours as they are", () => {
    assert.equal(parseOvertime("2"), 2);
    assert.equal(parseOvertime("2.5"), 2.5);
    assert.equal(parseOvertime("0"), 0);
  });

  it("rounds to the nearest half hour", () => {
    assert.equal(parseOvertime("2.2"), 2);
    assert.equal(parseOvertime("2.3"), 2.5);
    assert.equal(parseOvertime("2.8"), 3);
  });

  it("reads a comma as a decimal point, and ignores spaces", () => {
    assert.equal(parseOvertime(" 3,5 "), 3.5);
  });

  it("keeps it within a day's limit and never below nothing", () => {
    assert.equal(parseOvertime("99"), OT_MAX);
    assert.equal(parseOvertime("-3"), 0);
  });

  it("treats an empty field as none, and rejects text", () => {
    assert.equal(parseOvertime(""), 0);
    assert.equal(parseOvertime("  "), 0);
    assert.equal(parseOvertime("two"), null);
    assert.equal(parseOvertime("2h"), null);
    assert.equal(parseOvertime("Infinity"), null);
  });
});
