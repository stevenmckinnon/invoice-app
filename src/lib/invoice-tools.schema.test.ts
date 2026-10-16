/**
 * Tier 1, part one: does the tool schema reject a bad call before `execute`
 * ever runs? Pure Zod, no database, milliseconds — safe as a blocking CI gate.
 *
 * A regression here means the model can write a wrong invoice again, so these
 * matter more than their size suggests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createInvoiceDraftInput,
  updateInvoiceDraftInput,
} from "@/lib/invoice-tools";

const parse = (input: unknown) => createInvoiceDraftInput.safeParse(input);

const validDraft = {
  showName: "The Hollow Crown",
  invoiceDate: "2026-08-14",
  days: [{ date: "2026-08-14", type: "work" }],
};

describe("createInvoiceDraft schema", () => {
  it("accepts a minimal valid call", () => {
    assert.equal(parse(validDraft).success, true);
  });

  it("needs at least one day", () => {
    assert.equal(parse({ ...validDraft, days: [] }).success, false);
    const { days: _days, ...noDays } = validDraft;
    assert.equal(parse(noDays).success, false);
  });

  it("only knows work, travel and dark days", () => {
    // A "shoot" or "off" day isn't billable as anything; a day off is left out
    for (const type of ["shoot", "off"]) {
      assert.equal(
        parse({ ...validDraft, days: [{ date: "2026-08-14", type }] }).success,
        false,
      );
    }
  });

  it("rejects a date the model wrote in prose", () => {
    const result = parse({ ...validDraft, invoiceDate: "next Friday" });
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0].message, /ISO date/);
  });

  it("rejects a day whose date isn't yyyy-mm-dd", () => {
    for (const date of ["last Friday", "14/08/2026", "2026-8-14"]) {
      assert.equal(
        parse({ ...validDraft, days: [{ date, type: "work" }] }).success,
        false,
      );
    }
  });

  it("takes overtime as hours, with no rate to choose", () => {
    const result = parse({
      ...validDraft,
      days: [{ date: "2026-08-14", type: "work", overtimeHours: 3 }],
    });
    assert.equal(result.success, true);
    // The client's terms split the rates; the model can't pass one
    assert.equal("rateType" in result.data!.days[0], false);
  });

  it("rejects impossible overtime", () => {
    for (const overtimeHours of [-1, 0, 30]) {
      assert.equal(
        parse({
          ...validDraft,
          days: [{ date: "2026-08-14", type: "work", overtimeHours }],
        }).success,
        false,
      );
    }
  });

  it("only accepts out or home for travel on a work day", () => {
    assert.equal(
      parse({
        ...validDraft,
        days: [{ date: "2026-08-14", type: "work", alsoTravel: "home" }],
      }).success,
      true,
    );
    assert.equal(
      parse({
        ...validDraft,
        days: [{ date: "2026-08-14", type: "work", alsoTravel: "both" }],
      }).success,
      false,
    );
  });

  it("takes rates for an unsaved client, and refuses a zero day rate", () => {
    assert.equal(
      parse({ ...validDraft, rates: { dayRate: 450, perDiemTravel: 60 } })
        .success,
      true,
    );
    assert.equal(
      parse({ ...validDraft, rates: { dayRate: 0 } }).success,
      false,
    );
  });

  it("defaults an expense's quantity to one", () => {
    const result = parse({
      ...validDraft,
      expenses: [{ description: "Taxi", unitPrice: 18 }],
    });
    assert.equal(result.data!.expenses![0].quantity, 1);
  });

  it("requires a show name", () => {
    assert.equal(parse({ ...validDraft, showName: "" }).success, false);
  });
});

describe("updateInvoiceDraft schema", () => {
  const parseUpdate = (input: Record<string, unknown>) =>
    updateInvoiceDraftInput.safeParse({ invoiceId: "inv_1", ...input });

  it("requires an invoice id", () => {
    assert.equal(
      updateInvoiceDraftInput.safeParse({ showName: "X" }).success,
      false,
    );
  });

  it("holds the same day and date rules as create", () => {
    assert.equal(parseUpdate({ invoiceDate: "next Friday" }).success, false);
    assert.equal(
      parseUpdate({ days: [{ date: "2026-08-14", type: "shoot" }] }).success,
      false,
    );
    assert.equal(
      parseUpdate({
        days: [{ date: "2026-08-14", type: "work", overtimeHours: 5 }],
      }).success,
      true,
    );
  });

  it("treats an empty days list as a mistake, not 'clear every day'", () => {
    assert.equal(parseUpdate({ days: [] }).success, false);
  });
});
