/**
 * Storing an invoice that's built from dated days. The create and update
 * routes both go through here, so a day invoice is always written the same
 * way: its days, the terms it was priced under, and the line items, overtime
 * and total that `billDays` worked out from them.
 */
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import {
  type BillableDay,
  type BillableExpense,
  type InvoiceTerms,
  billDays,
} from "@/lib/billing";
import { parseDate } from "@/lib/utils";

const direction = z.enum(["out", "home"]);

export const invoiceDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must be yyyy-mm-dd"),
  type: z.enum(["work", "travel", "dark"]),
  alsoTravel: direction.nullish(),
  direction: direction.nullish(),
  overtimeHours: z.number().nonnegative().max(24).nullish(),
});

/** A year of days is far beyond any job; the cap just bounds the request */
export const invoiceDaysSchema = z.array(invoiceDaySchema).max(366);

/** The client columns `termsFromClient` reads */
export const clientTermsSelect = {
  dayRate: true,
  perDiemWork: true,
  perDiemTravel: true,
  overtimeTierHours: true,
  overtimeFirstRate: true,
  overtimeAfterRate: true,
  travelWorkBill: true,
  travelWorkPerDiem: true,
} as const;

const rate = z.enum(["1.5x", "2x"]);
const storedTermsSchema = z.object({
  dayRate: z.number().positive(),
  perDiem: z.object({ work: z.number(), travel: z.number() }),
  overtimeTier: z
    .object({ tierHours: z.number(), firstRate: rate, afterRate: rate })
    .nullable(),
  travelWork: z.object({
    bill: z.enum(["both", "work", "travel"]),
    perDiem: z.enum(["travel", "work"]),
  }),
});

/** Reads `Invoice.terms` back; null for count-based invoices made before days */
export const parseStoredTerms = (value: unknown): InvoiceTerms | null => {
  if (value == null) return null;
  const parsed = storedTermsSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("This invoice's stored terms are unreadable.");
  }
  return parsed.data;
};

/**
 * The nested writes for a day invoice's billing, ready to spread into
 * `prisma.invoice.create` or `update` (after its old rows are cleared).
 * Throws `BillingError` for days that can't be billed.
 */
export const dayBillingWrites = (
  days: BillableDay[],
  terms: InvoiceTerms,
  expenses: BillableExpense[],
) => {
  const bill = billDays({ days, terms, expenses });

  return {
    terms: terms as unknown as Prisma.InputJsonValue,
    totalAmount: bill.totalAmount,
    // Legacy columns nothing reads; zero, as calculateInvoiceTotals has them
    subtotalLabor: 0,
    subtotalPerDiem: 0,
    subtotalTravel: 0,
    items: { createMany: { data: bill.items } },
    overtimeEntries: {
      createMany: {
        data: bill.overtimeEntries.map((entry) => ({
          // Noon, matching how overtime dates are stored everywhere else
          date: parseDate(entry.date),
          hours: entry.hours,
          rateType: entry.rateType,
        })),
      },
    },
    customExpenseEntries: { createMany: { data: bill.customExpenseEntries } },
    days: {
      createMany: {
        data: days.map((day) => ({
          // A calendar date column: midnight UTC stores exactly that date
          date: new Date(`${day.date}T00:00:00Z`),
          type: day.type,
          alsoTravel: day.alsoTravel ?? null,
          direction: day.direction ?? null,
          overtimeHours: day.overtimeHours || null,
        })),
      },
    },
  };
};
