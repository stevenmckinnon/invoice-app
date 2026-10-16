/**
 * Invoices built from dated days, end to end through the real route
 * handlers: the server prices the days from the client's terms, stores the
 * days, the terms snapshot and the billing output. Old count invoices are
 * never converted: their billing is locked, and only status and notes change.
 *
 * Needs a database, like authz.test.ts: set `TEST_DATABASE_URL`.
 */
import { NextRequest } from "next/server";
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

let requestHeaders = new Headers();

const load = async () => {
  mock.module("next/headers", {
    namedExports: { headers: async () => requestHeaders },
  });
  const [{ prisma }, { auth }, invoicesRoute, invoiceRoute] = await Promise.all(
    [
      import("@/lib/db"),
      import("@/lib/auth"),
      import("@/app/api/invoices/route"),
      import("@/app/api/invoices/[id]/route"),
    ],
  );
  return { prisma, auth, invoicesRoute, invoiceRoute };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

/** INV-2605 as it actually went out: £3,748.13 */
const inv2605Days = [
  { date: "2026-09-08", type: "travel" },
  { date: "2026-09-09", type: "travel" },
  { date: "2026-09-10", type: "work" },
  { date: "2026-09-11", type: "work", overtimeHours: 2 },
  { date: "2026-09-12", type: "travel" },
  { date: "2026-09-13", type: "travel" },
];

const expenses = [
  { id: "e1", description: "Uber", quantity: 1, unitPrice: 32.97, cost: 32.97 },
  { id: "e2", description: "Uber", quantity: 1, unitPrice: 27.66, cost: 27.66 },
];

describe(
  "invoices built from days",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    let userId: string;
    let cookie: string;
    let wweClientId: string;
    let mallardClientId: string;
    let noRateClientId: string;
    let dayInvoiceId: string;

    const body = (overrides: object = {}) => ({
      invoiceNumber: `DAYS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceDate: "2026-09-12",
      showName: "Triplemania 34",
      fullName: "Test Person",
      email: "days@example.test",
      addressLine1: "1 Test Street",
      city: "Glasgow",
      postalCode: "G1 1AA",
      country: "United Kingdom",
      iban: "GB00TEST0000000000000",
      swiftBic: "TESTGB2L",
      clientId: wweClientId,
      days: inv2605Days,
      customExpenseEntries: expenses,
      ...overrides,
    });

    const post = (payload: object) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoicesRoute.POST(
        new NextRequest("http://localhost/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    };

    const put = (id: string, payload: object) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.PUT(
        new NextRequest(`http://localhost/api/invoices/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
        params(id),
      );
    };

    const stored = (id: string) =>
      mod.prisma.invoice.findUniqueOrThrow({
        where: { id },
        include: {
          items: { orderBy: { description: "asc" } },
          overtimeEntries: { orderBy: [{ date: "asc" }, { rateType: "asc" }] },
          customExpenseEntries: true,
          days: { orderBy: { date: "asc" } },
        },
      });

    before(async () => {
      mod = await load();
      const { headers, response } = await mod.auth.api.signUpEmail({
        body: {
          email: `days-${Date.now()}@example.test`,
          password: "test-password-123",
          name: "Days",
        },
        returnHeaders: true,
      });
      userId = response.user.id;
      cookie = headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");

      const tier = {
        overtimeTierHours: 2,
        overtimeFirstRate: "1.5x",
        overtimeAfterRate: "2x",
      };
      const [wwe, mallard, noRate] = await Promise.all([
        mod.prisma.client.create({
          data: {
            userId,
            name: "WWE (International)",
            dayRate: 525,
            perDiemTravel: 70,
            perDiemWork: 50,
            ...tier,
          },
        }),
        mod.prisma.client.create({
          data: {
            userId,
            name: "Mallard",
            dayRate: 450,
            perDiemTravel: 60,
            perDiemWork: 45,
            ...tier,
          },
        }),
        mod.prisma.client.create({ data: { userId, name: "No Rates Ltd" } }),
      ]);
      wweClientId = wwe.id;
      mallardClientId = mallard.id;
      noRateClientId = noRate.id;
    });

    after(async () => {
      if (userId) await mod.prisma.user.delete({ where: { id: userId } });
    });

    it("creates INV-2605 from its days at exactly £3,748.13", async () => {
      const res = await post(body());
      assert.equal(res.status, 201, await res.clone().text());
      dayInvoiceId = (await res.json()).id;

      const invoice = await stored(dayInvoiceId);
      assert.equal(Number(invoice.totalAmount), 3748.13);
      assert.deepEqual(
        invoice.items.map((i) => [i.description, i.quantity, Number(i.cost)]),
        [
          ["Dark days", 0, 0],
          ["Per Diems Travel Days", 4, 280],
          ["Per Diems Work Days", 2, 100],
          ["Travel Days", 4, 2100],
          ["Work Days", 2, 1050],
        ],
      );
      assert.deepEqual(
        invoice.overtimeEntries.map((e) => [
          e.date.toISOString().slice(0, 10),
          Number(e.hours),
          e.rateType,
        ]),
        [["2026-09-11", 2, "1.5x"]],
      );
      assert.equal(invoice.customExpenseEntries.length, 2);
      assert.deepEqual(
        invoice.days.map((d) => [d.date.toISOString().slice(0, 10), d.type]),
        inv2605Days.map((d) => [d.date, d.type]),
      );
      // The terms it was priced under are kept with it
      assert.deepEqual(invoice.terms, {
        dayRate: 525,
        perDiem: { work: 50, travel: 70 },
        overtimeTier: { tierHours: 2, firstRate: "1.5x", afterRate: "2x" },
        travelWork: { bill: "both", perDiem: "travel" },
      });
    });

    it("returns the days in date order when the invoice is fetched", async () => {
      requestHeaders = new Headers({ cookie });
      const res = await mod.invoiceRoute.GET(
        new NextRequest(`http://localhost/api/invoices/${dayInvoiceId}`),
        params(dayInvoiceId),
      );
      const invoice = await res.json();
      assert.deepEqual(
        invoice.days.map((d: { date: string }) => d.date.slice(0, 10)),
        inv2605Days.map((d) => d.date),
      );
    });

    it("re-prices on update, splitting new overtime by the tier", async () => {
      const days = inv2605Days.map((d) =>
        d.date === "2026-09-10" ? { ...d, overtimeHours: 3 } : d,
      );
      const res = await put(dayInvoiceId, body({ days }));
      assert.equal(res.status, 200, await res.clone().text());

      const invoice = await stored(dayInvoiceId);
      // +2h at 1.5x (£157.50) and 1h at 2x (£105.00) on the 10th
      assert.equal(Number(invoice.totalAmount), 3748.13 + 262.5);
      assert.equal(invoice.days.length, 6, "old day rows are replaced");
      assert.deepEqual(
        invoice.overtimeEntries.map((e) => [
          e.date.toISOString().slice(0, 10),
          Number(e.hours),
          e.rateType,
        ]),
        [
          ["2026-09-10", 2, "1.5x"],
          ["2026-09-10", 1, "2x"],
          ["2026-09-11", 2, "1.5x"],
        ],
      );
    });

    it("keeps the price it was made with after the client's rate changes", async () => {
      await put(dayInvoiceId, body());
      await mod.prisma.client.update({
        where: { id: wweClientId },
        data: { dayRate: 900 },
      });

      const res = await put(dayInvoiceId, body({ showName: "Renamed" }));
      assert.equal(res.status, 200);
      assert.equal(Number((await stored(dayInvoiceId)).totalAmount), 3748.13);

      await mod.prisma.client.update({
        where: { id: wweClientId },
        data: { dayRate: 525 },
      });
    });

    it("re-prices at the new client's terms when the client changes", async () => {
      const res = await put(dayInvoiceId, body({ clientId: mallardClientId }));
      assert.equal(res.status, 200);
      const invoice = await stored(dayInvoiceId);
      // 6 days at £450 (£2,700), per diems 4 × £60 + 2 × £45 (£330),
      // 2h at £45 × 1.5 (£135), expenses £60.63
      assert.equal(Number(invoice.totalAmount), 3225.63);
      assert.equal((invoice.terms as { dayRate: number }).dayRate, 450);
    });

    it("refuses an update without days", async () => {
      const res = await put(
        dayInvoiceId,
        body({
          days: undefined,
          items: [{ description: "Work Days", quantity: 9, unitPrice: 1 }],
        }),
      );
      assert.equal(res.status, 400);
      assert.equal(Number((await stored(dayInvoiceId)).totalAmount), 3225.63);
    });

    it("no longer creates count-based invoices", async () => {
      const before = await mod.prisma.invoice.count({ where: { userId } });
      const res = await post(
        body({
          days: undefined,
          items: [{ description: "Work Days", quantity: 2, unitPrice: 500 }],
        }),
      );
      assert.equal(res.status, 400);
      assert.equal(
        await mod.prisma.invoice.count({ where: { userId } }),
        before,
      );
    });

    describe("an old count-based invoice", () => {
      let legacyId: string;

      before(async () => {
        // Only the old form made these, so there's no route left to call
        const legacy = await mod.prisma.invoice.create({
          data: {
            userId,
            invoiceNumber: `LEGACY-${Date.now()}`,
            invoiceDate: new Date("2026-03-02"),
            showName: "Old Show",
            fullName: "Test Person",
            email: "days@example.test",
            addressLine1: "1 Test Street",
            city: "Glasgow",
            postalCode: "G1 1AA",
            country: "United Kingdom",
            iban: "GB00TEST0000000000000",
            swiftBic: "TESTGB2L",
            regularRate: 0,
            overtimeRate: 0,
            perDiemRate: 0,
            travelDayRate: 0,
            subtotalLabor: 0,
            subtotalPerDiem: 0,
            subtotalTravel: 0,
            totalAmount: 1000,
            items: {
              create: [
                {
                  description: "Work Days",
                  quantity: 2,
                  unitPrice: 500,
                  cost: 1000,
                },
              ],
            },
          },
        });
        legacyId = legacy.id;
      });

      const patch = (payload: object) => {
        requestHeaders = new Headers({ cookie });
        return mod.invoiceRoute.PATCH(
          new NextRequest(`http://localhost/api/invoices/${legacyId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
          params(legacyId),
        );
      };

      it("is never converted to days", async () => {
        const res = await put(legacyId, body());
        assert.equal(res.status, 400);
        assert.match((await res.json()).error, /corrected invoice/);
        const after = await stored(legacyId);
        assert.equal(after.terms, null);
        assert.equal(after.days.length, 0);
        assert.equal(Number(after.totalAmount), 1000);
        assert.equal(after.showName, "Old Show");
      });

      it("still takes a new status and notes", async () => {
        const res = await patch({ status: "paid", notes: "  PO 4471  " });
        assert.equal(res.status, 200);
        const after = await stored(legacyId);
        assert.equal(after.status, "paid");
        assert.equal(after.notes, "PO 4471");
        assert.equal(Number(after.totalAmount), 1000);
      });

      it("clears emptied notes, leaving the status alone", async () => {
        const res = await patch({ notes: "   " });
        assert.equal(res.status, 200);
        const after = await stored(legacyId);
        assert.equal(after.notes, null);
        assert.equal(after.status, "paid");
      });

      it("refuses an empty patch", async () => {
        assert.equal((await patch({})).status, 400);
      });
    });

    it("needs a client to price days", async () => {
      const res = await post(body({ clientId: undefined }));
      assert.equal(res.status, 400);
      assert.match((await res.json()).error, /Pick a client/);
    });

    it("needs the client to have a day rate", async () => {
      const res = await post(body({ clientId: noRateClientId }));
      assert.equal(res.status, 400);
      assert.match((await res.json()).error, /no day rate/);
    });

    it("explains days it can't bill", async () => {
      const res = await post(
        body({
          days: [{ date: "2026-09-08", type: "travel", overtimeHours: 2 }],
        }),
      );
      assert.equal(res.status, 400);
      assert.match((await res.json()).error, /only work days have overtime/);
    });
  },
);
