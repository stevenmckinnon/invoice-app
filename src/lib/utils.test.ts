/**
 * Totals across currencies. The bug these guard against: adding £ and $
 * together as if they were one unit, which every total in the app once did.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCurrencyTotals, sumByCurrency } from "@/lib/utils";

describe("sumByCurrency", () => {
  it("keeps each currency separate", () => {
    assert.deepEqual(
      sumByCurrency([
        { currency: "GBP", totalAmount: 100 },
        { currency: "USD", totalAmount: 50 },
        { currency: "GBP", totalAmount: "25.50" },
      ]),
      [
        { currency: "GBP", amount: 125.5 },
        { currency: "USD", amount: 50 },
      ],
    );
  });

  it("orders the largest total first", () => {
    const totals = sumByCurrency([
      { currency: "GBP", totalAmount: 10 },
      { currency: "EUR", totalAmount: 900 },
    ]);
    assert.deepEqual(
      totals.map((t) => t.currency),
      ["EUR", "GBP"],
    );
  });

  it("returns nothing for no invoices", () => {
    assert.deepEqual(sumByCurrency([]), []);
  });
});

describe("formatCurrencyTotals", () => {
  it("shows a single currency as one amount", () => {
    assert.equal(
      formatCurrencyTotals([{ currency: "GBP", totalAmount: 1200 }]),
      "£1,200.00",
    );
  });

  it("joins currencies rather than adding them", () => {
    assert.equal(
      formatCurrencyTotals([
        { currency: "GBP", totalAmount: 1000 },
        { currency: "USD", totalAmount: 500 },
      ]),
      "£1,000.00 + US$500.00",
    );
  });

  it("shows zero in the fallback currency when empty", () => {
    assert.equal(formatCurrencyTotals([], "EUR"), "€0.00");
  });
});
