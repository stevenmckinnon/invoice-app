import { NextRequest } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { generateInvoicePdf, type InvoicePdfInput } from "@/lib/pdf";

const prisma = new PrismaClient();

export const GET = async (
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      overtimeEntries: true,
      customExpenseEntries: true,
    },
  });

  if (!invoice) {
    return new Response("Not found", { status: 404 });
  }

  // Transform database data to PDF input format
  const pdfInput: InvoicePdfInput = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: new Date(invoice.invoiceDate),
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
      date: new Date(entry.date),
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
  };

  // Generate PDF on-demand
  const pdfBytes = await generateInvoicePdf(pdfInput);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${
        invoice.invoiceDate instanceof Date
          ? invoice.invoiceDate.toISOString().slice(0, 10).replace(/-/g, "")
          : new Date(invoice.invoiceDate)
              .toISOString()
              .slice(0, 10)
              .replace(/-/g, "")
      } ${invoice.showName} ${invoice.fullName} ${invoice.invoiceNumber}.pdf"`,
    },
  });
};
