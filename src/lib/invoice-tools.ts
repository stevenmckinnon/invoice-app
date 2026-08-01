import { tool } from "ai";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  isStandardLineItem,
  STANDARD_LINE_ITEMS,
  type StandardLineItem,
} from "@/lib/invoice-items";
import { generateNextInvoiceNumber } from "@/lib/invoice-number";
import {
  clientOvertimeRule,
  deriveOvertimeHourlyRate,
  overtimeEntryCost,
  splitOvertimeHours,
  type OvertimeRateType,
  type OvertimeTierRule,
} from "@/lib/overtime";

/** Dates reach Prisma via `new Date()`, so anything looser becomes Invalid Date */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO date (YYYY-MM-DD)");

interface RawOvertimeEntry {
  date: string;
  hours: number;
  rateType?: OvertimeRateType;
  description?: string;
}

/**
 * Applies the client's tiered overtime rule to entries the model left unpriced,
 * so it only ever reports what the user said ("5 hours on the 14th") and never
 * has to know the policy or do the arithmetic.
 *
 * Auto entries are grouped by date first — the tier is a per-day allowance, so
 * two separate entries on one date must share it. An explicit `rateType` is a
 * manual override that stands as given, but its hours still count towards that
 * day's allowance.
 */
const applyOvertimeTiers = (
  entries: RawOvertimeEntry[],
  rule: OvertimeTierRule,
): Array<
  Required<Pick<RawOvertimeEntry, "date" | "hours">> & {
    rateType: OvertimeRateType;
    description?: string;
  }
> => {
  const explicit = entries.filter((e) => e.rateType);
  const auto = entries.filter((e) => !e.rateType);

  const overriddenHoursByDate = new Map<string, number>();
  for (const entry of explicit) {
    overriddenHoursByDate.set(
      entry.date,
      (overriddenHoursByDate.get(entry.date) ?? 0) + entry.hours,
    );
  }

  const autoByDate = new Map<string, RawOvertimeEntry[]>();
  for (const entry of auto) {
    autoByDate.set(entry.date, [...(autoByDate.get(entry.date) ?? []), entry]);
  }

  const split = [...autoByDate].flatMap(([date, dayEntries]) => {
    const hours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
    const description = dayEntries.find((e) => e.description)?.description;
    return splitOvertimeHours(
      hours,
      rule,
      overriddenHoursByDate.get(date) ?? 0,
    ).map((row) => ({
      date,
      hours: row.hours,
      rateType: row.rateType,
      description,
    }));
  });

  return [
    ...explicit.map((e) => ({ ...e, rateType: e.rateType! })),
    ...split,
  ].sort((a, b) => a.date.localeCompare(b.date));
};

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
  /** Currency symbol, for the totals the tools report back to the model */
  sym: string;
}

/**
 * The tool input schemas, named so tests can exercise them directly — `tool()`
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
    .describe("ID of a saved client, if applicable"),
  clientName: z.string().optional().describe("Client company name"),
  clientAddress1: z.string().optional(),
  clientCity: z.string().optional(),
  clientPostalCode: z.string().optional(),
  clientCountry: z.string().optional(),
  attentionTo: z.string().optional().describe("Contact person at the client"),
  items: z
    .array(
      z.object({
        description: z.enum(STANDARD_LINE_ITEMS),
        quantity: z.number().nonnegative().max(365).describe("Number of days"),
        unitPrice: z
          .number()
          .nonnegative()
          .optional()
          .describe(
            "Rate per day. Omit to use the client's saved rate — do not pass 0 for an unknown rate.",
          ),
      }),
    )
    .default([])
    .describe("Standard day/per-diem line items"),
  extraItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().nonnegative(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .optional()
    .describe(
      "Additional non-standard line items, only when none of the standard items fit",
    ),
  overtimeEntries: z
    .array(
      z.object({
        date: isoDate.describe("Date the overtime was worked"),
        hours: z.number().positive().max(24),
        rateType: z
          .enum(["1.5x", "2x"])
          .optional()
          .describe(
            "Overtime multiplier. Omit it when the client has tiered overtime — the tier is applied for you. Only pass it when the user names a rate, or the client has no tiering.",
          ),
        description: z.string().optional(),
      }),
    )
    .optional()
    .describe(
      "Overtime hours — use this instead of adding overtime as a line item. Priced from the Work Days rate, so a priced Work Days item (or a clientId with a saved day rate) must also be present.",
    ),
  customExpenseEntries: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z
          .number()
          .nonnegative()
          .describe("Price per unit in the user's currency"),
      }),
    )
    .optional()
    .describe(
      "Custom expense entries (e.g. kit rental, travel costs) — use this instead of adding expenses as line items",
    ),
  notes: z.string().optional(),
});

export const updateInvoiceDraftInput = z.object({
  invoiceId: z.string().min(1),
  showName: z.string().min(1).optional(),
  invoiceDate: isoDate.optional(),
  clientName: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.enum(STANDARD_LINE_ITEMS),
        quantity: z.number().nonnegative().max(365),
        unitPrice: z
          .number()
          .nonnegative()
          .optional()
          .describe("Omit to keep the rate already on the invoice"),
      }),
    )
    .optional()
    .describe(
      "Replaces all existing standard line items if provided — include every standard item you want kept, not just the changed ones. Omit entirely to leave the day counts alone.",
    ),
  extraItems: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().nonnegative(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .optional()
    .describe(
      "Replaces all existing non-standard line items if provided — include every one you want kept. Omit entirely to leave them alone.",
    ),
  overtimeEntries: z
    .array(
      z.object({
        date: isoDate,
        hours: z.number().positive().max(24),
        rateType: z
          .enum(["1.5x", "2x"])
          .optional()
          .describe(
            "Omit it when the client has tiered overtime — the tier is applied for you",
          ),
        description: z.string().optional(),
      }),
    )
    .optional()
    .describe("Replaces all existing overtime entries if provided"),
  customExpenseEntries: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .optional()
    .describe("Replaces all existing custom expense entries if provided"),
  notes: z.string().optional(),
});

/**
 * The assistant's two invoice tools. They live here rather than inline in the
 * route handler so their `execute` can be called directly from a test — the
 * guards inside them are the only thing standing between a bad tool call and a
 * wrong invoice, and they were unverifiable while they closed over request scope.
 */
export const buildInvoiceTools = ({
  userId,
  email,
  user,
  profileComplete,
  currency,
  sym,
}: InvoiceToolContext) => ({
  createInvoiceDraft: tool({
    description:
      "Create a draft invoice. Call this when you have: a project/show name, invoice date, and at least one line item. The user's profile details are used automatically.",
    inputSchema: createInvoiceDraftInput,
    execute: async ({
      showName,
      invoiceDate,
      clientId,
      clientName,
      clientAddress1,
      clientCity,
      clientPostalCode,
      clientCountry,
      attentionTo,
      items,
      extraItems,
      overtimeEntries,
      customExpenseEntries,
      notes,
    }) => {
      if (!profileComplete) {
        return {
          error:
            "User profile is incomplete. Please visit /profile to add your address and banking details before creating invoices.",
        };
      }

      let resolvedClient = null;
      if (clientId) {
        resolvedClient = await prisma.client.findFirst({
          where: { id: clientId, userId },
        });
        // Falling through with a bad id would silently price every standard
        // item at 0 rather than using the client's saved rates
        if (!resolvedClient) {
          return {
            error: `No saved client with id "${clientId}". Use an id from the saved client list, or omit clientId and pass the client's name and rates directly.`,
          };
        }
      }

      // The model reports the hours; the client's tiering decides the rates,
      // so a money calculation never lands in the model's head
      const tierRule = clientOvertimeRule(resolvedClient);
      const unpriced = (overtimeEntries ?? []).filter((e) => !e.rateType);
      if (unpriced.length && !tierRule) {
        return {
          error:
            "Overtime entries need a rateType (1.5x or 2x) because this client has no tiered overtime rule saved. Pass the rate the user asked for, or ask them which it is.",
        };
      }
      const resolvedOvertime = tierRule
        ? applyOvertimeTiers(overtimeEntries ?? [], tierRule)
        : (overtimeEntries ?? []).map((e) => ({
            ...e,
            rateType: e.rateType!,
          }));

      // Always include the 5 standard line items (matching the manual new-invoice form defaults).
      // AI-provided items override defaults where descriptions match; extras are appended.
      const dayRate = resolvedClient?.dayRate
        ? Number(resolvedClient.dayRate)
        : 0;
      const perDiemWorkRate = resolvedClient?.perDiemWork
        ? Number(resolvedClient.perDiemWork)
        : 0;
      const perDiemTravelRate = resolvedClient?.perDiemTravel
        ? Number(resolvedClient.perDiemTravel)
        : 0;

      // Derived from STANDARD_LINE_ITEMS so the Record stays exhaustive if
      // an item is ever added, and the descriptions keep their literal types
      const savedRates: Record<StandardLineItem, number> = {
        "Travel Days": dayRate,
        "Work Days": dayRate,
        "Dark days": dayRate,
        "Per Diems Travel Days": perDiemTravelRate,
        "Per Diems Work Days": perDiemWorkRate,
      };
      const DEFAULT_LINE_ITEMS = STANDARD_LINE_ITEMS.map((description) => ({
        description,
        unitPrice: savedRates[description],
      }));

      // items[].description is an enum, so descriptions match the defaults
      // exactly — no normalisation needed
      const aiItemMap = new Map(items.map((i) => [i.description, i]));

      const mergedItems = [
        ...DEFAULT_LINE_ITEMS.map((def) => {
          const ai = aiItemMap.get(def.description);
          return ai
            ? {
                description: def.description,
                quantity: ai.quantity,
                // Omitted price means "use the saved rate"; an explicit 0
                // is honoured, since an unpaid day is a real thing
                unitPrice: ai.unitPrice ?? def.unitPrice,
              }
            : {
                description: def.description,
                quantity: 0,
                unitPrice: def.unitPrice,
              };
        }),
        ...(extraItems ?? []),
      ];

      const lineItems = mergedItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        cost: i.quantity * i.unitPrice,
      }));

      // Must match calculateInvoiceTotals exactly — no client-rate fallback.
      // The PDF and detail page derive the rate from the line items alone,
      // so a fallback here would store a total the invoice never renders.
      const regularRate = deriveOvertimeHourlyRate(lineItems);

      // Writing the draft anyway would bill the overtime at £0 — the day
      // total still looks right, so nothing on screen reveals the shortfall
      if (overtimeEntries?.length && regularRate === 0) {
        return {
          error:
            "Cannot price overtime: no day rate is available. Overtime is charged at the Work Days rate ÷ 10 hours. Either pass a clientId whose saved day rate applies, or include a Work Days item with an explicit unitPrice. Ask the user for their day rate if you don't know it.",
        };
      }

      const invoiceNumber = await generateNextInvoiceNumber(userId);

      const overtimeTotal = resolvedOvertime.reduce(
        (s, e) => s + overtimeEntryCost(e, regularRate),
        0,
      );

      const expenseItems = (customExpenseEntries ?? []).map((e) => {
        let unitPrice = e.unitPrice;
        if (unitPrice <= 0 && /per diem/i.test(e.description)) {
          unitPrice = /travel/i.test(e.description)
            ? perDiemTravelRate
            : perDiemWorkRate;
        }
        return {
          description: e.description,
          quantity: e.quantity,
          unitPrice,
          cost: e.quantity * unitPrice,
        };
      });
      const expensesTotal = expenseItems.reduce((s, e) => s + e.cost, 0);

      const itemsTotal = lineItems.reduce((s, i) => s + i.cost, 0);
      const totalAmount = itemsTotal + overtimeTotal + expensesTotal;

      const invoice = await prisma.invoice.create({
        data: {
          userId,
          clientId: resolvedClient?.id ?? null,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          showName,
          fullName: user!.fullName ?? user!.name ?? "",
          email: email,
          addressLine1: user!.addressLine1!,
          addressLine2: user?.addressLine2 ?? undefined,
          city: user!.city!,
          state: user?.state ?? undefined,
          postalCode: user!.postalCode!,
          country: user!.country!,
          clientName: resolvedClient?.name ?? clientName ?? undefined,
          clientAddress1:
            resolvedClient?.addressLine1 ?? clientAddress1 ?? undefined,
          clientCity: resolvedClient?.city ?? clientCity ?? undefined,
          clientPostalCode:
            resolvedClient?.postalCode ?? clientPostalCode ?? undefined,
          clientCountry: resolvedClient?.country ?? clientCountry ?? undefined,
          attentionTo: resolvedClient?.attentionTo ?? attentionTo ?? undefined,
          iban: user!.iban!,
          swiftBic: user!.swiftBic!,
          accountNumber: user?.accountNumber ?? undefined,
          sortCode: user?.sortCode ?? undefined,
          bankAddress: user?.bankAddress ?? undefined,
          currency,
          regularHours: 0,
          overtimeHours: 0,
          perDiemDays: 0,
          travelDays: 0,
          regularRate: 0 as unknown as any,
          overtimeRate: 0 as unknown as any,
          perDiemRate: 0 as unknown as any,
          travelDayRate: 0 as unknown as any,
          subtotalLabor: totalAmount as unknown as any,
          subtotalPerDiem: 0 as unknown as any,
          subtotalTravel: 0 as unknown as any,
          totalAmount: totalAmount as unknown as any,
          status: "draft",
          notes: notes ?? undefined,
          items: {
            createMany: {
              data: lineItems.map((i) => ({
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice as unknown as any,
                cost: i.cost as unknown as any,
              })),
            },
          },
          overtimeEntries: {
            createMany: {
              data: resolvedOvertime.map((e) => ({
                date: new Date(e.date),
                hours: e.hours as unknown as any,
                rateType: e.rateType,
                description: e.description ?? undefined,
              })),
            },
          },
          customExpenseEntries: {
            createMany: {
              data: expenseItems.map((e) => ({
                description: e.description,
                quantity: e.quantity,
                unitPrice: e.unitPrice as unknown as any,
                cost: e.cost as unknown as any,
              })),
            },
          },
        },
        select: { id: true, invoiceNumber: true, totalAmount: true },
      });

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: `${sym}${Number(invoice.totalAmount).toFixed(2)}`,
      };
    },
  }),

  updateInvoiceDraft: tool({
    description:
      "Update an existing draft invoice with corrected or additional information.",
    inputSchema: updateInvoiceDraftInput,
    execute: async ({
      invoiceId,
      showName,
      invoiceDate,
      clientName,
      items,
      extraItems,
      overtimeEntries,
      customExpenseEntries,
      notes,
    }) => {
      const existing = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
        select: { id: true, totalAmount: true, client: true },
      });

      if (!existing) {
        return { error: "Invoice not found or does not belong to you." };
      }

      // Same deal as createInvoiceDraft: unpriced entries are the client's
      // tier rule to resolve, not the model's
      const tierRule = clientOvertimeRule(existing.client);
      const unpriced = (overtimeEntries ?? []).filter((e) => !e.rateType);
      if (unpriced.length && !tierRule) {
        return {
          error:
            "Overtime entries need a rateType (1.5x or 2x) because this invoice's client has no tiered overtime rule saved. Pass the rate the user asked for, or ask them which it is.",
        };
      }
      const resolvedOvertime = overtimeEntries
        ? tierRule
          ? applyOvertimeTiers(overtimeEntries, tierRule)
          : overtimeEntries.map((e) => ({ ...e, rateType: e.rateType! }))
        : undefined;

      const needsTotalRecalc = !!(
        items ||
        extraItems ||
        overtimeEntries ||
        customExpenseEntries
      );

      // Standard rows and extras are replaced independently: whichever the
      // model didn't send is left exactly as it was. Rewriting extras only
      // alongside `items` silently dropped fees off invoices that were billing
      // them, and `extraItems` on its own did nothing at all while reporting
      // success.
      if (items || extraItems) {
        // Fetch existing items to preserve client rates for defaults
        const existingItems = await prisma.invoiceLineItem.findMany({
          where: { invoiceId },
        });
        const existingWorkDays = existingItems.find(
          (i) => i.description === "Work Days",
        );
        const existingTravelDays = existingItems.find(
          (i) => i.description === "Travel Days",
        );
        const existingPerDiemWork = existingItems.find(
          (i) => i.description === "Per Diems Work Days",
        );
        const existingPerDiemTravel = existingItems.find(
          (i) => i.description === "Per Diems Travel Days",
        );

        const workDayRate = existingWorkDays
          ? Number(existingWorkDays.unitPrice)
          : 0;
        const existingRates: Record<StandardLineItem, number> = {
          "Travel Days": existingTravelDays
            ? Number(existingTravelDays.unitPrice)
            : workDayRate,
          "Work Days": workDayRate,
          "Dark days": workDayRate,
          "Per Diems Travel Days": existingPerDiemTravel
            ? Number(existingPerDiemTravel.unitPrice)
            : 0,
          "Per Diems Work Days": existingPerDiemWork
            ? Number(existingPerDiemWork.unitPrice)
            : 0,
        };
        const DEFAULT_LINE_ITEMS = STANDARD_LINE_ITEMS.map((description) => ({
          description,
          unitPrice: existingRates[description],
        }));

        const aiItemMap = new Map((items ?? []).map((i) => [i.description, i]));

        // Only rebuild the five standard rows when the model sent items; a
        // fee-only edit must not reset the day counts
        const standardRows = items
          ? DEFAULT_LINE_ITEMS.map((def) => {
              const ai = aiItemMap.get(def.description);
              return ai
                ? {
                    description: def.description,
                    quantity: ai.quantity,
                    // Omitted price keeps whatever the invoice already had
                    unitPrice: ai.unitPrice ?? def.unitPrice,
                  }
                : {
                    description: def.description,
                    quantity: 0,
                    unitPrice: def.unitPrice,
                  };
            })
          : existingItems
              .filter((i) => isStandardLineItem(i.description))
              .map((i) => ({
                description: i.description,
                quantity: Number(i.quantity),
                unitPrice: Number(i.unitPrice),
              }));

        // Likewise: extras are replaced only when the model sent extras
        const extraRows =
          extraItems ??
          existingItems
            .filter((i) => !isStandardLineItem(i.description))
            .map((i) => ({
              description: i.description,
              quantity: Number(i.quantity),
              unitPrice: Number(i.unitPrice),
            }));

        const mergedItems = [...standardRows, ...extraRows];

        const lineItems = mergedItems.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          cost: i.quantity * i.unitPrice,
        }));

        // An update that drops or unprices Work Days would re-zero overtime
        // on an invoice that was previously billing it correctly
        const updatedRate = deriveOvertimeHourlyRate(lineItems);
        const keepsOvertime =
          overtimeEntries?.length ??
          (await prisma.overtimeEntry.count({ where: { invoiceId } }));
        if (keepsOvertime && updatedRate === 0) {
          return {
            error:
              "This update would leave the invoice's overtime priced at £0, because it removes the Work Days rate that overtime is derived from. Include a Work Days item with an explicit unitPrice, or remove the overtime entries.",
          };
        }

        await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });
        await prisma.invoiceLineItem.createMany({
          data: lineItems.map((i) => ({
            invoiceId,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice as unknown as any,
            cost: i.cost as unknown as any,
          })),
        });
      }

      if (resolvedOvertime) {
        await prisma.overtimeEntry.deleteMany({ where: { invoiceId } });
        await prisma.overtimeEntry.createMany({
          data: resolvedOvertime.map((e) => ({
            invoiceId,
            date: new Date(e.date),
            hours: e.hours as unknown as any,
            rateType: e.rateType,
            description: e.description ?? undefined,
          })),
        });
      }

      if (customExpenseEntries) {
        await prisma.customExpenseEntry.deleteMany({
          where: { invoiceId },
        });
        await prisma.customExpenseEntry.createMany({
          data: customExpenseEntries.map((e) => ({
            invoiceId,
            description: e.description,
            quantity: e.quantity,
            unitPrice: e.unitPrice as unknown as any,
            cost: (e.quantity * e.unitPrice) as unknown as any,
          })),
        });
      }

      let totalAmount = Number(existing.totalAmount);
      if (needsTotalRecalc) {
        const current = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            items: true,
            overtimeEntries: true,
            customExpenseEntries: true,
          },
        });
        const regularRate = deriveOvertimeHourlyRate(
          current!.items.map((i) => ({
            description: i.description,
            unitPrice: Number(i.unitPrice),
          })),
        );
        const currentItemsTotal = current!.items.reduce(
          (s, i) => s + Number(i.cost),
          0,
        );
        const currentOvertimeTotal = current!.overtimeEntries.reduce(
          (s, e) =>
            s +
            overtimeEntryCost(
              { hours: Number(e.hours), rateType: e.rateType },
              regularRate,
            ),
          0,
        );
        const currentExpensesTotal = current!.customExpenseEntries.reduce(
          (s, e) => s + Number(e.cost),
          0,
        );
        totalAmount =
          currentItemsTotal + currentOvertimeTotal + currentExpensesTotal;
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          ...(showName && { showName }),
          ...(invoiceDate && { invoiceDate: new Date(invoiceDate) }),
          ...(clientName && { clientName }),
          ...(notes !== undefined && { notes }),
          ...(needsTotalRecalc && {
            totalAmount: totalAmount as unknown as any,
            subtotalLabor: totalAmount as unknown as any,
          }),
        },
      });

      return {
        success: true,
        invoiceId,
        total: `${sym}${totalAmount.toFixed(2)}`,
      };
    },
  }),
});
