/**
 * The tools an MCP client (Claude on the phone or laptop) can call. Read-only
 * for now. Every query is scoped to the user the access token was issued to,
 * exactly as the route handlers scope theirs by the session.
 */
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

import { prisma } from "@/lib/db";

const text = (value: unknown) => ({
  content: [
    { type: "text" as const, text: JSON.stringify(value, null, 2) },
  ],
});

const failure = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const day = (value: Date) => value.toISOString().slice(0, 10);

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

export const createCaleyMcpServer = (userId: string) => {
  const server = new McpServer({ name: "caley", version: "1.0.0" });

  server.registerTool(
    "list_clients",
    {
      description:
        "List your clients with their billing terms: day rate, per diems, overtime tier and how a work day with travel bills.",
      inputSchema: z.object({}),
      annotations: readOnly,
    },
    async () => {
      const clients = await prisma.client.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          dayRate: true,
          perDiemWork: true,
          perDiemTravel: true,
          overtimeTierHours: true,
          overtimeFirstRate: true,
          overtimeAfterRate: true,
          travelWorkBill: true,
          travelWorkPerDiem: true,
        },
      });
      return text(clients);
    },
  );

  server.registerTool(
    "list_invoices",
    {
      description:
        "List invoices, newest first: number, date, job, client, total and status. Filter by status, client name or invoice number to narrow it.",
      inputSchema: z.object({
        status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
        search: z
          .string()
          .optional()
          .describe("Part of a client name, job name or invoice number"),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      annotations: readOnly,
    },
    async ({ status, search, limit }) => {
      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
          ...(search
            ? {
                OR: [
                  { clientName: { contains: search, mode: "insensitive" } },
                  { showName: { contains: search, mode: "insensitive" } },
                  { invoiceNumber: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { invoiceDate: "desc" },
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          showName: true,
          clientName: true,
          totalAmount: true,
          currency: true,
          status: true,
        },
      });
      return text(
        invoices.map((i) => ({
          ...i,
          invoiceDate: day(i.invoiceDate),
          totalAmount: Number(i.totalAmount),
        })),
      );
    },
  );

  server.registerTool(
    "get_invoice",
    {
      description:
        "One invoice in full: its dated days, the billed lines, overtime, expenses and total, as stored. Look it up by id or invoice number.",
      inputSchema: z.object({
        id: z.string().optional(),
        invoiceNumber: z.string().optional().describe("For example INV-2605"),
      }),
      annotations: readOnly,
    },
    async ({ id, invoiceNumber }) => {
      if (!id && !invoiceNumber) return failure("Give an id or invoiceNumber.");
      const invoice = await prisma.invoice.findFirst({
        where: { userId, ...(id ? { id } : { invoiceNumber }) },
        include: {
          items: true,
          overtimeEntries: true,
          customExpenseEntries: true,
          days: { orderBy: { date: "asc" } },
        },
      });
      if (!invoice) return failure("No invoice found.");
      return text({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: day(invoice.invoiceDate),
        showName: invoice.showName,
        status: invoice.status,
        currency: invoice.currency,
        client: invoice.clientName,
        notes: invoice.notes,
        // Count-based invoices (made before days existed) have no days
        kind: invoice.terms ? "day-based" : "count-based",
        days: invoice.days.map((d) => ({
          date: day(d.date),
          type: d.type,
          alsoTravel: d.alsoTravel,
          overtimeHours: d.overtimeHours,
        })),
        lines: invoice.items
          .filter((i) => Number(i.quantity) > 0)
          .map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            cost: Number(i.cost),
          })),
        overtime: invoice.overtimeEntries.map((o) => ({
          date: day(o.date),
          hours: Number(o.hours),
          rateType: o.rateType,
        })),
        expenses: invoice.customExpenseEntries.map((e) => ({
          description: e.description,
          quantity: Number(e.quantity),
          unitPrice: Number(e.unitPrice),
          cost: Number(e.cost),
        })),
        total: Number(invoice.totalAmount),
      });
    },
  );

  return server;
};
