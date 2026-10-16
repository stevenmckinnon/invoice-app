import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Generates the next invoice number for a specific user by continuing their own
 * most recent invoice's numbering — preserving whatever prefix and zero-padding
 * they already use (e.g. `INV-2026-014` → `INV-2026-015`, `INV-2601` → `INV-2602`).
 *
 * Scoping to the user matters: a freelancer's sequence should reflect the invoices
 * they've raised, not a global counter shared across every account.
 *
 * `invoiceNumber` is unique per user, so the candidate is checked against the
 * user's own invoices and bumped until it's free. Other accounts' numbers are
 * never consulted: they don't conflict, and skipping them would leak that they
 * exist.
 */
export const generateNextInvoiceNumber = async (
  userId: string,
): Promise<string> => {
  const latest = await prisma.invoice.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  const yearSuffix = new Date().getFullYear().toString().slice(-2);

  // Defaults for a user's very first invoice: INV-2601, INV-2602, ...
  let prefix = `INV-${yearSuffix}`;
  let width = 2;
  let suffix = "";
  let start = 1;

  if (latest?.invoiceNumber) {
    // Split into leading text, the trailing number group, and any suffix
    const match = latest.invoiceNumber.match(/^(.*?)(\d+)(\D*)$/);
    if (match) {
      const [, matchedPrefix, digits, matchedSuffix] = match;
      prefix = matchedPrefix;
      width = digits.length;
      suffix = matchedSuffix;
      start = parseInt(digits, 10) + 1;
    }
  }

  const build = (n: number) =>
    `${prefix}${n.toString().padStart(width, "0")}${suffix}`;

  // Skip past any number this user has already used
  let n = start;
  for (let i = 0; i < 1000; i++, n++) {
    const candidate = build(n);
    const exists = await prisma.invoice.findUnique({
      where: { userId_invoiceNumber: { userId, invoiceNumber: candidate } },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return build(start);
};

/**
 * Whether a write failed because the user already has an invoice with this
 * number (the `[userId, invoiceNumber]` unique index), as opposed to any other
 * unique constraint the same write might touch.
 */
export const isDuplicateInvoiceNumberError = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === "P2002" &&
  JSON.stringify(err.meta ?? {}).includes("invoiceNumber");

export const duplicateInvoiceNumberMessage = (invoiceNumber: string) =>
  `You already have an invoice numbered ${invoiceNumber}.`;
