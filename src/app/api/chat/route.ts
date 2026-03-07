import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateNextInvoiceNumber } from "@/lib/invoice-number";

export const POST = async (req: Request) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const userId = session.user.id;

  const [user, clients, invoices] = await Promise.all([
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
      },
    }),
    prisma.invoice.findMany({
      where: { userId },
      select: {
        invoiceNumber: true,
        showName: true,
        clientName: true,
        totalAmount: true,
        status: true,
        invoiceDate: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const paidRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);
  const outstandingRevenue = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + Number(i.totalAmount), 0);

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
          .map(
            (c) =>
              `- ${c.name} (ID: ${c.id})` +
              (c.dayRate ? `, day rate: ${sym}${c.dayRate}` : "") +
              (c.perDiemWork ? `, per diem work: ${sym}${c.perDiemWork}` : "") +
              (c.perDiemTravel
                ? `, per diem travel: ${sym}${c.perDiemTravel}`
                : ""),
          )
          .join("\n")
      : "No clients saved yet.";

  const recentInvoices =
    invoices
      .slice(0, 5)
      .map(
        (i) =>
          `- #${i.invoiceNumber}: ${i.showName}${i.clientName ? ` (${i.clientName})` : ""} — ${sym}${Number(i.totalAmount).toFixed(2)} [${i.status}]`,
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
- Total invoices: ${invoices.length}
- Total revenue: ${sym}${totalRevenue.toFixed(2)}
- Paid: ${sym}${paidRevenue.toFixed(2)} (${invoices.filter((i) => i.status === "paid").length} invoices)
- Outstanding: ${sym}${outstandingRevenue.toFixed(2)} (${invoices.filter((i) => i.status !== "paid").length} invoices)
- Draft: ${invoices.filter((i) => i.status === "draft").length} | Overdue: ${invoices.filter((i) => i.status === "overdue").length}

## Recent Invoices
${recentInvoices}

## Guidelines
- Be concise and friendly.
- For invoice creation, use the user's saved profile details automatically for their personal/banking info. Only ask for what's specific to this invoice: project name, date, client, and the work done.
- If a client ID matches a saved client, use that client's saved details.
- Call createInvoiceDraft as soon as you have a project name, date, and at least one line item. Don't wait for every detail — the user can edit it afterwards. Let them know the draft is saved and they can open it in the editor.
- For revenue/stats questions, calculate from the data above. Today's date: ${new Date().toISOString().split("T")[0]}.
- When correcting an existing draft, use updateInvoiceDraft with the invoice ID.
- IMPORTANT — use the correct fields for each type of charge:
  - Regular work days → use items[] with description "Work Days", quantity = number of days, unitPrice = client's day rate
  - Overtime hours (1.5x or 2x rate) → use overtimeEntries[] (NOT items). The overtime hourly rate is derived automatically from the "Work Days" item (dayRate ÷ 10 hours). Always include a "Work Days" item whenever there are overtime entries, or overtime will show as £0 in the editor.
  - Per diems and travel days → use customExpenseEntries[] with the appropriate per diem/travel rate from the client's saved rates
  - Other fixed fees or expenses → use items[]`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      createInvoiceDraft: tool({
        description:
          "Create a draft invoice. Call this when you have: a project/show name, invoice date, and at least one line item. The user's profile details are used automatically.",
        inputSchema: z.object({
          showName: z.string().describe("Project or show name"),
          invoiceDate: z
            .string()
            .describe("Invoice date in ISO format (YYYY-MM-DD)"),
          clientId: z
            .string()
            .optional()
            .describe("ID of a saved client, if applicable"),
          clientName: z.string().optional().describe("Client company name"),
          clientAddress1: z.string().optional(),
          clientCity: z.string().optional(),
          clientPostalCode: z.string().optional(),
          clientCountry: z.string().optional(),
          attentionTo: z
            .string()
            .optional()
            .describe("Contact person at the client"),
          items: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number(),
                unitPrice: z
                  .number()
                  .describe("Price per unit in the user's currency"),
              }),
            )
            .min(1)
            .describe("Invoice line items"),
          overtimeEntries: z
            .array(
              z.object({
                date: z.string().describe("Date in ISO format (YYYY-MM-DD)"),
                hours: z.number().positive(),
                rateType: z
                  .enum(["1.5x", "2x"])
                  .describe("Overtime multiplier"),
                description: z.string().optional(),
              }),
            )
            .optional()
            .describe(
              "Overtime hours entries — use this instead of adding overtime as a line item",
            ),
          customExpenseEntries: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number().int().positive(),
                unitPrice: z
                  .number()
                  .nonnegative()
                  .describe("Price per unit in the user's currency"),
              }),
            )
            .optional()
            .describe(
              "Custom expense entries (e.g. kit rental, travel costs) — use this instead of adding expenses as line items",
            ),
          notes: z.string().optional(),
        }),
        execute: async ({
          showName,
          invoiceDate,
          clientId,
          clientName,
          clientAddress1,
          clientCity,
          clientPostalCode,
          clientCountry,
          attentionTo,
          items,
          overtimeEntries,
          customExpenseEntries,
          notes,
        }) => {
          if (!profileComplete) {
            return {
              error:
                "User profile is incomplete. Please visit /profile to add your address and banking details before creating invoices.",
            };
          }

          const invoiceNumber = await generateNextInvoiceNumber();

          let resolvedClient = null;
          if (clientId) {
            resolvedClient = await prisma.client.findFirst({
              where: { id: clientId, userId },
            });
          }

          // Always include the 5 standard line items (matching the manual new-invoice form defaults).
          // AI-provided items override defaults where descriptions match; extras are appended.
          const dayRate = resolvedClient?.dayRate
            ? Number(resolvedClient.dayRate)
            : 0;
          const perDiemWorkRate = resolvedClient?.perDiemWork
            ? Number(resolvedClient.perDiemWork)
            : 0;
          const perDiemTravelRate = resolvedClient?.perDiemTravel
            ? Number(resolvedClient.perDiemTravel)
            : 0;

          const DEFAULT_LINE_ITEMS = [
            { description: "Travel Days", unitPrice: dayRate },
            { description: "Work Days", unitPrice: dayRate },
            { description: "Dark days", unitPrice: dayRate },
            {
              description: "Per Diems Travel Days",
              unitPrice: perDiemTravelRate,
            },
            { description: "Per Diems Work Days", unitPrice: perDiemWorkRate },
          ];

          const aiItemMap = new Map(items.map((i) => [i.description, i]));
          const defaultDescriptions = new Set(
            DEFAULT_LINE_ITEMS.map((d) => d.description),
          );

          const mergedItems = [
            ...DEFAULT_LINE_ITEMS.map((def) => {
              const ai = aiItemMap.get(def.description);
              return ai
                ? {
                    description: ai.description,
                    quantity: ai.quantity,
                    unitPrice: ai.unitPrice,
                  }
                : {
                    description: def.description,
                    quantity: 0,
                    unitPrice: def.unitPrice,
                  };
            }),
            ...items.filter((i) => !defaultDescriptions.has(i.description)),
          ];

          const lineItems = mergedItems.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            cost: i.quantity * i.unitPrice,
          }));

          // Derive hourly rate from "Work Days" item (same logic as invoice editor: unitPrice * 0.1)
          // Falls back to client's dayRate / 10, then 0
          const workDaysItem = lineItems.find(
            (i) => i.description === "Work Days",
          );
          const regularRate =
            workDaysItem && workDaysItem.unitPrice > 0
              ? workDaysItem.unitPrice * 0.1
              : resolvedClient?.dayRate
                ? Number(resolvedClient.dayRate) / 10
                : 0;

          const overtimeTotal = (overtimeEntries ?? []).reduce((s, e) => {
            const multiplier = e.rateType === "2x" ? 2 : 1.5;
            return s + e.hours * regularRate * multiplier;
          }, 0);

          const expenseItems = (customExpenseEntries ?? []).map((e) => ({
            description: e.description,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            cost: e.quantity * e.unitPrice,
          }));
          const expensesTotal = expenseItems.reduce((s, e) => s + e.cost, 0);

          const itemsTotal = lineItems.reduce((s, i) => s + i.cost, 0);
          const totalAmount = itemsTotal + overtimeTotal + expensesTotal;

          const invoice = await prisma.invoice.create({
            data: {
              userId,
              clientId: resolvedClient?.id ?? null,
              invoiceNumber,
              invoiceDate: new Date(invoiceDate),
              showName,
              fullName: user!.fullName ?? user!.name ?? "",
              email: session.user.email,
              addressLine1: user!.addressLine1!,
              addressLine2: user?.addressLine2 ?? undefined,
              city: user!.city!,
              state: user?.state ?? undefined,
              postalCode: user!.postalCode!,
              country: user!.country!,
              clientName: resolvedClient?.name ?? clientName ?? undefined,
              clientAddress1:
                resolvedClient?.addressLine1 ?? clientAddress1 ?? undefined,
              clientCity: resolvedClient?.city ?? clientCity ?? undefined,
              clientPostalCode:
                resolvedClient?.postalCode ?? clientPostalCode ?? undefined,
              clientCountry:
                resolvedClient?.country ?? clientCountry ?? undefined,
              attentionTo:
                resolvedClient?.attentionTo ?? attentionTo ?? undefined,
              iban: user!.iban!,
              swiftBic: user!.swiftBic!,
              accountNumber: user?.accountNumber ?? undefined,
              sortCode: user?.sortCode ?? undefined,
              bankAddress: user?.bankAddress ?? undefined,
              currency,
              regularHours: 0,
              overtimeHours: 0,
              perDiemDays: 0,
              travelDays: 0,
              regularRate: 0 as unknown as any,
              overtimeRate: 0 as unknown as any,
              perDiemRate: 0 as unknown as any,
              travelDayRate: 0 as unknown as any,
              subtotalLabor: totalAmount as unknown as any,
              subtotalPerDiem: 0 as unknown as any,
              subtotalTravel: 0 as unknown as any,
              totalAmount: totalAmount as unknown as any,
              status: "draft",
              notes: notes ?? undefined,
              items: {
                createMany: {
                  data: lineItems.map((i) => ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice as unknown as any,
                    cost: i.cost as unknown as any,
                  })),
                },
              },
              overtimeEntries: {
                createMany: {
                  data: (overtimeEntries ?? []).map((e) => ({
                    date: new Date(e.date),
                    hours: e.hours as unknown as any,
                    rateType: e.rateType,
                    description: e.description ?? undefined,
                  })),
                },
              },
              customExpenseEntries: {
                createMany: {
                  data: expenseItems.map((e) => ({
                    description: e.description,
                    quantity: e.quantity,
                    unitPrice: e.unitPrice as unknown as any,
                    cost: e.cost as unknown as any,
                  })),
                },
              },
            },
            select: { id: true, invoiceNumber: true, totalAmount: true },
          });

          return {
            success: true,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: `${sym}${Number(invoice.totalAmount).toFixed(2)}`,
          };
        },
      }),

      updateInvoiceDraft: tool({
        description:
          "Update an existing draft invoice with corrected or additional information.",
        inputSchema: z.object({
          invoiceId: z.string(),
          showName: z.string().optional(),
          invoiceDate: z.string().optional(),
          clientName: z.string().optional(),
          items: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number(),
                unitPrice: z.number(),
              }),
            )
            .optional()
            .describe("Replaces all existing line items if provided"),
          overtimeEntries: z
            .array(
              z.object({
                date: z.string(),
                hours: z.number().positive(),
                rateType: z.enum(["1.5x", "2x"]),
                description: z.string().optional(),
              }),
            )
            .optional()
            .describe("Replaces all existing overtime entries if provided"),
          customExpenseEntries: z
            .array(
              z.object({
                description: z.string(),
                quantity: z.number().int().positive(),
                unitPrice: z.number().nonnegative(),
              }),
            )
            .optional()
            .describe(
              "Replaces all existing custom expense entries if provided",
            ),
          notes: z.string().optional(),
        }),
        execute: async ({
          invoiceId,
          showName,
          invoiceDate,
          clientName,
          items,
          overtimeEntries,
          customExpenseEntries,
          notes,
        }) => {
          const existing = await prisma.invoice.findFirst({
            where: { id: invoiceId, userId },
            select: { id: true, totalAmount: true },
          });

          if (!existing) {
            return { error: "Invoice not found or does not belong to you." };
          }

          const needsTotalRecalc = !!(
            items ||
            overtimeEntries ||
            customExpenseEntries
          );

          if (items) {
            // Fetch existing items to preserve client rates for defaults
            const existingItems = await prisma.invoiceLineItem.findMany({
              where: { invoiceId },
            });
            const existingWorkDays = existingItems.find(
              (i) => i.description === "Work Days",
            );
            const existingTravelDays = existingItems.find(
              (i) => i.description === "Travel Days",
            );
            const existingPerDiemWork = existingItems.find(
              (i) => i.description === "Per Diems Work Days",
            );
            const existingPerDiemTravel = existingItems.find(
              (i) => i.description === "Per Diems Travel Days",
            );

            const DEFAULT_LINE_ITEMS = [
              {
                description: "Travel Days",
                unitPrice: existingTravelDays
                  ? Number(existingTravelDays.unitPrice)
                  : existingWorkDays
                    ? Number(existingWorkDays.unitPrice)
                    : 0,
              },
              {
                description: "Work Days",
                unitPrice: existingWorkDays
                  ? Number(existingWorkDays.unitPrice)
                  : 0,
              },
              {
                description: "Dark days",
                unitPrice: existingWorkDays
                  ? Number(existingWorkDays.unitPrice)
                  : 0,
              },
              {
                description: "Per Diems Travel Days",
                unitPrice: existingPerDiemTravel
                  ? Number(existingPerDiemTravel.unitPrice)
                  : 0,
              },
              {
                description: "Per Diems Work Days",
                unitPrice: existingPerDiemWork
                  ? Number(existingPerDiemWork.unitPrice)
                  : 0,
              },
            ];

            const aiItemMap = new Map(items.map((i) => [i.description, i]));
            const defaultDescriptions = new Set(
              DEFAULT_LINE_ITEMS.map((d) => d.description),
            );

            const mergedItems = [
              ...DEFAULT_LINE_ITEMS.map((def) => {
                const ai = aiItemMap.get(def.description);
                return ai
                  ? {
                      description: ai.description,
                      quantity: ai.quantity,
                      unitPrice: ai.unitPrice,
                    }
                  : {
                      description: def.description,
                      quantity: 0,
                      unitPrice: def.unitPrice,
                    };
              }),
              ...items.filter((i) => !defaultDescriptions.has(i.description)),
            ];

            const lineItems = mergedItems.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              cost: i.quantity * i.unitPrice,
            }));

            await prisma.invoiceLineItem.deleteMany({ where: { invoiceId } });
            await prisma.invoiceLineItem.createMany({
              data: lineItems.map((i) => ({
                invoiceId,
                description: i.description,
                quantity: i.quantity,
                unitPrice: i.unitPrice as unknown as any,
                cost: i.cost as unknown as any,
              })),
            });
          }

          if (overtimeEntries) {
            await prisma.overtimeEntry.deleteMany({ where: { invoiceId } });
            await prisma.overtimeEntry.createMany({
              data: overtimeEntries.map((e) => ({
                invoiceId,
                date: new Date(e.date),
                hours: e.hours as unknown as any,
                rateType: e.rateType,
                description: e.description ?? undefined,
              })),
            });
          }

          if (customExpenseEntries) {
            await prisma.customExpenseEntry.deleteMany({
              where: { invoiceId },
            });
            await prisma.customExpenseEntry.createMany({
              data: customExpenseEntries.map((e) => ({
                invoiceId,
                description: e.description,
                quantity: e.quantity,
                unitPrice: e.unitPrice as unknown as any,
                cost: (e.quantity * e.unitPrice) as unknown as any,
              })),
            });
          }

          let totalAmount = Number(existing.totalAmount);
          if (needsTotalRecalc) {
            const current = await prisma.invoice.findUnique({
              where: { id: invoiceId },
              include: {
                items: true,
                overtimeEntries: true,
                customExpenseEntries: true,
              },
            });
            // Derive hourly rate from "Work Days" item — same logic as invoice editor
            const workDaysItem = current!.items.find(
              (i) => i.description === "Work Days",
            );
            const regularRate =
              workDaysItem && Number(workDaysItem.unitPrice) > 0
                ? Number(workDaysItem.unitPrice) * 0.1
                : 0;
            const currentItemsTotal = current!.items.reduce(
              (s, i) => s + Number(i.cost),
              0,
            );
            const currentOvertimeTotal = current!.overtimeEntries.reduce(
              (s, e) => {
                const multiplier = e.rateType === "2x" ? 2 : 1.5;
                return s + Number(e.hours) * regularRate * multiplier;
              },
              0,
            );
            const currentExpensesTotal = current!.customExpenseEntries.reduce(
              (s, e) => s + Number(e.cost),
              0,
            );
            totalAmount =
              currentItemsTotal + currentOvertimeTotal + currentExpensesTotal;
          }

          await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
              ...(showName && { showName }),
              ...(invoiceDate && { invoiceDate: new Date(invoiceDate) }),
              ...(clientName && { clientName }),
              ...(notes !== undefined && { notes }),
              ...(needsTotalRecalc && {
                totalAmount: totalAmount as unknown as any,
                subtotalLabor: totalAmount as unknown as any,
              }),
            },
          });

          return {
            success: true,
            invoiceId,
            total: `${sym}${totalAmount.toFixed(2)}`,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
};
