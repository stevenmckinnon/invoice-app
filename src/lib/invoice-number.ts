import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

/**
 * Generates the next invoice number in the format INV-YYXX
 * where YY is the last 2 digits of the year and XX is the consecutive number
 * Example: INV-2501, INV-2502, ..., INV-2601 (next year)
 */
export const generateNextInvoiceNumber = async (): Promise<string> => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits (e.g., "25" for 2025)

  // Get all invoices for the current year
  const yearPrefix = `INV-${yearSuffix}`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: yearPrefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  if (!lastInvoice) {
    // First invoice of the year
    return `${yearPrefix}01`;
  }

  // Extract the number part and increment
  const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-")[1].slice(2));
  const nextNumber = lastNumber + 1;

  // Format with leading zeros (e.g., 01, 02, ..., 99)
  const formattedNumber = nextNumber.toString().padStart(2, "0");

  return `INV-${yearSuffix}${formattedNumber}`;
};

