/**
 * The tax-year boundary decides which year every dashboard figure lands in.
 * Getting 1–5 April wrong silently moves revenue between years.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatFy, getFyMonthIndex, getFyStart } from "@/lib/tax-year";

// Months are 0-based in the Date constructor: 3 = April
const d = (y: number, m: number, day: number) => new Date(y, m, day);

describe("getFyStart", () => {
  it("puts 6 April in the year that starts that day", () => {
    assert.equal(getFyStart(d(2026, 3, 6)), 2026);
  });

  it("puts 1–5 April in the year that's ending", () => {
    assert.equal(getFyStart(d(2026, 3, 1)), 2025);
    assert.equal(getFyStart(d(2026, 3, 5)), 2025);
  });

  it("puts January–March in the year that started the previous April", () => {
    assert.equal(getFyStart(d(2026, 0, 1)), 2025);
    assert.equal(getFyStart(d(2026, 2, 31)), 2025);
  });

  it("puts May–December in the year that started that April", () => {
    assert.equal(getFyStart(d(2026, 4, 1)), 2026);
    assert.equal(getFyStart(d(2026, 11, 31)), 2026);
  });
});

describe("getFyMonthIndex", () => {
  it("starts the year at April", () => {
    assert.equal(getFyMonthIndex(d(2026, 3, 6)), 0);
    assert.equal(getFyMonthIndex(d(2026, 4, 1)), 1);
  });

  it("ends the year at March", () => {
    assert.equal(getFyMonthIndex(d(2027, 2, 31)), 11);
  });

  it("puts 1–5 April in the last slot of the year that's ending", () => {
    assert.equal(getFyMonthIndex(d(2026, 3, 3)), 11);
    assert.equal(getFyStart(d(2026, 3, 3)), 2025);
  });
});

describe("formatFy", () => {
  it("formats as start/short-end", () => {
    assert.equal(formatFy(2026), "2026/27");
  });

  it("pads the century rollover", () => {
    assert.equal(formatFy(2099), "2099/00");
  });
});
