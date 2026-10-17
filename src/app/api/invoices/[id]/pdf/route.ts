import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseStoredTerms } from "@/lib/day-invoice";
import { prisma } from "@/lib/db";
import {
  generateInvoicePdf,
  type InvoicePdfInput,
  PDF_TEMPLATES,
  type PdfTemplate,
} from "@/lib/pdf";
import { parseDate } from "@/lib/utils";

export const GET = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const requested = searchParams.get("template");
  const template: PdfTemplate = PDF_TEMPLATES.includes(requested as PdfTemplate)
    ? (requested as PdfTemplate)
    : "caley";
  const invoice = await prisma.invoice.findFirst({
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

  // Transform database data to PDF input format
  const pdfInput: InvoicePdfInput = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: parseDate(invoice.invoiceDate.toISOString().slice(0, 10)),
    showName: invoice.showName,
    fullName: invoice.fullName,
    email: invoice.email,
    addressLine1: invoice.addressLine1,
    addressLine2: invoice.addressLine2 || undefined,
    city: invoice.city,
    state: invoice.state || undefined,
    postalCode: invoice.postalCode,
    country: invoice.country,
    clientName: invoice.clientName || undefined,
    clientAddress1: invoice.clientAddress1 || undefined,
    clientAddress2: invoice.clientAddress2 || undefined,
    clientCity: invoice.clientCity || undefined,
    clientState: invoice.clientState || undefined,
    clientPostalCode: invoice.clientPostalCode || undefined,
    clientCountry: invoice.clientCountry || undefined,
    attentionTo: invoice.attentionTo || undefined,
    iban: invoice.iban,
    swiftBic: invoice.swiftBic,
    accountNumber: invoice.accountNumber || undefined,
    sortCode: invoice.sortCode || undefined,
    bankAddress: invoice.bankAddress || undefined,
    dateOfBirth: invoice.dateOfBirth || undefined,
    currency: invoice.currency,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      cost: Number(item.cost),
    })),
    overtimeEntries: invoice.overtimeEntries.map((entry) => ({
      id: entry.id,
      date: parseDate(entry.date.toISOString().slice(0, 10)),
      hours: Number(entry.hours),
      rateType: entry.rateType as "1.5x" | "2x",
      description: entry.description || undefined,
    })),
    customExpenseEntries: invoice.customExpenseEntries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      quantity: Number(entry.quantity),
      unitPrice: Number(entry.unitPrice),
      cost: Number(entry.cost),
    })),
    notes: invoice.notes || undefined,
    terms: parseStoredTerms(invoice.terms),
    days: invoice.days.map((day) => ({
      date: day.date.toISOString().slice(0, 10),
      type: day.type as "work" | "travel" | "dark",
      alsoTravel: day.alsoTravel as "out" | "home" | null,
      direction: day.direction as "out" | "home" | null,
      overtimeHours:
        day.overtimeHours == null ? null : Number(day.overtimeHours),
    })),
  };

  // Generate PDF on-demand with selected template
  const pdfBytes = await generateInvoicePdf(pdfInput, template);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")} ${invoice.showName} ${invoice.fullName} ${
        invoice.invoiceNumber
      }.pdf"`,
    },
  });
};
