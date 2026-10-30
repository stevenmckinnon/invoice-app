/**
 * The tools an MCP client (Claude on the phone or laptop) can call. Reading
 * needs `invoices:read`; making and correcting drafts needs `invoices:write`.
 * Nothing here can send, mark paid or delete an invoice. Every query is scoped
 * to the user the access token was issued to, exactly as the route handlers
 * scope theirs by the session.
 */
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

import { APP_URL } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildInvoiceTools,
  createInvoiceDraftInput,
  isProfileComplete,
  updateInvoiceDraftInput,
} from "@/lib/invoice-tools";
import { signPdfLink, PDF_LINK_TTL_SECONDS } from "@/lib/signed-link";

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

/** The chat tools' own answer: an error to explain, or what was written */
type DraftResult = { error?: string } & Record<string, unknown>;

export const createCaleyMcpServer = (
  userId: string,
  /** The scopes the access token was granted */
  scopes: string[] = ["invoices:read"],
) => {
  const server = new McpServer({ name: "caley", version: "1.0.0" });
  const canWrite = scopes.includes("invoices:write");
  const needsWrite = failure(
    "This connection can read invoices but not create them. In Claude, disconnect the Caley connector and connect it again, and allow it to create drafts.",
  );

  /** The chat tools, with the user's profile loaded as the chat route does */
  const draftTools = async () => {
    const user = await prisma.user.findUnique({
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
    });
    const currency = user?.currency ?? "GBP";
    return buildInvoiceTools({
      userId,
      email: user?.email ?? "",
      user,
      profileComplete: isProfileComplete(user),
      currency,
      sym: currency,
    });
  };

  const draftAnswer = (result: DraftResult) =>
    result.error
      ? failure(result.error)
      : text({
          ...result,
          // Where to review it: the app opens drafts in the calendar editor
          ...(typeof result.invoiceId === "string" && {
            open: `${APP_URL}/invoices/${result.invoiceId}`,
          }),
        });

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

  server.registerTool(
    "get_invoice_pdf_link",
    {
      description:
        "A link to the invoice's PDF, to give to the person: opening it shows or downloads the PDF. The link works for 10 minutes, so make a new one if it's needed later. It can't be fetched by you; just share it.",
      inputSchema: z.object({
        id: z.string().optional(),
        invoiceNumber: z.string().optional().describe("For example INV-2605"),
      }),
      annotations: readOnly,
    },
    async ({ id, invoiceNumber }) => {
      if (!id && !invoiceNumber) return failure("Give an id or invoiceNumber.");
      // Only the user's own invoices get a link
      const invoice = await prisma.invoice.findFirst({
        where: { userId, ...(id ? { id } : { invoiceNumber }) },
        select: { id: true, invoiceNumber: true },
      });
      if (!invoice) return failure("No invoice found.");

      const params = new URLSearchParams({ ...signPdfLink(invoice.id, userId) });
      return text({
        invoiceNumber: invoice.invoiceNumber,
        url: `${APP_URL}/api/invoices/${invoice.id}/pdf?${params}`,
        expiresInMinutes: PDF_LINK_TTL_SECONDS / 60,
      });
    },
  );

  server.registerTool(
    "create_invoice_draft",
    {
      description:
        "Create a DRAFT invoice from the dated days of a job. Prices it from a saved client's terms (use list_clients for the id) and adds your profile and bank details. Nothing is sent: review the draft in Caley, then send it from there. Give one entry per billed date; overtime goes on the day as hours.",
      inputSchema: createInvoiceDraftInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      if (!canWrite) return needsWrite;
      const tools = await draftTools();
      const result = (await tools.createInvoiceDraft.execute!(input, {
        toolCallId: "mcp",
        messages: [],
      } as never)) as DraftResult;
      return draftAnswer(result);
    },
  );

  server.registerTool(
    "update_invoice_draft",
    {
      description:
        "Correct a DRAFT invoice: name, date, contact, notes, days or expenses. Days and expenses replace what's there, so send the full set. Invoices that have been sent or paid can't be changed here.",
      inputSchema: updateInvoiceDraftInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      if (!canWrite) return needsWrite;
      // Only drafts: once an invoice has gone out, changing it is a decision
      // for the app, not for an assistant
      const existing = await prisma.invoice.findFirst({
        where: { id: input.invoiceId, userId },
        select: { status: true },
      });
      if (!existing) return failure("No invoice found.");
      if (existing.status !== "draft") {
        return failure(
          `This invoice is ${existing.status}, so it can't be changed here. Only drafts can.`,
        );
      }
      const tools = await draftTools();
      const result = (await tools.updateInvoiceDraft.execute!(input, {
        toolCallId: "mcp",
        messages: [],
      } as never)) as DraftResult;
      return draftAnswer(result);
    },
  );

  return server;
};
