/**
 * "Paid in November" counts by the day an invoice was marked paid, and a
 * paid date follows the status: stamped on paid, cleared on going back.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { averageOf, paidInMonth } from "@/lib/dashboard-figures";
import { paidAtAfter } from "@/lib/invoice-lifecycle";

const now = new Date(2026, 10, 3, 12); // 3 November 2026, midday

describe("paidInMonth", () => {
  it("counts by the paid date, not the invoice date", () => {
    const { amount, count } = paidInMonth(
      [
        // Invoiced in May, paid this month: counts
        { totalAmount: 1000, status: "paid", paidAt: new Date(2026, 10, 1) },
        // Paid last month: doesn't
        { totalAmount: 500, status: "paid", paidAt: new Date(2026, 9, 31) },
        // November a year ago: doesn't
        { totalAmount: 700, status: "paid", paidAt: new Date(2025, 10, 2) },
      ],
      now,
    );
    assert.equal(amount, 1000);
    assert.equal(count, 1);
  });

  it("skips paid invoices with no paid date, and anything not paid", () => {
    const { amount } = paidInMonth(
      [
        { totalAmount: 1000, status: "paid", paidAt: null },
        { totalAmount: 400, status: "sent", paidAt: null },
        // Voided after it was paid: keeps its date, but the dashboard leaves void out
        { totalAmount: 300, status: "void", paidAt: new Date(2026, 10, 2) },
      ],
      now,
    );
    assert.equal(amount, 0);
  });

  it("reads the ISO strings the API sends", () => {
    const { amount } = paidInMonth(
      [{ totalAmount: 250, status: "paid", paidAt: "2026-11-02T09:30:00.000Z" }],
      now,
    );
    assert.equal(amount, 250);
  });
});

describe("paidAtAfter", () => {
  it("stamps the date on becoming paid", () => {
    assert.equal(paidAtAfter("sent", "paid", now), now);
    assert.equal(paidAtAfter("draft", "paid", now), now);
  });

  it("clears it when a paid invoice goes back", () => {
    assert.equal(paidAtAfter("paid", "sent", now), null);
    assert.equal(paidAtAfter("paid", "overdue", now), null);
  });

  it("leaves it alone otherwise", () => {
    // Marking paid again doesn't move the date
    assert.equal(paidAtAfter("paid", "paid", now), undefined);
    // The money came in, so a voided paid invoice keeps it
    assert.equal(paidAtAfter("paid", "void", now), undefined);
    assert.equal(paidAtAfter("sent", "overdue", now), undefined);
  });
});

describe("averageOf", () => {
  it("has no average for nothing", () => {
    assert.equal(averageOf([]), null);
    assert.equal(averageOf([100, 300]), 200);
  });
});
