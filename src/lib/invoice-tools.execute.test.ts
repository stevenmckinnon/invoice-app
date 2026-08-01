/**
 * Tier 1, part two: do the `execute` guards fire, and is what lands in the
 * database what the invoice will actually render?
 *
 * These write real rows, so they need their own database — set
 * `TEST_DATABASE_URL` to a scratch one (a Neon branch, a local postgres) with
 * the migrations applied. Without it the whole suite skips rather than
 * defaulting to `DATABASE_URL`, which on this project is the live database.
 *
 *   TEST_DATABASE_URL=postgresql://… pnpm test
 *
 * Everything is created under one throwaway user and deleted afterwards.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be set before anything pulls in db.ts, which reads it at module load
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

const load = async () => {
  const [
    { buildInvoiceTools, createInvoiceDraftInput, updateInvoiceDraftInput },
    { prisma },
    { calculateInvoiceTotals },
  ] = await Promise.all([
    import("@/lib/invoice-tools"),
    import("@/lib/db"),
    import("@/lib/pdf"),
  ]);
  return {
    buildInvoiceTools,
    createInvoiceDraftInput,
    updateInvoiceDraftInput,
    prisma,
    calculateInvoiceTotals,
  };
};

/** What a tool hands back — either a guard's refusal or a written invoice */
interface ToolResult {
  error?: string;
  success?: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  total?: string;
}

const profile = {
  fullName: "Test Freelancer",
  addressLine1: "1 Test Street",
  city: "Glasgow",
  postalCode: "G1 1AA",
  country: "United Kingdom",
  iban: "GB00TEST00000000000000",
  swiftBic: "TESTGB2L",
  accountNumber: null,
  sortCode: null,
  bankAddress: null,
  addressLine2: null,
  state: null,
  name: null,
};

describe(
  "invoice tool execute guards",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    let userId: string;
    let tieredClientId: string;
    let flatClientId: string;
    let tools: ReturnType<
      Awaited<ReturnType<typeof load>>["buildInvoiceTools"]
    >;

    // Parse first, exactly as the SDK would, so these exercise the same input
    // the guards see in production — not a hand-shaped object that skips Zod
    const createDraft = async (input: unknown): Promise<ToolResult> =>
      (await tools.createInvoiceDraft.execute!(
        mod.createInvoiceDraftInput.parse(input) as never,
        { toolCallId: "test", messages: [] } as never,
      )) as ToolResult;

    const updateDraft = async (input: unknown): Promise<ToolResult> =>
      (await tools.updateInvoiceDraft.execute!(
        mod.updateInvoiceDraftInput.parse(input) as never,
        { toolCallId: "test", messages: [] } as never,
      )) as ToolResult;

    before(async () => {
      mod = await load();
      const email = `tier1-${Date.now()}@example.test`;

      const user = await mod.prisma.user.create({
        data: { email, currency: "GBP", ...profile },
      });
      userId = user.id;

      const [tiered, flat] = await Promise.all([
        mod.prisma.client.create({
          data: {
            userId,
            name: "Tiered Co",
            dayRate: 525,
            overtimeTierHours: 2,
            overtimeFirstRate: "1.5x",
            overtimeAfterRate: "2x",
          },
        }),
        mod.prisma.client.create({
          data: { userId, name: "Flat Co", dayRate: 525 },
        }),
      ]);
      tieredClientId = tiered.id;
      flatClientId = flat.id;

      tools = mod.buildInvoiceTools({
        userId,
        email,
        user: profile,
        profileComplete: true,
        currency: "GBP",
        sym: "£",
      });
    });

    after(async () => {
      if (!userId) return;
      // Invoices and their children cascade from the user
      await mod.prisma.user.delete({ where: { id: userId } });
    });

    it("refuses overtime it cannot price", async () => {
      // No clientId and no priced Work Days item: the old code wrote this
      // invoice anyway and billed the overtime at £0
      const result = await createDraft({
        showName: "Unpriced",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 4 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 2, rateType: "1.5x" }],
      });

      assert.match(result.error ?? "", /Cannot price overtime/);
      assert.equal(result.invoiceId, undefined);
      assert.equal(
        await mod.prisma.invoice.count({ where: { userId } }),
        0,
        "nothing should have been written",
      );
    });

    it("refuses a clientId that isn't the user's", async () => {
      const result = await createDraft({
        showName: "Wrong client",
        invoiceDate: "2026-08-14",
        clientId: "definitely-not-a-real-id",
        items: [{ description: "Work Days", quantity: 4, unitPrice: 525 }],
      });

      assert.match(result.error ?? "", /No saved client/);
      assert.equal(await mod.prisma.invoice.count({ where: { userId } }), 0);
    });

    it("prices a Work Days invoice and its overtime", async () => {
      const result = await createDraft({
        showName: "Priced",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 5, unitPrice: 525 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 2, rateType: "1.5x" }],
      });

      assert.equal(result.success, true);
      // 5 × £525 = £2625, plus 2h at (£525 ÷ 10) × 1.5 = £157.50
      assert.equal(result.total, "£2782.50");
    });

    it("stores a total the renderer agrees with", async () => {
      // The invariant from the £157.50-that-showed-as-£0 bug: nothing reads
      // Invoice.totalAmount when rendering, so a stored total that disagrees
      // with calculateInvoiceTotals is a silent discrepancy
      const created = await createDraft({
        showName: "Renderer agreement",
        invoiceDate: "2026-08-14",
        clientId: tieredClientId,
        items: [{ description: "Work Days", quantity: 5 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 5 }],
      });

      const invoice = await mod.prisma.invoice.findUniqueOrThrow({
        where: { id: created.invoiceId },
        include: {
          items: true,
          overtimeEntries: true,
          customExpenseEntries: true,
        },
      });

      // Only the four fields the totals actually derive from; the rest of
      // InvoicePdfInput is presentation
      const rendered = mod.calculateInvoiceTotals({
        currency: invoice.currency,
        items: invoice.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          cost: Number(i.cost),
        })),
        overtimeEntries: invoice.overtimeEntries.map((e) => ({
          hours: Number(e.hours),
          rateType: e.rateType,
        })),
        customExpenseEntries: invoice.customExpenseEntries.map((e) => ({
          cost: Number(e.cost),
        })),
      } as never);

      assert.equal(Number(invoice.totalAmount), rendered.totalAmount);
    });

    it("splits unpriced overtime by the client's tier", async () => {
      const created = await createDraft({
        showName: "Tiered",
        invoiceDate: "2026-08-14",
        clientId: tieredClientId,
        items: [{ description: "Work Days", quantity: 5 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 5 }],
      });

      const entries = await mod.prisma.overtimeEntry.findMany({
        where: { invoiceId: created.invoiceId },
        orderBy: { rateType: "asc" },
      });

      assert.deepEqual(
        entries.map((e) => ({
          hours: Number(e.hours),
          rateType: e.rateType,
        })),
        [
          { hours: 2, rateType: "1.5x" },
          { hours: 3, rateType: "2x" },
        ],
      );
    });

    it("refuses unpriced overtime when the client has no tier rule", async () => {
      const result = await createDraft({
        showName: "No rule",
        invoiceDate: "2026-08-14",
        clientId: flatClientId,
        items: [{ description: "Work Days", quantity: 5 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 5 }],
      });

      assert.match(result.error ?? "", /need a rateType/);
      assert.equal(result.invoiceId, undefined);
    });

    it("keeps overtime priced when an update drops the work days", async () => {
      // "change it to 3 travel days only" — the scenario that used to zero the
      // overtime silently. The guard doesn't fire here: the merge keeps the
      // existing Work Days *rate* at quantity 0, so overtime stays priced.
      // Assert that outcome, not the mechanism — the invoice is what matters
      const created = await createDraft({
        showName: "Keeps overtime",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 5, unitPrice: 525 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 2, rateType: "1.5x" }],
      });

      const result = await updateDraft({
        invoiceId: created.invoiceId,
        items: [{ description: "Travel Days", quantity: 3, unitPrice: 525 }],
      });

      // 3 × £525 travel, plus the 2h at £78.75 that must not have vanished
      assert.equal(result.error, undefined);
      assert.equal(result.total, "£1732.50");

      const items = await mod.prisma.invoiceLineItem.findMany({
        where: { invoiceId: created.invoiceId },
      });
      assert.equal(
        Number(items.find((i) => i.description === "Work Days")!.unitPrice),
        525,
        "the Work Days rate must survive, or overtime silently re-prices to £0",
      );
    });

    it("refuses an update that unprices existing overtime", async () => {
      const created = await createDraft({
        showName: "Unprices overtime",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 5, unitPrice: 525 }],
        overtimeEntries: [{ date: "2026-08-14", hours: 2, rateType: "1.5x" }],
      });

      // An explicit 0 is honoured elsewhere (an unpaid day is a real thing),
      // so here it genuinely removes the rate overtime derives from
      const result = await updateDraft({
        invoiceId: created.invoiceId,
        items: [{ description: "Work Days", quantity: 0, unitPrice: 0 }],
      });

      assert.match(result.error ?? "", /priced at £0/);

      const untouched = await mod.prisma.invoiceLineItem.findMany({
        where: { invoiceId: created.invoiceId },
      });
      assert.equal(
        Number(untouched.find((i) => i.description === "Work Days")!.unitPrice),
        525,
        "the rejected update must not have written anything",
      );
    });

    it("keeps custom line items an update didn't mention", async () => {
      // The £300-that-vanished bug: an update touching only the day count used
      // to delete every extra item, and report success while doing it
      const created = await createDraft({
        showName: "Keeps extras",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 5, unitPrice: 525 }],
        extraItems: [
          { description: "Kit rental", quantity: 1, unitPrice: 300 },
        ],
      });
      assert.equal(created.total, "£2925.00");

      const result = await updateDraft({
        invoiceId: created.invoiceId,
        items: [{ description: "Work Days", quantity: 6, unitPrice: 525 }],
      });

      // 6 × £525 = £3150, and the £300 kit rental must still be there
      assert.equal(result.total, "£3450.00");

      const items = await mod.prisma.invoiceLineItem.findMany({
        where: { invoiceId: created.invoiceId },
      });
      const kit = items.find((i) => i.description === "Kit rental");
      assert.ok(kit, "the kit rental must survive an unrelated update");
      assert.equal(Number(kit.unitPrice), 300);
    });

    it("applies an extras-only update without touching the day counts", async () => {
      // This used to be a no-op that returned success
      const created = await createDraft({
        showName: "Extras only",
        invoiceDate: "2026-08-14",
        items: [{ description: "Work Days", quantity: 5, unitPrice: 525 }],
        extraItems: [
          { description: "Kit rental", quantity: 1, unitPrice: 300 },
        ],
      });

      const result = await updateDraft({
        invoiceId: created.invoiceId,
        extraItems: [
          { description: "Kit rental", quantity: 1, unitPrice: 900 },
        ],
      });

      assert.equal(result.total, "£3525.00");

      const items = await mod.prisma.invoiceLineItem.findMany({
        where: { invoiceId: created.invoiceId },
      });
      assert.equal(
        Number(items.find((i) => i.description === "Kit rental")!.unitPrice),
        900,
        "the fee change must actually be written",
      );
      assert.equal(
        Number(items.find((i) => i.description === "Work Days")!.quantity),
        5,
        "a fee-only edit must not reset the day counts",
      );
    });

    it("refuses to update someone else's invoice", async () => {
      const result = await updateDraft({
        invoiceId: "not-a-real-invoice",
        showName: "Hijacked",
      });
      assert.match(result.error ?? "", /not found/i);
    });
  },
);
