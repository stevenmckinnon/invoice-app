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
  canCorrectInvoice,
  statusesThatCanBecome,
} from "@/lib/invoice-lifecycle";
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

const invoiceInputSchema = z.object({
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
  // The issued invoice this one replaces; creating it voids the original
  correctsId: z.string().min(1).optional(),
});

export const POST = async (req: NextRequest) => {
  // Kept outside the try so a duplicate-number failure can name it
  let invoiceNumber = "";
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = invoiceInputSchema.parse(json);
    invoiceNumber = parsed.invoiceNumber;

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

    // Days are priced at the client's rates, so they need a client with a
    // day rate; the terms are copied onto the invoice as it's created
    if (!client) {
      return NextResponse.json(
        { error: "Pick a client: days are billed at the client's rates." },
        { status: 400 },
      );
    }

    const original = parsed.correctsId
      ? await prisma.invoice.findFirst({
          where: { id: parsed.correctsId, userId: session.user.id },
          select: {
            id: true,
            status: true,
            clientId: true,
            terms: true,
            corrections: {
              where: { status: { not: "void" } },
              select: { invoiceNumber: true },
              take: 1,
            },
          },
        })
      : null;
    if (parsed.correctsId && !original) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (original && !canCorrectInvoice(original.status)) {
      return NextResponse.json(
        { error: "A draft hasn't gone out yet, so just edit it." },
        { status: 409 },
      );
    }
    if (original?.corrections[0]) {
      return NextResponse.json(
        {
          error: `This invoice has already been replaced by ${original.corrections[0].invoiceNumber}.`,
        },
        { status: 409 },
      );
    }

    // A correction bills at the rates of the invoice it replaces, so raising
    // a client's rate since then can't change what the mistake costs them
    const terms =
      (original?.clientId === parsed.clientId
        ? parseStoredTerms(original?.terms)
        : null) ?? termsFromClient(client);
    if (!terms) {
      return NextResponse.json(
        {
          error:
            "This client has no day rate yet. Add one to the client first.",
        },
        { status: 400 },
      );
    }
    const dayBilling = dayBillingWrites(
      parsed.days,
      terms,
      parsed.customExpenseEntries,
    );

    const pdfInput = {
      ...parsed,
      invoiceDate: parseDate(parsed.invoiceDate),
    };

    // One transaction: the original can't be voided without its replacement
    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
      data: {
        userId: session.user.id,
        clientId: parsed.clientId,
        correctsId: original?.id,
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
        // legacy numeric fields required by schema
        regularHours: 0,
        overtimeHours: 0,
        perDiemDays: 0,
        travelDays: 0,
        regularRate: 0 as unknown as any,
        overtimeRate: 0 as unknown as any,
        perDiemRate: 0 as unknown as any,
        travelDayRate: 0 as unknown as any,
        accountNumber: pdfInput.accountNumber,
        sortCode: pdfInput.sortCode,
        bankAddress: pdfInput.bankAddress,
        dateOfBirth: pdfInput.dateOfBirth
          ? parseDate(pdfInput.dateOfBirth as any)
          : null,
        currency: pdfInput.currency ?? "GBP",
        status: original ? "draft" : parsed.status || "draft",
        notes: pdfInput.notes,
        ...dayBilling,
      },
      select: { id: true, invoiceNumber: true },
      });
      if (original) {
        await tx.invoice.update({
          where: { id: original.id },
          data: { status: "void" },
        });
      }
      return invoice;
    });

    return NextResponse.json(
      { id: created.id, invoiceNumber: created.invoiceNumber },
      { status: 201 },
    );
  } catch (err: any) {
    if (isDuplicateInvoiceNumberError(err)) {
      return NextResponse.json(
        { error: duplicateInvoiceNumberMessage(invoiceNumber) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: err.message ?? "Unexpected error" },
      { status: 400 },
    );
  }
};

export const GET = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.invoice.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      showName: true,
      clientName: true,
      totalAmount: true,
      currency: true,
      status: true,
      paidAt: true,
      createdAt: true,
      fullName: true,
    },
  });
  return NextResponse.json(items);
};

const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

/**
 * Set the status of several invoices at once (the list's "Mark as paid").
 * One query, scoped to the session user, so ids belonging to someone else
 * are simply not matched rather than needing a check per invoice.
 */
export const PATCH = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bulkStatusSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // An invoice that can't make this change is left as it is, and isn't counted.
  // Nor is one already at the status: marking a paid invoice paid again would
  // otherwise move its paid date to today.
  const { status } = parsed.data;
  const { count } = await prisma.invoice.updateMany({
    where: {
      id: { in: parsed.data.ids },
      userId: session.user.id,
      status: {
        in: statusesThatCanBecome(status).filter((from) => from !== status),
      },
    },
    // Every row that moves takes the same paid date: stamped on becoming
    // paid, cleared on leaving it (void never appears here)
    data: { status, paidAt: status === "paid" ? new Date() : null },
  });

  return NextResponse.json({ count });
};
