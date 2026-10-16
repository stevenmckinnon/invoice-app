import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { termsFromClient } from "@/lib/billing";
import {
  clientTermsSelect,
  dayBillingWrites,
  invoiceDaysSchema,
  parseStoredTerms,
} from "@/lib/day-invoice";
import { prisma } from "@/lib/db";
import {
  duplicateInvoiceNumberMessage,
  isDuplicateInvoiceNumberError,
} from "@/lib/invoice-number";
import { calculateInvoiceTotals, type InvoicePdfInput } from "@/lib/pdf";
import { parseDate } from "@/lib/utils";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
});

const overtimeEntrySchema = z.object({
  id: z.string(),
  date: z.string().transform((s) => new Date(s)),
  hours: z.number().positive(),
  rateType: z.enum(["1.5x", "2x"]),
});

const customExpenseEntrySchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

const invoiceUpdateSchema = z
  .object({
    invoiceNumber: z.string().min(1),
    invoiceDate: z.string().transform((s) => new Date(s)),
    showName: z.string().min(1),

    fullName: z.string().min(1),
    email: z.email(),
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().min(1),

    clientId: z.string().optional(),
    clientName: z.string().optional(),
    clientAddress1: z.string().optional(),
    clientAddress2: z.string().optional(),
    clientCity: z.string().optional(),
    clientState: z.string().optional(),
    clientPostalCode: z.string().optional(),
    clientCountry: z.string().optional(),
    attentionTo: z.string().optional(),

    iban: z.string().min(1),
    swiftBic: z.string().min(1),
    accountNumber: z.string().optional(),
    sortCode: z.string().optional(),
    bankAddress: z.string().optional(),
    dateOfBirth: z.string().optional(),
    currency: z.string().optional(),

    // As on create: count-based invoices send items and overtime, day-based
    // invoices send `days` and the server prices them
    items: z.array(lineItemSchema).optional(),
    overtimeEntries: z.array(overtimeEntrySchema).default([]),
    days: invoiceDaysSchema.optional(),
    customExpenseEntries: z.array(customExpenseEntrySchema),
    status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.days || v.items?.length, {
    message: "Send the invoice's days, or at least one line item.",
  });

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const PUT = async (req: NextRequest, context: RouteContext) => {
  // Kept outside the try so a duplicate-number failure can name it
  let invoiceNumber = "";
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const json = await req.json();
    const parsed = invoiceUpdateSchema.parse(json);
    invoiceNumber = parsed.invoiceNumber;

    const pdfInput: InvoicePdfInput = {
      ...parsed,
      invoiceDate: parseDate(parsed.invoiceDate),
    } as any;

    // Verify ownership before touching anything — the child rows are keyed
    // only by invoiceId, so deleting first wiped other users' line items
    const existing = await prisma.invoice.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, clientId: true, terms: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // A clientId from another user would link their client to this invoice
    const client = parsed.clientId
      ? await prisma.client.findFirst({
          where: { id: parsed.clientId, userId: session.user.id },
          select: clientTermsSelect,
        })
      : null;
    if (parsed.clientId && !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 400 });
    }

    // An invoice is either built from days (it has stored terms) or from
    // typed counts (it doesn't), for life. Old count invoices are never
    // converted, and a day invoice's lines only ever come from its days.
    const storedTerms = parseStoredTerms(existing.terms);
    if (parsed.days && !storedTerms) {
      return NextResponse.json(
        {
          error:
            "This invoice was made before days were recorded, so its billing can't be changed. Issue a corrected invoice instead.",
        },
        { status: 400 },
      );
    }
    if (!parsed.days && storedTerms) {
      return NextResponse.json(
        {
          error:
            "This invoice is built from days. Send its days, not line items.",
        },
        { status: 400 },
      );
    }

    let dayBilling: ReturnType<typeof dayBillingWrites> | null = null;
    if (parsed.days && storedTerms) {
      // Keep the terms it was priced under; only switching client re-prices
      let terms = storedTerms;
      if (client && parsed.clientId !== existing.clientId) {
        const clientTerms = termsFromClient(client);
        if (!clientTerms) {
          return NextResponse.json(
            {
              error:
                "This client has no day rate yet. Add one to the client first.",
            },
            { status: 400 },
          );
        }
        terms = clientTerms;
      }
      dayBilling = dayBillingWrites(
        parsed.days,
        terms,
        parsed.customExpenseEntries,
      );
    }

    const totals = dayBilling ? null : calculateInvoiceTotals(pdfInput);

    // Replace the related records and update the invoice atomically, so a
    // failed update can't leave the invoice with its children deleted
    const [, , , , updated] = await prisma.$transaction([
      prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }),
      prisma.overtimeEntry.deleteMany({ where: { invoiceId: id } }),
      prisma.customExpenseEntry.deleteMany({ where: { invoiceId: id } }),
      prisma.invoiceDay.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id, userId: session.user.id },
        data: {
          invoiceNumber: pdfInput.invoiceNumber,
          invoiceDate: pdfInput.invoiceDate,
          showName: pdfInput.showName,
          fullName: pdfInput.fullName,
          email: pdfInput.email,
          addressLine1: pdfInput.addressLine1,
          addressLine2: pdfInput.addressLine2,
          city: pdfInput.city,
          state: pdfInput.state,
          postalCode: pdfInput.postalCode,
          country: pdfInput.country,
          clientId: parsed.clientId,
          clientName: pdfInput.clientName,
          clientAddress1: pdfInput.clientAddress1,
          clientAddress2: pdfInput.clientAddress2,
          clientCity: pdfInput.clientCity,
          clientState: pdfInput.clientState,
          clientPostalCode: pdfInput.clientPostalCode,
          clientCountry: pdfInput.clientCountry,
          attentionTo: pdfInput.attentionTo,
          iban: pdfInput.iban,
          swiftBic: pdfInput.swiftBic,
          accountNumber: pdfInput.accountNumber,
          sortCode: pdfInput.sortCode,
          bankAddress: pdfInput.bankAddress,
          dateOfBirth: pdfInput.dateOfBirth
            ? parseDate(pdfInput.dateOfBirth as any)
            : null,
          currency: pdfInput.currency ?? "GBP",
          status: parsed.status || "draft",
          notes: pdfInput.notes,
          ...(dayBilling ?? {
            totalAmount: totals!.totalAmount as unknown as any,
            items: {
              createMany: {
                data: parsed.items!.map((i) => ({
                  description: i.description,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice as unknown as any,
                  cost: (i.cost ?? i.quantity * i.unitPrice) as unknown as any,
                })),
              },
            },
            overtimeEntries: {
              createMany: {
                data: parsed.overtimeEntries.map((entry) => ({
                  date: parseDate(entry.date),
                  hours: entry.hours as unknown as any,
                  rateType: entry.rateType,
                })),
              },
            },
            customExpenseEntries: {
              createMany: {
                data: parsed.customExpenseEntries.map((entry) => ({
                  description: entry.description,
                  quantity: entry.quantity,
                  unitPrice: entry.unitPrice as unknown as any,
                  cost: entry.cost as unknown as any,
                })),
              },
            },
          }),
        },
        select: { id: true, invoiceNumber: true },
      }),
    ]);

    return NextResponse.json(
      { id: updated.id, invoiceNumber: updated.invoiceNumber },
      { status: 200 },
    );
  } catch (err: any) {
    if (isDuplicateInvoiceNumberError(err)) {
      return NextResponse.json(
        { error: duplicateInvoiceNumberMessage(invoiceNumber) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: err.message ?? "Failed to update invoice" },
      { status: 400 },
    );
  }
};

export const DELETE = async (req: NextRequest, context: RouteContext) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    // Verify ownership
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to delete invoice" },
      { status: 400 },
    );
  }
};

export const GET = async (req: NextRequest, context: RouteContext) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id, userId: session.user.id },
      include: {
        items: true,
        overtimeEntries: true,
        customExpenseEntries: true,
        days: { orderBy: { date: "asc" } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (err: any) {
    console.error("Error fetching invoice:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch invoice" },
      { status: 400 },
    );
  }
};

export const PATCH = async (req: NextRequest, context: RouteContext) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    // Unvalidated, any string was written straight into status
    const parsed = statusUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Verify ownership
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update only the status
    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update invoice status" },
      { status: 400 },
    );
  }
};
