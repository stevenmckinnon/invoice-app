/**
 * The invoice page shows stored billing grouped for reading. Its lines must
 * add back up to the stored total, or the paper would show one figure and
 * the PDF another.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type BillableDay, type InvoiceTerms, billDays } from "@/lib/billing";
import { summariseInvoice } from "@/lib/invoice-summary";

const mallard: InvoiceTerms = {
  dayRate: 450,
  perDiem: { travel: 60, work: 45 },
  overtimeTier: { tierHours: 2, firstRate: "1.5x", afterRate: "2x" },
  travelWork: { bill: "both", perDiem: "travel" },
};

const longJob: BillableDay[] = [
  { date: "2026-09-14", type: "travel" },
  { date: "2026-09-15", type: "work" },
  { date: "2026-09-16", type: "work", overtimeHours: 3 },
  { date: "2026-09-18", type: "work", overtimeHours: 5 },
  { date: "2026-09-19", type: "dark" },
  { date: "2026-09-25", type: "work", alsoTravel: "out" },
  { date: "2026-09-27", type: "travel" },
];

const expenses = [{ description: "Fuel", quantity: 1, unitPrice: 64.2 }];

/** What's stored: billDays' output, as the API writes it */
const stored = () => {
  const bill = billDays({ days: longJob, terms: mallard, expenses });
  return {
    bill,
    summary: summariseInvoice({
      items: bill.items,
      overtimeEntries: bill.overtimeEntries,
      customExpenseEntries: bill.customExpenseEntries,
      days: longJob,
      terms: mallard,
    }),
  };
};

const sum = (lines: Array<{ amount: number }>) =>
  lines.reduce((total, l) => total + l.amount, 0);

describe("summariseInvoice", () => {
  it("shows lines that add up to the stored total", () => {
    const { bill, summary } = stored();
    const shown =
      sum(summary.labour) +
      sum(summary.perDiems) +
      sum(summary.other) +
      sum(summary.expenses);
    assert.equal(Math.round(shown * 100) / 100, bill.totalAmount);
  });

  it("groups overtime by rate with the dates it fell on", () => {
    const { summary } = stored();
    const overtime = summary.labour.filter((l) => l.unit === "h");
    assert.deepEqual(
      overtime.map((l) => [l.description, l.qty, l.dates]),
      [
        ["Overtime at 1.5×", 4, ["2026-09-16", "2026-09-18"]],
        ["Overtime at 2×", 4, ["2026-09-16", "2026-09-18"]],
      ],
    );
  });

  it("says which days a count includes", () => {
    const { summary } = stored();
    assert.deepEqual(
      [...summary.labour, ...summary.perDiems]
        .filter((l) => l.unit !== "h")
        .map((l) => l.description),
      [
        "Travel days (incl. 1 travel + work)",
        "Work days (incl. 1 travel + work)",
        "Dark days",
        "Travel days (incl. 1 travel + work, 1 dark)",
        "Work days",
      ],
    );
  });

  it("hides rows with nothing on them", () => {
    const { summary } = stored();
    assert.ok([...summary.labour, ...summary.perDiems].every((l) => l.qty > 0));
  });

  it("reads an old count-based invoice with no days or terms", () => {
    const summary = summariseInvoice({
      items: [
        { description: "Work Days", quantity: 2, unitPrice: 500, cost: 1000 },
        { description: "Kit hire", quantity: 1, unitPrice: 120, cost: 120 },
      ],
      overtimeEntries: [
        { date: "2026-08-14T12:00:00.000Z", hours: 2, rateType: "1.5x" },
      ],
      customExpenseEntries: [],
    });
    assert.deepEqual(
      summary.labour.map((l) => [l.description, l.amount]),
      [
        ["Work days", 1000],
        ["Overtime at 1.5×", 150],
      ],
    );
    assert.deepEqual(
      summary.other.map((l) => l.description),
      ["Kit hire"],
    );
    assert.deepEqual(summary.labour[1].dates, ["2026-08-14"]);
  });
});
