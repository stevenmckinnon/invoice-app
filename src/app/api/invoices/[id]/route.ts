/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { z } from "zod";
import {
  calculateInvoiceTotals,
  type InvoicePdfInput,
} from "@/lib/pdf";
import { auth } from "@/auth";

const prisma = new PrismaClient();

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

  items: z.array(lineItemSchema).min(1),
  overtimeEntries: z.array(overtimeEntrySchema),
  customExpenseEntries: z.array(customExpenseEntrySchema),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  notes: z.string().optional(),
});

type RouteContext = {
  params: { id: string };
};

export const PUT = async (req: NextRequest, context: RouteContext) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;
    const json = await req.json();
    const parsed = invoiceUpdateSchema.parse(json);

    const pdfInput: InvoicePdfInput = {
      ...parsed,
      invoiceDate: new Date(parsed.invoiceDate),
    } as any;

    const totals = calculateInvoiceTotals(pdfInput);

    // Delete existing related records
    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
    await prisma.overtimeEntry.deleteMany({ where: { invoiceId: id } });
    await prisma.customExpenseEntry.deleteMany({ where: { invoiceId: id } });

    // Verify ownership
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.invoice.update({
      where: { id },
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
          ? new Date(pdfInput.dateOfBirth as any)
          : null,
        currency: pdfInput.currency ?? "GBP",
        totalAmount: totals.totalAmount as unknown as any,
        status: parsed.status || "draft",
        notes: pdfInput.notes,
        items: {
          createMany: {
            data: parsed.items.map((i) => ({
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
              date: entry.date,
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
      },
      select: { id: true, invoiceNumber: true },
    });

    return NextResponse.json(
      { id: updated.id, invoiceNumber: updated.invoiceNumber },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to update invoice" },
      { status: 400 }
    );
  }
};

export const DELETE = async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

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
      { status: 400 }
    );
  }
};

export const GET = async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id, userId: session.user.id },
      include: {
        items: true,
        overtimeEntries: true,
        customExpenseEntries: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch invoice" },
      { status: 400 }
    );
  }
};

