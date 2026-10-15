import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildInvoiceTools } from "@/lib/invoice-tools";
import { clientOvertimeRule } from "@/lib/overtime";
import { formatCurrency } from "@/lib/utils";

export const POST = async (req: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const userId = session.user.id;

  const [user, clients, invoices, totalsByStatus] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        name: true,
        email: true,
        currency: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        iban: true,
        swiftBic: true,
        accountNumber: true,
        sortCode: true,
        bankAddress: true,
      },
    }),
    prisma.client.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        attentionTo: true,
        dayRate: true,
        perDiemWork: true,
        perDiemTravel: true,
        overtimeTierHours: true,
        overtimeFirstRate: true,
        overtimeAfterRate: true,
      },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: {
        invoiceNumber: true,
        showName: true,
        clientName: true,
        totalAmount: true,
        currency: true,
        status: true,
        invoiceDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Totals come from the database, not from the recent list above —
    // summing a capped list reported "total revenue" for only the latest
    // invoices once a user had more than the cap.
    prisma.invoice.groupBy({
      by: ["currency", "status"],
      where: { userId },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const currency = user?.currency ?? "GBP";
  const sym =
    currency === "GBP"
      ? "£"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "€"
          : currency;

  // One amount per currency, e.g. "£14,022.50 + $1,200.00". Never a single
  // sum across currencies — that number would be meaningless.
  const formatTotals = (rows: typeof totalsByStatus) => {
    const byCurrency = new Map<string, number>();
    for (const row of rows) {
      byCurrency.set(
        row.currency,
        (byCurrency.get(row.currency) ?? 0) + Number(row._sum.totalAmount ?? 0),
      );
    }
    if (byCurrency.size === 0) return formatCurrency(0, currency);
    return [...byCurrency.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([code, amount]) => formatCurrency(amount, code))
      .join(" + ");
  };
  const countOf = (rows: typeof totalsByStatus) =>
    rows.reduce((n, row) => n + row._count._all, 0);
  const paidRows = totalsByStatus.filter((r) => r.status === "paid");
  const unpaidRows = totalsByStatus.filter((r) => r.status !== "paid");
  const statusCount = (status: string) =>
    countOf(totalsByStatus.filter((r) => r.status === status));

  const profileComplete = !!(
    user?.iban &&
    user?.swiftBic &&
    user?.addressLine1 &&
    user?.city &&
    user?.postalCode &&
    user?.country &&
    (user?.fullName || user?.name)
  );

  const clientsList =
    clients.length > 0
      ? clients
          .map((c) => {
            // Named only so the model knows not to pass a rateType — the split
            // itself happens server-side
            const tier = clientOvertimeRule(c);
            return (
              `- ${c.name} (ID: ${c.id})` +
              (c.dayRate ? `, day rate: ${sym}${c.dayRate}` : "") +
              (c.perDiemWork ? `, per diem work: ${sym}${c.perDiemWork}` : "") +
              (c.perDiemTravel
                ? `, per diem travel: ${sym}${c.perDiemTravel}`
                : "") +
              (tier ? `, tiered overtime (omit rateType)` : "")
            );
          })
          .join("\n")
      : "No clients saved yet.";

  const recentInvoices =
    invoices
      .slice(0, 5)
      .map(
        (i) =>
          `- #${i.invoiceNumber}: ${i.showName}${i.clientName ? ` (${i.clientName})` : ""} — ${formatCurrency(Number(i.totalAmount), i.currency)} [${i.status}]`,
      )
      .join("\n") || "No invoices yet.";

  const systemPrompt = `You are Caley Assistant, a friendly and efficient assistant built into the Caley invoice management app. You help freelancers manage invoices, track revenue, and create new invoices through natural conversation.

## User Profile
- Name: ${user?.fullName ?? user?.name ?? "Unknown"}
- Email: ${session.user.email}
- Currency: ${currency} (${sym})
- Profile complete for invoicing: ${profileComplete ? "Yes" : "No — missing required fields (IBAN, address, etc.). Direct the user to /profile to complete it."}

## Saved Clients
${clientsList}

## Invoice Summary
- Total invoices: ${countOf(totalsByStatus)}
- Total revenue: ${formatTotals(totalsByStatus)}
- Paid: ${formatTotals(paidRows)} (${countOf(paidRows)} invoices)
- Outstanding: ${formatTotals(unpaidRows)} (${countOf(unpaidRows)} invoices)
- Draft: ${statusCount("draft")} | Overdue: ${statusCount("overdue")}
- Amounts in different currencies are listed separately. Never add them together or convert between them.

## Recent Invoices
${recentInvoices}

## Guidelines
- Be concise and friendly.
- For invoice creation, use the user's saved profile details automatically for their personal/banking info. Only ask for what's specific to this invoice: project name, date, client, and the work done.
- If a client ID matches a saved client, use that client's saved details.
- Call createInvoiceDraft as soon as you have a project name, date, and at least one line item. Don't wait for every detail — the user can edit it afterwards. Let them know the draft is saved and they can open it in the editor.
- For revenue/stats questions, calculate from the data above. Today's date: ${new Date().toISOString().split("T")[0]}.
- When correcting an existing draft, use updateInvoiceDraft with the invoice ID.
- Route each charge to the right field: days and per diems → items[]; overtime hours → overtimeEntries[]; fixed fees and expenses (kit rental, materials) → customExpenseEntries[].
- Report overtime as the user states it — the date and the hours. For a client marked "tiered overtime", leave rateType out and the tiers are applied for you; never split the hours yourself. Pass rateType only when the user names a rate, or the client has no tiering.
- Always pass clientId when the invoice is for a saved client, so their address and saved rates are applied. Leave a standard item's unitPrice out to use the saved rate — don't pass 0 for a rate you don't know.
- If a tool returns an error, read it and fix the call, or ask the user for what's missing. Don't retry the same arguments.`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    instructions: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: buildInvoiceTools({
      userId,
      email: session.user.email,
      user,
      profileComplete,
      currency,
      sym,
    }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
};
