/**
 * Tier 1, part one: does the tool schema reject a bad call before `execute`
 * ever runs? Pure Zod, no database, milliseconds — safe as a blocking CI gate.
 *
 * These are the cases the schema hardening was written for. A regression here
 * means the model can write a wrong invoice again, so they matter more than
 * their size suggests.
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
};

describe("createInvoiceDraft schema", () => {
  it("accepts a minimal valid call", () => {
    assert.equal(parse(validDraft).success, true);
  });

  it("rejects a negative quantity", () => {
    const result = parse({
      ...validDraft,
      items: [{ description: "Work Days", quantity: -5, unitPrice: 525 }],
    });
    assert.equal(result.success, false);
  });

  it("rejects a line item description outside the standard five", () => {
    // The exact failure from the probe: "Shoot Days" prices overtime at £0,
    // because deriveOvertimeHourlyRate matches "Work Days" exactly
    const result = parse({
      ...validDraft,
      items: [{ description: "Shoot Days", quantity: 5, unitPrice: 525 }],
    });
    assert.equal(result.success, false);
  });

  it("rejects a date the model wrote in prose", () => {
    const result = parse({ ...validDraft, invoiceDate: "next Friday" });
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0].message, /ISO date/);
  });

  it("rejects an unparseable date that looks close enough", () => {
    assert.equal(
      parse({ ...validDraft, invoiceDate: "14/08/2026" }).success,
      false,
    );
    assert.equal(
      parse({ ...validDraft, invoiceDate: "2026-8-14" }).success,
      false,
    );
  });

  it("allows a standard item with no unitPrice, meaning 'use the saved rate'", () => {
    const result = parse({
      ...validDraft,
      items: [{ description: "Work Days", quantity: 5 }],
    });
    assert.equal(result.success, true);
  });

  it("allows overtime with no rateType, for the client's tier rule to resolve", () => {
    const result = parse({
      ...validDraft,
      overtimeEntries: [{ date: "2026-08-14", hours: 5 }],
    });
    assert.equal(result.success, true);
    assert.equal(result.data!.overtimeEntries![0].rateType, undefined);
  });

  it("rejects an overtime rate that isn't one of the two we can price", () => {
    const result = parse({
      ...validDraft,
      overtimeEntries: [{ date: "2026-08-14", hours: 5, rateType: "1.75x" }],
    });
    assert.equal(result.success, false);
  });

  it("rejects a bad overtime date and impossible hours", () => {
    assert.equal(
      parse({
        ...validDraft,
        overtimeEntries: [{ date: "last Friday", hours: 2 }],
      }).success,
      false,
    );
    assert.equal(
      parse({
        ...validDraft,
        overtimeEntries: [{ date: "2026-08-14", hours: 30 }],
      }).success,
      false,
    );
  });

  it("requires a show name", () => {
    assert.equal(parse({ ...validDraft, showName: "" }).success, false);
  });
});

describe("updateInvoiceDraft schema", () => {
  it("requires an invoice id", () => {
    assert.equal(
      updateInvoiceDraftInput.safeParse({ showName: "X" }).success,
      false,
    );
  });

  it("holds the same line-item and date rules as create", () => {
    const parseUpdate = (input: Record<string, unknown>) =>
      updateInvoiceDraftInput.safeParse({ invoiceId: "inv_1", ...input });

    assert.equal(
      parseUpdate({
        items: [{ description: "Shoot Days", quantity: 5, unitPrice: 525 }],
      }).success,
      false,
    );
    assert.equal(parseUpdate({ invoiceDate: "next Friday" }).success, false);
    assert.equal(
      parseUpdate({ overtimeEntries: [{ date: "2026-08-14", hours: 5 }] })
        .success,
      true,
    );
  });
});
