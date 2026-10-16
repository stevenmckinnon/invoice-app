import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { termsFromClient } from "@/lib/billing";
import {
  clientTermsSelect,
  dayBillingWrites,
  invoiceDaysSchema,
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
    const terms = termsFromClient(client);
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

    const created = await prisma.invoice.create({
      data: {
        userId: session.user.id,
        clientId: parsed.clientId,
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
        status: parsed.status || "draft",
        notes: pdfInput.notes,
        ...dayBilling,
      },
      select: { id: true, invoiceNumber: true },
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

  const { count } = await prisma.invoice.updateMany({
    where: { id: { in: parsed.data.ids }, userId: session.user.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ count });
};
