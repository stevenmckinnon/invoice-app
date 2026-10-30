import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildInvoiceCsv,
  exportFilename,
  fyBounds,
} from "@/lib/invoice-export";
import { summariseInvoice } from "@/lib/invoice-summary";
import { getFyStart } from "@/lib/tax-year";

/**
 * `GET /api/invoices/export?year=2026` is tax year 2026/27 (6 April 2026 to
 * 5 April 2027); without `year`, the current one. A CSV of every invoice that
 * has gone out (drafts aren't invoices yet), for an accountant or a
 * spreadsheet. Works with a cookie or the app's bearer token.
 */
export const GET = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = new URL(req.url).searchParams.get("year");
  const fyStart = requested === null ? getFyStart(new Date()) : Number(requested);
  if (!Number.isInteger(fyStart) || fyStart < 2000 || fyStart > 2100) {
    return NextResponse.json(
      { error: "year must be the year a tax year starts in, e.g. 2026" },
      { status: 400 },
    );
  }

  const { from, to } = fyBounds(fyStart);
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: session.user.id,
      invoiceDate: { gte: from, lt: to },
      status: { not: "draft" },
    },
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      clientName: true,
      showName: true,
      status: true,
      currency: true,
      totalAmount: true,
      items: true,
      overtimeEntries: true,
      customExpenseEntries: true,
    },
  });

  const line = (l: {
    description?: string;
    quantity: unknown;
    unitPrice: unknown;
    cost: unknown;
  }) => ({
    description: l.description ?? "",
    quantity: Number(l.quantity),
    unitPrice: Number(l.unitPrice),
    cost: Number(l.cost),
  });
  const sum = (lines: Array<{ amount: number }>) =>
    lines.reduce((n, l) => n + l.amount, 0);

  const csv = buildInvoiceCsv(
    invoices.map((i) => {
      const summary = summariseInvoice({
        items: i.items.map(line),
        overtimeEntries: i.overtimeEntries.map((o) => ({
          date: o.date,
          hours: Number(o.hours),
          rateType: o.rateType,
        })),
        customExpenseEntries: i.customExpenseEntries.map(line),
      });
      return {
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate,
        clientName: i.clientName,
        showName: i.showName,
        status: i.status,
        currency: i.currency,
        labour: sum(summary.labour),
        perDiems: sum(summary.perDiems),
        expenses: sum(summary.expenses) + sum(summary.other),
        totalAmount: Number(i.totalAmount),
      };
    }),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(fyStart)}"`,
      "Cache-Control": "private, no-store",
    },
  });
};
