import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dateRange, shortDateList, toLegs, toStripDays } from "@/lib/day-strip";

describe("toStripDays", () => {
  it("fills gaps between the first and last day as days off", () => {
    const days = toStripDays([
      { date: "2026-09-22", type: "travel" },
      { date: "2026-09-25", type: "work" },
    ]);
    assert.deepEqual(
      days.map((d) => [d.date, d.type]),
      [
        ["2026-09-22", "travel"],
        ["2026-09-23", "off"],
        ["2026-09-24", "off"],
        ["2026-09-25", "work"],
      ],
    );
  });

  it("sorts days that arrive out of order", () => {
    const days = toStripDays([
      { date: "2026-09-10", type: "work" },
      { date: "2026-09-09", type: "travel" },
    ]);
    assert.deepEqual(
      days.map((d) => d.date),
      ["2026-09-09", "2026-09-10"],
    );
  });

  it("crosses a month boundary without dropping or doubling a date", () => {
    const days = toStripDays([
      { date: "2026-09-30", type: "work" },
      { date: "2026-10-01", type: "work" },
    ]);
    assert.deepEqual(
      days.map((d) => d.date),
      ["2026-09-30", "2026-10-01"],
    );
  });

  it("works out travel direction from the days around it", () => {
    const days = toStripDays([
      { date: "2026-09-08", type: "travel" },
      { date: "2026-09-09", type: "work" },
      { date: "2026-09-10", type: "travel" },
      // 11th is a day off
      { date: "2026-09-12", type: "travel" },
      { date: "2026-09-13", type: "dark" },
      { date: "2026-09-14", type: "travel" },
    ]);
    assert.deepEqual(
      days.filter((d) => d.type === "travel").map((d) => [d.date, d.direction]),
      [
        ["2026-09-08", "out"], // into work
        ["2026-09-10", "home"], // into a day off
        ["2026-09-12", "out"], // into a dark day
        ["2026-09-14", "home"], // end of the job
      ],
    );
  });

  it("keeps a stored direction over the guess", () => {
    const [day] = toStripDays([
      { date: "2026-09-08", type: "travel", direction: "home" },
      { date: "2026-09-09", type: "work" },
    ]);
    assert.equal(day.direction, "home");
  });

  it("returns nothing for an invoice without days", () => {
    assert.deepEqual(toStripDays([]), []);
  });
});

describe("toLegs", () => {
  it("merges runs of one type, splitting travel by direction", () => {
    const legs = toLegs(
      toStripDays([
        { date: "2026-09-08", type: "travel" },
        { date: "2026-09-09", type: "travel" },
        { date: "2026-09-10", type: "work" },
        { date: "2026-09-11", type: "work" },
        { date: "2026-09-12", type: "travel" },
      ]),
    );
    assert.deepEqual(
      legs.map((l) => [l.type, l.direction, l.days]),
      [
        ["travel", "out", 2],
        ["work", undefined, 2],
        ["travel", "home", 1],
      ],
    );
  });
});

describe("date labels", () => {
  it("shortens a range within a month", () => {
    assert.equal(dateRange("2026-09-08", "2026-09-13"), "8–13 September 2026");
  });

  it("spells out both months across a boundary", () => {
    assert.equal(
      dateRange("2026-09-28", "2026-10-04"),
      "28 September – 4 October 2026",
    );
  });

  it("lists overtime dates compactly", () => {
    assert.equal(shortDateList(["2026-09-16", "2026-09-11"]), "11, 16 Sept");
    assert.equal(shortDateList(["2026-10-02", "2026-09-30"]), "30 Sept, 2 Oct");
  });
});
