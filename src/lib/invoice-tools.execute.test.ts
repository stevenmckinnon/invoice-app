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
  days?: string;
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
    let noRateClientId: string;
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
            perDiemTravel: 70,
            perDiemWork: 50,
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
      noRateClientId = (
        await mod.prisma.client.create({ data: { userId, name: "No Rates" } })
      ).id;

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

    /** INV-2605 as it actually went out: £3,748.13 */
    const inv2605 = (clientId = tieredClientId) => ({
      showName: "Triplemania 34",
      invoiceDate: "2026-09-12",
      clientId,
      days: [
        { date: "2026-09-08", type: "travel" },
        { date: "2026-09-09", type: "travel" },
        { date: "2026-09-10", type: "work" },
        { date: "2026-09-11", type: "work", overtimeHours: 2 },
        { date: "2026-09-12", type: "travel" },
        { date: "2026-09-13", type: "travel" },
      ],
      expenses: [
        { description: "Uber", unitPrice: 32.97 },
        { description: "Uber", unitPrice: 27.66 },
      ],
    });

    const stored = (id: string) =>
      mod.prisma.invoice.findUniqueOrThrow({
        where: { id },
        include: {
          items: true,
          overtimeEntries: { orderBy: [{ date: "asc" }, { rateType: "asc" }] },
          customExpenseEntries: true,
          days: { orderBy: { date: "asc" } },
        },
      });

    it("creates INV-2605 from its days at exactly £3,748.13", async () => {
      const result = await createDraft(inv2605());
      assert.equal(result.success, true, result.error ?? "");
      assert.equal(result.total, "£3748.13");
      assert.equal(result.days, "4 travel, 2 work, 2h overtime");

      const invoice = await stored(result.invoiceId!);
      assert.equal(Number(invoice.totalAmount), 3748.13);
      assert.equal(invoice.days.length, 6);
      // A day invoice: it opens in the calendar editor, priced from its terms
      assert.deepEqual(invoice.terms, {
        dayRate: 525,
        perDiem: { work: 50, travel: 70 },
        overtimeTier: { tierHours: 2, firstRate: "1.5x", afterRate: "2x" },
        travelWork: { bill: "both", perDiem: "travel" },
      });
    });

    it("stores a total the renderer agrees with", async () => {
      // Nothing reads the stored total back through billDays: the PDF and
      // pages recompute from the rows, so the two must match
      const result = await createDraft(inv2605());
      const invoice = await stored(result.invoiceId!);
      const rendered = mod.calculateInvoiceTotals({
        items: invoice.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          cost: Number(i.cost),
        })),
        overtimeEntries: invoice.overtimeEntries.map((e) => ({
          date: e.date,
          hours: Number(e.hours),
          rateType: e.rateType,
        })),
        customExpenseEntries: invoice.customExpenseEntries.map((e) => ({
          description: e.description,
          quantity: e.quantity,
          unitPrice: Number(e.unitPrice),
          cost: Number(e.cost),
        })),
      } as never);
      assert.equal(
        Math.round(rendered.totalAmount * 100) / 100,
        Number(invoice.totalAmount),
      );
    });

    it("splits each day's overtime by the client's tier", async () => {
      const result = await createDraft({
        showName: "Long Day",
        invoiceDate: "2026-09-01",
        clientId: tieredClientId,
        days: [{ date: "2026-09-01", type: "work", overtimeHours: 5 }],
      });
      const invoice = await stored(result.invoiceId!);
      assert.deepEqual(
        invoice.overtimeEntries.map((e) => [Number(e.hours), e.rateType]),
        [
          [2, "1.5x"],
          [3, "2x"],
        ],
      );
    });

    it("bills an untiered client's overtime at 1.5x", async () => {
      const result = await createDraft({
        showName: "Flat",
        invoiceDate: "2026-09-01",
        clientId: flatClientId,
        days: [{ date: "2026-09-01", type: "work", overtimeHours: 4 }],
      });
      // £525 + 4h × £52.50 × 1.5
      assert.equal(result.total, "£840.00");
    });

    it("prices an unsaved client from the rates it's given", async () => {
      const result = await createDraft({
        showName: "One-off",
        invoiceDate: "2026-09-01",
        clientName: "Somebody Ltd",
        rates: { dayRate: 400, perDiemTravel: 50 },
        days: [
          { date: "2026-09-01", type: "travel" },
          { date: "2026-09-02", type: "work" },
        ],
      });
      assert.equal(result.success, true, result.error ?? "");
      // 2 days at £400 + one travel per diem
      assert.equal(result.total, "£850.00");
      const invoice = await stored(result.invoiceId!);
      assert.equal(invoice.clientId, null);
      assert.equal(invoice.clientName, "Somebody Ltd");
    });

    it("refuses a clientId that isn't the user's", async () => {
      const result = await createDraft(inv2605("not-a-real-client"));
      assert.match(result.error ?? "", /No saved client/);
    });

    it("refuses a saved client with no day rate", async () => {
      const result = await createDraft(inv2605(noRateClientId));
      assert.match(result.error ?? "", /no day rate/);
    });

    it("refuses days with nothing to price them at", async () => {
      const { clientId: _clientId, ...noClient } = inv2605();
      const result = await createDraft(noClient);
      assert.match(result.error ?? "", /No rates/);
    });

    it("reads travel marked on a travel day as its direction", async () => {
      // Seen live: the model marked the outbound flight as travel "out" on
      // the travel day itself, was refused, and had to retry
      const result = await createDraft({
        ...inv2605(),
        days: [
          { date: "2026-09-08", type: "travel", alsoTravel: "out" },
          { date: "2026-09-09", type: "work" },
        ],
      });
      assert.equal(result.success, true, result.error ?? "");
      const invoice = await stored(result.invoiceId!);
      assert.equal(invoice.days[0].direction, "out");
      assert.equal(invoice.days[0].alsoTravel, null);
    });

    it("explains days it can't bill", async () => {
      const result = await createDraft({
        ...inv2605(),
        days: [{ date: "2026-09-08", type: "travel", overtimeHours: 2 }],
      });
      assert.match(result.error ?? "", /only work days have overtime/);
    });

    it("replaces the days on update, keeping the expenses", async () => {
      const { invoiceId } = await createDraft(inv2605());
      const result = await updateDraft({
        invoiceId,
        days: inv2605().days.map((d) =>
          d.date === "2026-09-10" ? { ...d, overtimeHours: 1 } : d,
        ),
      });
      assert.equal(result.success, true, result.error ?? "");
      // + 1h at £52.50 × 1.5
      assert.equal(result.total, "£3826.88");
      const invoice = await stored(invoiceId!);
      assert.equal(invoice.customExpenseEntries.length, 2);
      assert.equal(invoice.days.length, 6);
    });

    it("replaces only the expenses when only expenses are sent", async () => {
      const { invoiceId } = await createDraft(inv2605());
      const result = await updateDraft({
        invoiceId,
        expenses: [{ description: "Parking", unitPrice: 10 }],
      });
      assert.equal(result.total, "£3697.50");
      const invoice = await stored(invoiceId!);
      assert.equal(invoice.days.length, 6);
      assert.deepEqual(
        invoice.customExpenseEntries.map((e) => e.description),
        ["Parking"],
      );
    });

    it("keeps the price the draft was made with after the client's rate changes", async () => {
      const { invoiceId } = await createDraft(inv2605());
      await mod.prisma.client.update({
        where: { id: tieredClientId },
        data: { dayRate: 900 },
      });
      try {
        const result = await updateDraft({ invoiceId, days: inv2605().days });
        assert.equal(result.total, "£3748.13");
      } finally {
        await mod.prisma.client.update({
          where: { id: tieredClientId },
          data: { dayRate: 525 },
        });
      }
    });

    it("renames a draft without touching its billing", async () => {
      const { invoiceId } = await createDraft(inv2605());
      const result = await updateDraft({ invoiceId, showName: "Renamed" });
      assert.equal(result.total, "£3748.13");
      assert.equal((await stored(invoiceId!)).showName, "Renamed");
    });

    it("leaves a draft untouched when an update can't be billed", async () => {
      const { invoiceId } = await createDraft(inv2605());
      const result = await updateDraft({
        invoiceId,
        days: [{ date: "2026-09-08", type: "dark", alsoTravel: "out" }],
      });
      assert.match(result.error ?? "", /only work days can also have travel/);
      const invoice = await stored(invoiceId!);
      assert.equal(invoice.days.length, 6);
      assert.equal(Number(invoice.totalAmount), 3748.13);
    });

    it("refuses to edit an invoice made before days were recorded", async () => {
      // An old count-based draft: no terms, no days
      const legacy = await mod.prisma.invoice.create({
        data: {
          userId,
          invoiceNumber: `OLD-${Date.now()}`,
          invoiceDate: new Date("2026-08-14"),
          showName: "Old draft",
          fullName: profile.fullName,
          email: "old@example.test",
          addressLine1: profile.addressLine1,
          city: profile.city,
          postalCode: profile.postalCode,
          country: profile.country,
          iban: profile.iban,
          swiftBic: profile.swiftBic,
          regularRate: 0,
          overtimeRate: 0,
          perDiemRate: 0,
          travelDayRate: 0,
          subtotalLabor: 0,
          subtotalPerDiem: 0,
          subtotalTravel: 0,
          totalAmount: 1050,
          items: {
            create: [
              {
                description: "Work Days",
                quantity: 2,
                unitPrice: 525,
                cost: 1050,
              },
            ],
          },
        },
      });

      const result = await updateDraft({
        invoiceId: legacy.id,
        days: inv2605().days,
      });
      assert.match(result.error ?? "", /made before days were recorded/);
      const after = await stored(legacy.id);
      assert.equal(Number(after.totalAmount), 1050);
      assert.equal(after.days.length, 0);
    });

    it("refuses to update someone else's invoice", async () => {
      const result = await updateDraft({
        invoiceId: "not-a-real-invoice",
        showName: "Hijacked",
      });
      assert.match(result.error ?? "", /not found/i);
    });

    it("refuses to create anything until the profile is complete", async () => {
      const incomplete = mod.buildInvoiceTools({
        userId,
        email: "x@example.test",
        user: profile,
        profileComplete: false,
        currency: "GBP",
        sym: "£",
      });
      const result = (await incomplete.createInvoiceDraft.execute!(
        mod.createInvoiceDraftInput.parse(inv2605()) as never,
        { toolCallId: "test", messages: [] } as never,
      )) as ToolResult;
      assert.match(result.error ?? "", /profile is incomplete/);
    });
  },
);
