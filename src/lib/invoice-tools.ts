import { tool } from "ai";
import { z } from "zod";

import {
  type BillableDay,
  BillingError,
  type InvoiceTerms,
  termsFromClient,
} from "@/lib/billing";
import {
  dayBillingWrites,
  parseStoredTerms,
  storedToBillable,
} from "@/lib/day-invoice";
import { prisma } from "@/lib/db";
import {
  generateNextInvoiceNumber,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoice-number";
import { formatCurrency } from "@/lib/utils";

/** Dates reach Prisma via `new Date()`, so anything looser becomes Invalid Date */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO date (YYYY-MM-DD)");

/**
 * Everything the tools need from the request that made them. Kept as plain data
 * so a test can build one without faking a Request or a session.
 */
export interface InvoiceToolContext {
  userId: string;
  email: string;
  /** The user profile fields that get copied onto every invoice */
  user: {
    fullName: string | null;
    name: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    iban: string | null;
    swiftBic: string | null;
    accountNumber: string | null;
    sortCode: string | null;
    bankAddress: string | null;
  } | null;
  profileComplete: boolean;
  currency: string;
  /** Currency symbol */
  sym: string;
}

/** The profile fields every invoice copies; without them one can't be made */
export const isProfileComplete = (
  user: {
    fullName: string | null;
    name: string | null;
    addressLine1: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    iban: string | null;
    swiftBic: string | null;
  } | null,
) =>
  !!(
    user?.iban &&
    user.swiftBic &&
    user.addressLine1 &&
    user.city &&
    user.postalCode &&
    user.country &&
    (user.fullName || user.name)
  );

const daySchema = z.object({
  date: isoDate.describe("The calendar date"),
  type: z
    .enum(["work", "travel", "dark"])
    .describe(
      "work: a shoot or show day. travel: a day spent travelling. dark: a paid day with no work (a hold or rest day away from home). A day off is simply left out.",
    ),
  alsoTravel: z
    .enum(["out", "home"])
    .optional()
    .describe(
      "Work days only, when the user also travelled that day: 'out' = flew in before work, 'home' = flew home after wrap. The client's terms decide how it bills.",
    ),
  overtimeHours: z
    .number()
    .positive()
    .max(14)
    .optional()
    .describe(
      "Work days only: overtime hours past a 10-hour day, as the user states them. Never split them into rates: the client's terms do that.",
    ),
});

const expenseSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z
    .number()
    .nonnegative()
    .describe("Price per unit in the user's currency"),
});

/**
 * The tool input schemas, named so tests can exercise them directly: `tool()`
 * widens `inputSchema` to a shape without Zod's methods on it.
 *
 * These are the guardrail. Every constraint here is one the model cannot
 * violate, versus a line in the system prompt it can simply not follow.
 */
export const createInvoiceDraftInput = z.object({
  showName: z.string().min(1).describe("Project or show name"),
  invoiceDate: isoDate.describe("Invoice date"),
  clientId: z
    .string()
    .optional()
    .describe(
      "ID of a saved client. Their saved rates and terms price the invoice.",
    ),
  rates: z
    .object({
      dayRate: z.number().positive(),
      perDiemTravel: z.number().nonnegative().optional(),
      perDiemWork: z.number().nonnegative().optional(),
    })
    .optional()
    .describe(
      "Only for a client who isn't saved: the day rate and per diems the user gives you. Never guess them.",
    ),
  clientName: z
    .string()
    .optional()
    .describe("Client name, for an unsaved client"),
  clientAddress1: z.string().optional(),
  clientCity: z.string().optional(),
  clientPostalCode: z.string().optional(),
  clientCountry: z.string().optional(),
  attentionTo: z.string().optional().describe("Contact person at the client"),
  days: z
    .array(daySchema)
    .min(1)
    .max(366)
    .describe(
      'Every billed date of the job, one entry per date. Work out real dates from what the user says ("Tuesday to Friday" is four entries).',
    ),
  expenses: z
    .array(expenseSchema)
    .optional()
    .describe(
      "Anything the user paid for (taxis, fuel, kit hire) and any fixed fees",
    ),
  notes: z.string().optional(),
});

export const updateInvoiceDraftInput = z.object({
  invoiceId: z.string().min(1),
  showName: z.string().min(1).optional(),
  invoiceDate: isoDate.optional(),
  attentionTo: z.string().optional(),
  days: z
    .array(daySchema)
    .min(1)
    .max(366)
    .optional()
    .describe(
      "Replaces every day on the invoice if provided: include all of them, not only the changed ones. Omit to leave the days alone.",
    ),
  expenses: z
    .array(expenseSchema)
    .optional()
    .describe(
      "Replaces every expense if provided: include all you want kept. Omit to leave them alone.",
    ),
  notes: z.string().optional(),
});

/**
 * Reads what the model meant rather than refusing it: "travelled out" on a
 * travel day is just that travel day's direction. (A live test had the model
 * mark the outbound flight this way, get refused, and retry.) Anything else
 * that doesn't fit, like travel on a dark day, still reaches billDays and is
 * refused with a reason.
 */
const normaliseDays = (days: z.infer<typeof daySchema>[]): BillableDay[] =>
  days.map(({ alsoTravel, ...day }) =>
    day.type === "travel"
      ? { ...day, ...(alsoTravel && { direction: alsoTravel }) }
      : { ...day, ...(alsoTravel && { alsoTravel }) },
  );

/** "4 travel, 2 work, 1 dark, 2h overtime", for the model to confirm back */
const describeDays = (days: BillableDay[]) => {
  const count = (type: BillableDay["type"]) =>
    days.filter((d) => d.type === type).length;
  const overtime = days.reduce((sum, d) => sum + (d.overtimeHours ?? 0), 0);
  return [
    count("travel") && `${count("travel")} travel`,
    count("work") && `${count("work")} work`,
    count("dark") && `${count("dark")} dark`,
    overtime && `${overtime}h overtime`,
  ]
    .filter(Boolean)
    .join(", ");
};

/**
 * The assistant's two invoice tools. They live here rather than inline in the
 * route handler so their `execute` can be called directly from a test: the
 * guards inside them are the only thing standing between a bad tool call and a
 * wrong invoice.
 *
 * Both build invoices from dated days and price them with `billDays`, the same
 * as the editor and the API, so a chat draft opens in the calendar editor.
 */
export const buildInvoiceTools = ({
  userId,
  email,
  user,
  profileComplete,
  currency,
}: InvoiceToolContext) => ({
  createInvoiceDraft: tool({
    description:
      "Create a draft invoice from the dates of a job. Call it once you have a project name, a date, a client (saved, or the rates for an unsaved one) and the days worked. The user's profile details are added automatically.",
    inputSchema: createInvoiceDraftInput,
    execute: async ({
      showName,
      invoiceDate,
      clientId,
      rates,
      clientName,
      clientAddress1,
      clientCity,
      clientPostalCode,
      clientCountry,
      attentionTo,
      days,
      expenses,
      notes,
    }) => {
      if (!profileComplete) {
        return {
          error:
            "User profile is incomplete. Please visit /profile to add your address and banking details before creating invoices.",
        };
      }

      const client = clientId
        ? await prisma.client.findFirst({ where: { id: clientId, userId } })
        : null;
      if (clientId && !client) {
        return {
          error: `No saved client with id "${clientId}". Use an id from the saved client list, or omit clientId and pass the client's name and rates.`,
        };
      }

      // A saved client's own terms, or the rates given for a one-off client
      let terms: InvoiceTerms | null;
      if (client) {
        terms = termsFromClient(client);
        if (!terms) {
          return {
            error: `${client.name} has no day rate saved. Ask the user for it, or to add it to the client, before creating the invoice.`,
          };
        }
      } else if (rates) {
        terms = {
          dayRate: rates.dayRate,
          perDiem: {
            travel: rates.perDiemTravel ?? 0,
            work: rates.perDiemWork ?? 0,
          },
          overtimeTier: null,
          travelWork: { bill: "both", perDiem: "travel" },
        };
      } else {
        return {
          error:
            "No rates to price the days. Pass the clientId of a saved client, or the rates the user gives you for an unsaved one.",
        };
      }

      let billing: ReturnType<typeof dayBillingWrites>;
      try {
        billing = dayBillingWrites(normaliseDays(days), terms, expenses ?? []);
      } catch (err) {
        if (err instanceof BillingError) return { error: err.message };
        throw err;
      }

      const createDraft = (invoiceNumber: string) =>
        prisma.invoice.create({
          data: {
            userId,
            clientId: client?.id ?? null,
            invoiceNumber,
            invoiceDate: new Date(invoiceDate),
            showName,
            fullName: user!.fullName ?? user!.name ?? "",
            email,
            addressLine1: user!.addressLine1!,
            addressLine2: user?.addressLine2 ?? undefined,
            city: user!.city!,
            state: user?.state ?? undefined,
            postalCode: user!.postalCode!,
            country: user!.country!,
            clientName: client?.name ?? clientName ?? undefined,
            clientAddress1: client?.addressLine1 ?? clientAddress1 ?? undefined,
            clientAddress2: client?.addressLine2 ?? undefined,
            clientCity: client?.city ?? clientCity ?? undefined,
            clientState: client?.state ?? undefined,
            clientPostalCode:
              client?.postalCode ?? clientPostalCode ?? undefined,
            clientCountry: client?.country ?? clientCountry ?? undefined,
            attentionTo: attentionTo ?? client?.attentionTo ?? undefined,
            iban: user!.iban!,
            swiftBic: user!.swiftBic!,
            accountNumber: user?.accountNumber ?? undefined,
            sortCode: user?.sortCode ?? undefined,
            bankAddress: user?.bankAddress ?? undefined,
            currency,
            // Legacy columns the schema still requires; nothing reads them
            regularRate: 0,
            overtimeRate: 0,
            perDiemRate: 0,
            travelDayRate: 0,
            status: "draft",
            notes: notes ?? undefined,
            ...billing,
          },
          select: { id: true, invoiceNumber: true, totalAmount: true },
        });

      // The next number is picked before the insert, so another draft created
      // in the same moment can take it first; pick again rather than fail
      let invoice: Awaited<ReturnType<typeof createDraft>> | undefined;
      for (let attempt = 0; !invoice; attempt++) {
        try {
          invoice = await createDraft(await generateNextInvoiceNumber(userId));
        } catch (err) {
          if (!isDuplicateInvoiceNumberError(err) || attempt >= 2) throw err;
        }
      }

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        days: describeDays(days),
        total: formatCurrency(Number(invoice.totalAmount), currency),
      };
    },
  }),

  updateInvoiceDraft: tool({
    description:
      "Correct a draft invoice: its name, date, contact, notes, days or expenses. Days and expenses replace what's there, so send the full set.",
    inputSchema: updateInvoiceDraftInput,
    execute: async ({
      invoiceId,
      showName,
      invoiceDate,
      attentionTo,
      days,
      expenses,
      notes,
    }) => {
      const existing = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
        select: {
          id: true,
          terms: true,
          totalAmount: true,
          days: true,
          customExpenseEntries: true,
        },
      });
      if (!existing) {
        return { error: "Invoice not found or does not belong to you." };
      }

      // Invoices made before days were recorded are never converted
      const terms = parseStoredTerms(existing.terms);
      if (!terms) {
        return {
          error:
            "This invoice was made before days were recorded, so it can't be edited here. Offer to create a new draft with createInvoiceDraft instead.",
        };
      }

      const scalars = {
        ...(showName && { showName }),
        ...(invoiceDate && { invoiceDate: new Date(invoiceDate) }),
        ...(attentionTo !== undefined && { attentionTo }),
        ...(notes !== undefined && { notes }),
      };

      if (!days && !expenses) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: scalars,
        });
        return {
          success: true,
          invoiceId,
          total: formatCurrency(Number(existing.totalAmount), currency),
        };
      }

      // Whichever of days and expenses wasn't sent stays as it was; the bill
      // is always worked out from the full set, at the invoice's own terms
      const nextDays = days
        ? normaliseDays(days)
        : storedToBillable(existing.days);
      const nextExpenses =
        expenses ??
        existing.customExpenseEntries.map((e) => ({
          description: e.description,
          quantity: e.quantity,
          unitPrice: Number(e.unitPrice),
        }));

      let billing: ReturnType<typeof dayBillingWrites>;
      try {
        billing = dayBillingWrites(nextDays, terms, nextExpenses);
      } catch (err) {
        if (err instanceof BillingError) return { error: err.message };
        throw err;
      }

      // Replace the billing atomically, so a failure can't leave the draft
      // with its rows deleted
      await prisma.$transaction([
        prisma.invoiceLineItem.deleteMany({ where: { invoiceId } }),
        prisma.overtimeEntry.deleteMany({ where: { invoiceId } }),
        prisma.customExpenseEntry.deleteMany({ where: { invoiceId } }),
        prisma.invoiceDay.deleteMany({ where: { invoiceId } }),
        prisma.invoice.update({
          where: { id: invoiceId },
          data: { ...scalars, ...billing },
        }),
      ]);

      return {
        success: true,
        invoiceId,
        days: describeDays(nextDays),
        total: formatCurrency(billing.totalAmount, currency),
      };
    },
  }),
});
