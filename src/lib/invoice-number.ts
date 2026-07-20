import { prisma } from "@/lib/db";

/**
 * Generates the next invoice number for a specific user by continuing their own
 * most recent invoice's numbering — preserving whatever prefix and zero-padding
 * they already use (e.g. `INV-2026-014` → `INV-2026-015`, `INV-2601` → `INV-2602`).
 *
 * Scoping to the user matters: a freelancer's sequence should reflect the invoices
 * they've raised, not a global counter shared across every account.
 *
 * `invoiceNumber` is globally unique in the schema, so the candidate is checked and
 * bumped until it's free to avoid a unique-constraint failure on creation.
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

  // Skip past any number already taken (globally unique constraint)
  let n = start;
  for (let i = 0; i < 1000; i++, n++) {
    const candidate = build(n);
    const exists = await prisma.invoice.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  return build(start);
};
