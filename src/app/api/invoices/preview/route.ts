import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { BillingError, billDays, termsFromClient } from "@/lib/billing";
import {
  clientTermsSelect,
  invoiceDaysSchema,
  parseStoredTerms,
} from "@/lib/day-invoice";
import { prisma } from "@/lib/db";

const previewSchema = z.object({
  clientId: z.string().min(1),
  // An existing invoice keeps the terms it was priced under unless its client
  // changes, exactly as PUT /api/invoices/[id] decides
  invoiceId: z.string().min(1).optional(),
  days: invoiceDaysSchema,
  expenses: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .max(100)
    .default([]),
});

/**
 * Prices a set of days without saving anything, so clients that can't (or
 * shouldn't) re-implement `billDays` — the iOS editor — still show the same
 * total the save will store.
 */
export const POST = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = previewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { clientId, invoiceId, days, expenses } = parsed.data;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: clientTermsSelect,
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }

  const existing = invoiceId
    ? await prisma.invoice.findFirst({
        where: { id: invoiceId, userId: session.user.id },
        select: { clientId: true, terms: true },
      })
    : null;

  let terms;
  try {
    terms =
      existing?.clientId === clientId && existing.terms
        ? parseStoredTerms(existing.terms)
        : termsFromClient(client);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
  if (!terms) {
    return NextResponse.json(
      { error: "This client has no day rate yet. Add one to the client first." },
      { status: 400 },
    );
  }

  try {
    const bill = billDays({ days, terms, expenses });
    return NextResponse.json({ ...bill, terms });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
};
