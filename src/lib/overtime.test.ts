import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientOvertimeRule,
  overtimeRuleData,
  splitOvertimeHours,
  type OvertimeTierRule,
} from "@/lib/overtime";

/** The WWE terms this was built for: first 2 hours a day at 1.5x, then 2x */
const rule: OvertimeTierRule = {
  tierHours: 2,
  firstRate: "1.5x",
  afterRate: "2x",
};

describe("splitOvertimeHours", () => {
  it("keeps hours under the tier as one row", () => {
    assert.deepEqual(splitOvertimeHours(1.5, rule), [
      { hours: 1.5, rateType: "1.5x" },
    ]);
  });

  it("keeps hours exactly at the tier as one row, not two", () => {
    assert.deepEqual(splitOvertimeHours(2, rule), [
      { hours: 2, rateType: "1.5x" },
    ]);
  });

  it("splits hours over the tier", () => {
    assert.deepEqual(splitOvertimeHours(5, rule), [
      { hours: 2, rateType: "1.5x" },
      { hours: 3, rateType: "2x" },
    ]);
  });

  it("splits fractional hours just past the tier", () => {
    assert.deepEqual(splitOvertimeHours(2.5, rule), [
      { hours: 2, rateType: "1.5x" },
      { hours: 0.5, rateType: "2x" },
    ]);
  });

  it("bills at the higher rate once the day's tier is used up", () => {
    assert.deepEqual(splitOvertimeHours(3, rule, 2), [
      { hours: 3, rateType: "2x" },
    ]);
  });

  it("gives a second entry only what is left of the day's tier", () => {
    assert.deepEqual(splitOvertimeHours(3, rule, 1), [
      { hours: 1, rateType: "1.5x" },
      { hours: 2, rateType: "2x" },
    ]);
  });

  it("adds up to the same total however the day's hours are entered", () => {
    const inOneGo = splitOvertimeHours(5, rule);
    const inTwoGoes = [
      ...splitOvertimeHours(3, rule),
      ...splitOvertimeHours(2, rule, 3),
    ];

    const cost = (rows: Array<{ hours: number; rateType: string }>) =>
      rows.reduce(
        (sum, r) => sum + r.hours * (r.rateType === "1.5x" ? 1.5 : 2),
        0,
      );

    assert.equal(cost(inTwoGoes), cost(inOneGo));
  });

  it("returns nothing for zero or negative hours", () => {
    assert.deepEqual(splitOvertimeHours(0, rule), []);
    assert.deepEqual(splitOvertimeHours(-3, rule), []);
  });

  it("collapses to one row when both tiers are the same rate", () => {
    assert.deepEqual(
      splitOvertimeHours(5, { tierHours: 2, firstRate: "2x", afterRate: "2x" }),
      [{ hours: 5, rateType: "2x" }],
    );
  });
});

describe("clientOvertimeRule", () => {
  it("reads a complete rule off a client", () => {
    assert.deepEqual(
      clientOvertimeRule({
        overtimeTierHours: "2",
        overtimeFirstRate: "1.5x",
        overtimeAfterRate: "2x",
      }),
      rule,
    );
  });

  it("treats a half-set rule as no tiering", () => {
    assert.equal(
      clientOvertimeRule({ overtimeTierHours: 2, overtimeFirstRate: "1.5x" }),
      null,
    );
    assert.equal(
      clientOvertimeRule({
        overtimeFirstRate: "1.5x",
        overtimeAfterRate: "2x",
      }),
      null,
    );
    assert.equal(
      clientOvertimeRule({
        overtimeTierHours: 0,
        overtimeFirstRate: "1.5x",
        overtimeAfterRate: "2x",
      }),
      null,
    );
  });

  it("rejects a rate the pricing helpers don't know", () => {
    assert.equal(
      clientOvertimeRule({
        overtimeTierHours: 2,
        overtimeFirstRate: "1.25x",
        overtimeAfterRate: "2x",
      }),
      null,
    );
  });

  it("reads back exactly what overtimeRuleData stores", () => {
    const stored = overtimeRuleData({
      overtimeTierHours: "2",
      overtimeFirstRate: "1.5x",
      overtimeAfterRate: "2x",
    });
    assert.deepEqual(clientOvertimeRule(stored), rule);
  });

  it("clears the whole rule when the form leaves the hours blank", () => {
    const stored = overtimeRuleData({
      overtimeTierHours: "",
      overtimeFirstRate: "1.5x",
      overtimeAfterRate: "2x",
    });
    assert.deepEqual(stored, {
      overtimeTierHours: null,
      overtimeFirstRate: null,
      overtimeAfterRate: null,
    });
    assert.equal(clientOvertimeRule(stored), null);
  });
});
