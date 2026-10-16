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
import { parseDate } from "@/lib/utils";

const customExpenseEntrySchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

const invoiceUpdateSchema = z.object({
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

  // The server prices the days from the client's terms
  days: invoiceDaysSchema,
  customExpenseEntries: z.array(customExpenseEntrySchema),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  notes: z.string().optional(),
});

// What still changes on any invoice, including one whose billing is locked
const invoicePatchSchema = z
  .object({
    status: z.enum(["draft", "sent", "paid", "overdue"]),
    notes: z.string().max(5000).nullable(),
  })
  .partial()
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: "Nothing to update",
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

    const pdfInput = {
      ...parsed,
      invoiceDate: parseDate(parsed.invoiceDate),
    };

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

    // Invoices made before days were recorded are never converted, and
    // their billing is locked: a mistake is fixed with a corrected invoice.
    // Their status and notes still change, through PATCH.
    const storedTerms = parseStoredTerms(existing.terms);
    if (!storedTerms) {
      return NextResponse.json(
        {
          error:
            "This invoice was made before days were recorded, so its billing can't be changed. Issue a corrected invoice instead.",
        },
        { status: 400 },
      );
    }

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
    const dayBilling = dayBillingWrites(
      parsed.days,
      terms,
      parsed.customExpenseEntries,
    );

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
          ...dayBilling,
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
    const parsed = invoicePatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }

    // Verify ownership
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice || invoice.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the status and notes; billing goes through PUT
    const { status, notes } = parsed.data;
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        // An emptied note clears it rather than storing whitespace
        notes: notes === undefined ? undefined : notes?.trim() || null,
      },
      select: { id: true, status: true, notes: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 400 },
    );
  }
};
