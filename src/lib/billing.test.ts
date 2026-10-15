/**
 * Pins the day-to-money rules to real figures. INV-2605 is a real invoice
 * that went out at £3,748.13, so billing its days must reproduce it exactly,
 * line by line; the other two jobs cover a dark day, tiered overtime across
 * several days, a travel + work day, and a client with different terms.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type BillableDay,
  BillingError,
  type InvoiceTerms,
  billDays,
  termsFromClient,
} from "@/lib/billing";
import { calculateInvoiceTotals } from "@/lib/pdf";

const tier = { tierHours: 2, firstRate: "1.5x", afterRate: "2x" } as const;

const wwe: InvoiceTerms = {
  dayRate: 525,
  perDiem: { travel: 70, work: 50 },
  overtimeTier: tier,
  travelWork: { bill: "both", perDiem: "travel" },
};

const mallard: InvoiceTerms = {
  dayRate: 450,
  perDiem: { travel: 60, work: 45 },
  overtimeTier: tier,
  travelWork: { bill: "both", perDiem: "travel" },
};

/** No tier, and a travel + work day bills once, as a work day */
const northlight: InvoiceTerms = {
  dayRate: 400,
  perDiem: { travel: 50, work: 40 },
  overtimeTier: null,
  travelWork: { bill: "work", perDiem: "work" },
};

const inv2605: BillableDay[] = [
  { date: "2026-09-08", type: "travel" },
  { date: "2026-09-09", type: "travel" },
  { date: "2026-09-10", type: "work" },
  { date: "2026-09-11", type: "work", overtimeHours: 2 },
  { date: "2026-09-12", type: "travel" },
  { date: "2026-09-13", type: "travel" },
];
const inv2605Expenses = [
  { description: "Uber", quantity: 1, unitPrice: 32.97 },
  { description: "Uber", quantity: 1, unitPrice: 27.66 },
];

/** 14 days: a dark day, a weekend home (23–24 absent), a flew-in work day */
const longJob: BillableDay[] = [
  { date: "2026-09-14", type: "travel" },
  { date: "2026-09-15", type: "work" },
  { date: "2026-09-16", type: "work", overtimeHours: 3 },
  { date: "2026-09-17", type: "work" },
  { date: "2026-09-18", type: "work", overtimeHours: 5 },
  { date: "2026-09-19", type: "dark" },
  { date: "2026-09-20", type: "work" },
  { date: "2026-09-21", type: "work", overtimeHours: 1 },
  { date: "2026-09-22", type: "travel" },
  { date: "2026-09-25", type: "work", alsoTravel: "out" },
  { date: "2026-09-26", type: "work", overtimeHours: 4 },
  { date: "2026-09-27", type: "travel" },
];
const longJobExpenses = [
  { description: "Fuel", quantity: 1, unitPrice: 64.2 },
  { description: "Parking", quantity: 1, unitPrice: 18 },
];

const quantities = (bill: ReturnType<typeof billDays>) =>
  Object.fromEntries(bill.items.map((i) => [i.description, i.quantity]));

describe("billDays: pinned figures", () => {
  it("reproduces INV-2605 exactly as sent: £3,748.13", () => {
    const bill = billDays({
      days: inv2605,
      terms: wwe,
      expenses: inv2605Expenses,
    });

    assert.deepEqual(
      bill.items.map(({ description, quantity, unitPrice, cost }) => [
        description,
        quantity,
        unitPrice,
        cost,
      ]),
      [
        ["Travel Days", 4, 525, 2100],
        ["Work Days", 2, 525, 1050],
        ["Dark days", 0, 525, 0],
        ["Per Diems Travel Days", 4, 70, 280],
        ["Per Diems Work Days", 2, 50, 100],
      ],
    );
    assert.deepEqual(bill.overtimeEntries, [
      { date: "2026-09-11", hours: 2, rateType: "1.5x" },
    ]);
    assert.equal(bill.overtimeTotal, 157.5);
    assert.equal(bill.totalAmount, 3748.13);
  });

  it("bills the long job under Mallard's terms: £7,559.70", () => {
    const bill = billDays({
      days: longJob,
      terms: mallard,
      expenses: longJobExpenses,
    });
    assert.deepEqual(quantities(bill), {
      "Travel Days": 4, // 3 travel + the flew-in work day
      "Work Days": 8, // 7 work + the flew-in work day
      "Dark days": 1,
      "Per Diems Travel Days": 5, // 3 travel + 1 dark + the flew-in day
      "Per Diems Work Days": 7,
    });
    assert.equal(bill.overtimeTotal, 1012.5);
    assert.equal(bill.totalAmount, 7559.7);
  });

  it("bills the same days under Northlight's terms: £6,182.20", () => {
    const bill = billDays({
      days: longJob,
      terms: northlight,
      expenses: longJobExpenses,
    });
    assert.deepEqual(quantities(bill), {
      "Travel Days": 3, // the flew-in day bills once, as work
      "Work Days": 8,
      "Dark days": 1,
      "Per Diems Travel Days": 4, // 3 travel + 1 dark
      "Per Diems Work Days": 8, // the flew-in day takes the work per diem
    });
    assert.ok(bill.overtimeEntries.every((e) => e.rateType === "1.5x"));
    assert.equal(bill.overtimeTotal, 780); // 13h × £40 × 1.5
    assert.equal(bill.totalAmount, 6182.2);
  });

  it("agrees with calculateInvoiceTotals, which the PDF and pages use", () => {
    for (const [days, terms, expenses] of [
      [inv2605, wwe, inv2605Expenses],
      [longJob, mallard, longJobExpenses],
      [longJob, northlight, longJobExpenses],
    ] as const) {
      const bill = billDays({
        days: [...days],
        terms,
        expenses: [...expenses],
      });
      const stored = calculateInvoiceTotals({
        items: bill.items,
        overtimeEntries: bill.overtimeEntries,
        customExpenseEntries: bill.customExpenseEntries,
      } as never);
      assert.equal(
        Math.round(stored.totalAmount * 100) / 100,
        bill.totalAmount,
      );
    }
  });
});

describe("billDays: rules", () => {
  it("resets the overtime tier each day", () => {
    const bill = billDays({
      days: [
        { date: "2026-09-01", type: "work", overtimeHours: 3 },
        { date: "2026-09-02", type: "work", overtimeHours: 3 },
      ],
      terms: mallard,
    });
    assert.deepEqual(bill.overtimeEntries, [
      { date: "2026-09-01", hours: 2, rateType: "1.5x" },
      { date: "2026-09-01", hours: 1, rateType: "2x" },
      { date: "2026-09-02", hours: 2, rateType: "1.5x" },
      { date: "2026-09-02", hours: 1, rateType: "2x" },
    ]);
  });

  it("orders overtime by date whatever order the days arrive in", () => {
    const bill = billDays({
      days: [
        { date: "2026-09-02", type: "work", overtimeHours: 1 },
        { date: "2026-09-01", type: "work", overtimeHours: 1 },
      ],
      terms: mallard,
    });
    assert.deepEqual(
      bill.overtimeEntries.map((e) => e.date),
      ["2026-09-01", "2026-09-02"],
    );
  });

  it("gives a dark day the day rate and the travel per diem", () => {
    const bill = billDays({
      days: [{ date: "2026-09-01", type: "dark" }],
      terms: mallard,
    });
    assert.equal(bill.totalAmount, 450 + 60);
  });

  it("follows each travel + work rule", () => {
    const day: BillableDay = {
      date: "2026-09-01",
      type: "work",
      alsoTravel: "home",
    };
    const total = (travelWork: InvoiceTerms["travelWork"]) =>
      billDays({ days: [day], terms: { ...mallard, travelWork } }).totalAmount;

    assert.equal(total({ bill: "both", perDiem: "travel" }), 450 + 450 + 60);
    assert.equal(total({ bill: "work", perDiem: "work" }), 450 + 45);
    assert.equal(total({ bill: "travel", perDiem: "travel" }), 450 + 60);
  });

  it("bills only expenses when there are no days", () => {
    const bill = billDays({
      days: [],
      terms: mallard,
      expenses: longJobExpenses,
    });
    assert.equal(bill.itemsTotal, 0);
    assert.equal(bill.totalAmount, 82.2);
  });

  it("keeps the day rate on Work Days even with no work days", () => {
    // Overtime's hourly rate is read back off this row's price
    const bill = billDays({
      days: [{ date: "2026-09-01", type: "travel" }],
      terms: mallard,
    });
    const workDays = bill.items.find((i) => i.description === "Work Days")!;
    assert.equal(workDays.quantity, 0);
    assert.equal(workDays.unitPrice, 450);
  });
});

describe("billDays: refuses days it can't bill", () => {
  const refuses = (days: BillableDay[], terms: InvoiceTerms = mallard) =>
    assert.throws(() => billDays({ days, terms }), BillingError);

  it("refuses the same date twice", () =>
    refuses([
      { date: "2026-09-01", type: "work" },
      { date: "2026-09-01", type: "travel" },
    ]));

  it("refuses overtime on a day that isn't a work day", () =>
    refuses([{ date: "2026-09-01", type: "travel", overtimeHours: 2 }]));

  it("refuses travel on a dark day", () =>
    refuses([{ date: "2026-09-01", type: "dark", alsoTravel: "out" }]));

  it("refuses a direction on a work day", () =>
    refuses([{ date: "2026-09-01", type: "work", direction: "home" }]));

  it("refuses negative overtime", () =>
    refuses([{ date: "2026-09-01", type: "work", overtimeHours: -1 }]));

  it("refuses a date that isn't yyyy-mm-dd", () =>
    refuses([{ date: "1 Sept", type: "work" }]));

  it("refuses to bill days without a day rate", () =>
    refuses([{ date: "2026-09-01", type: "work" }], {
      ...mallard,
      dayRate: 0,
    }));
});

describe("termsFromClient", () => {
  it("reads a client's stored terms, Decimals arriving as strings", () => {
    assert.deepEqual(
      termsFromClient({
        dayRate: "525",
        perDiemWork: "50",
        perDiemTravel: "70",
        overtimeTierHours: "2",
        overtimeFirstRate: "1.5x",
        overtimeAfterRate: "2x",
        travelWorkBill: "both",
        travelWorkPerDiem: "travel",
      }),
      wwe,
    );
  });

  it("returns null when the client has no day rate", () => {
    assert.equal(termsFromClient({ dayRate: null }), null);
  });

  it("treats a missing per diem as zero and a half-set tier as none", () => {
    const terms = termsFromClient({ dayRate: 400, overtimeTierHours: 2 });
    assert.deepEqual(terms?.perDiem, { work: 0, travel: 0 });
    assert.equal(terms?.overtimeTier, null);
  });

  it("falls back to current practice for an unknown travel + work rule", () => {
    assert.deepEqual(
      termsFromClient({ dayRate: 400, travelWorkBill: "nonsense" })?.travelWork,
      { bill: "both", perDiem: "travel" },
    );
  });
});
