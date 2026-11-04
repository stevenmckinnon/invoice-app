/**
 * Pencils: which ones clash, who moves up when a 1st is released, and how a
 * run of dates reads. iOS holds the same rules (`HoldRulesTests`).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clashesOf,
  holdDatesSchema,
  holdRangeLabel,
  promotedByRelease,
} from "@/lib/holds";

const hold = (
  id: string,
  dates: string[],
  rank = 1,
  invoiceId: string | null = null,
) => ({ id, dates, rank, invoiceId });

describe("clashesOf", () => {
  it("marks pencils that share a date, with whom", () => {
    const tm = hold("tm", ["2026-12-10", "2026-12-11", "2026-12-12"]);
    const rg = hold("rg", ["2026-12-12", "2026-12-13"], 2);
    const rs = hold("rs", ["2026-12-02"]);
    const clashes = clashesOf([tm, rg, rs]);
    assert.deepEqual(clashes.get("tm")?.map((h) => h.id), ["rg"]);
    assert.deepEqual(clashes.get("rg")?.map((h) => h.id), ["tm"]);
    assert.equal(clashes.has("rs"), false);
  });

  it("flags the pencil beside a confirmed job, not the job", () => {
    const job = hold("job", ["2026-12-12"], 1, "inv1");
    const pencil = hold("p", ["2026-12-12"], 2);
    const clashes = clashesOf([job, pencil]);
    assert.equal(clashes.has("job"), false);
    assert.deepEqual(clashes.get("p")?.map((h) => h.id), ["job"]);
  });
});

describe("promotedByRelease", () => {
  const first = hold("first", ["2026-12-10", "2026-12-11"]);
  const second = hold("second", ["2026-12-11"], 2);
  const elsewhere = hold("elsewhere", ["2026-12-20"], 2);

  it("moves the 2nd pencils on a released 1st's dates up", () => {
    assert.deepEqual(promotedByRelease([first, second, elsewhere], first), ["second"]);
  });

  it("moves nobody when a 2nd or a confirmed job goes", () => {
    assert.deepEqual(promotedByRelease([first, second], second), []);
    const confirmed = hold("c", ["2026-12-11"], 1, "inv1");
    assert.deepEqual(promotedByRelease([confirmed, second], confirmed), []);
  });

  it("leaves a confirmed 2nd alone", () => {
    const confirmedSecond = hold("cs", ["2026-12-11"], 2, "inv2");
    assert.deepEqual(promotedByRelease([first, confirmedSecond], first), []);
  });
});

describe("holdRangeLabel", () => {
  it("joins runs and says the month once", () => {
    assert.equal(holdRangeLabel(["2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13"], 2026), "10–13 Dec");
    assert.equal(holdRangeLabel(["2026-12-02", "2026-12-03", "2026-12-04", "2026-12-09"], 2026), "2–4, 9 Dec");
    assert.equal(holdRangeLabel(["2026-12-05"], 2026), "5 Dec");
  });

  it("names both months across a month end", () => {
    assert.equal(holdRangeLabel(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"], 2026), "29 Nov–2 Dec");
    assert.equal(holdRangeLabel(["2026-11-29", "2026-12-04"], 2026), "29 Nov, 4 Dec");
  });

  it("gives the year only when it isn't this one", () => {
    assert.equal(holdRangeLabel(["2027-01-04", "2027-01-05"], 2026), "4–5 Jan 2027");
    assert.equal(
      holdRangeLabel(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"], 2026),
      "30 Dec 2026–2 Jan 2027",
    );
  });
});

describe("holdDatesSchema", () => {
  it("sorts, dedupes and refuses what isn't a date", () => {
    assert.deepEqual(holdDatesSchema.parse(["2026-12-11", "2026-12-10", "2026-12-11"]), ["2026-12-10", "2026-12-11"]);
    assert.equal(holdDatesSchema.safeParse(["2026-02-30"]).success, false);
    assert.equal(holdDatesSchema.safeParse([]).success, false);
  });
});
