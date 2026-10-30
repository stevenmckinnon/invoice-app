/**
 * The year-end export only ever contains the caller's own invoices, only those
 * inside the tax year, and never drafts. Needs `TEST_DATABASE_URL` (see
 * invoice-tools.execute.test.ts); `getSession` is stubbed so no sign-in is
 * needed, which takes `--experimental-test-module-mocks` (`pnpm test` passes it).
 */
import { NextRequest } from "next/server";
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be set before anything pulls in db.ts, which reads it at module load
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

/** Who the stubbed session says is signed in; null is signed out */
let sessionUser: string | null = null;

const load = async () => {
  mock.module("next/headers", {
    exports: { headers: async () => new Headers() },
  });
  mock.module("@/lib/auth", {
    exports: {
      auth: {
        api: {
          getSession: async () =>
            sessionUser ? { user: { id: sessionUser } } : null,
        },
      },
    },
  });
  const [{ prisma }, route] = await Promise.all([
    import("@/lib/db"),
    import("@/app/api/invoices/export/route"),
  ]);
  return { prisma, route };
};

describe(
  "invoice export route",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    const userIds: string[] = [];
    let mine: string;
    let theirs: string;

    const make = (
      userId: string,
      invoiceNumber: string,
      invoiceDate: string,
      status: string,
      showName = "A show",
    ) =>
      mod.prisma.invoice.create({
        data: {
          userId,
          invoiceNumber,
          invoiceDate: new Date(`${invoiceDate}T00:00:00Z`),
          showName,
          fullName: "Test Freelancer",
          email: "test@example.test",
          addressLine1: "1 Test Street",
          city: "Glasgow",
          postalCode: "G1 1AA",
          country: "United Kingdom",
          iban: "GB00TEST00000000000000",
          swiftBic: "TESTGB2L",
          clientName: "Mallard",
          regularRate: 0,
          overtimeRate: 0,
          perDiemRate: 0,
          travelDayRate: 0,
          // Left at zero on purpose: day-based invoices do, so the export
          // must not read them
          subtotalLabor: 0,
          subtotalPerDiem: 0,
          subtotalTravel: 0,
          totalAmount: 1125,
          status,
          items: {
            create: [
              { description: "Work Days", quantity: 2, unitPrice: 500, cost: 1000 },
              { description: "Per Diems Work Days", quantity: 2, unitPrice: 50, cost: 100 },
            ],
          },
          customExpenseEntries: {
            create: [{ description: "Taxi", quantity: 1, unitPrice: 25, cost: 25 }],
          },
        },
      });

    const get = async (query = "") => {
      const res = await mod.route.GET(
        new NextRequest(`http://localhost/api/invoices/export${query}`),
      );
      return { res, body: await res.text() };
    };

    before(async () => {
      mod = await load();
      const tag = Date.now().toString(36);
      mine = (await mod.prisma.user.create({ data: { email: `exp-mine-${tag}@example.test` } })).id;
      theirs = (await mod.prisma.user.create({ data: { email: `exp-theirs-${tag}@example.test` } })).id;
      userIds.push(mine, theirs);

      await make(mine, "E-1", "2026-04-05", "paid", "Last day of 2025/26");
      await make(mine, "E-2", "2026-04-06", "sent", "First day of 2026/27");
      await make(mine, "E-3", "2027-04-05", "overdue", "Last day of 2026/27");
      await make(mine, "E-4", "2027-04-06", "paid", "First day of 2027/28");
      await make(mine, "E-5", "2026-09-01", "draft", "Not sent yet");
      await make(theirs, "E-6", "2026-09-01", "paid", "Someone else's");
    });

    after(async () => {
      mock.reset();
      await mod.prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await mod.prisma.$disconnect();
    });

    it("refuses a request with no session", async () => {
      sessionUser = null;
      const { res } = await get("?year=2026");
      assert.equal(res.status, 401);
    });

    it("exports the tax year, not a day either side, and no drafts", async () => {
      sessionUser = mine;
      const { res, body } = await get("?year=2026");
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "text/csv; charset=utf-8");
      assert.match(
        res.headers.get("content-disposition") ?? "",
        /filename="caley-invoices-2026-27\.csv"/,
      );
      const rows = body.replace("﻿", "").trim().split("\r\n").slice(1);
      assert.deepEqual(
        rows.map((r) => r.split(",")[0]),
        ["E-2", "E-3"],
      );
    });

    it("adds the expenses and agrees with the stored total", async () => {
      sessionUser = mine;
      const { body } = await get("?year=2026");
      const row = body.replace("﻿", "").trim().split("\r\n")[1]!.split(",");
      // Labour, per diems, expenses, total: from the line items, not the
      // zeroed subtotal columns, and together exactly the stored total
      assert.deepEqual(row.slice(6), ["1000.00", "100.00", "25.00", "1125.00"]);
    });

    it("never includes another user's invoices", async () => {
      sessionUser = mine;
      const { body } = await get("?year=2026");
      assert.doesNotMatch(body, /E-6|Someone else/);
      sessionUser = theirs;
      const other = await get("?year=2026");
      assert.match(other.body, /E-6/);
      assert.doesNotMatch(other.body, /E-2|E-3/);
    });

    it("rejects a year that isn't one", async () => {
      sessionUser = mine;
      for (const year of ["abc", "20x6", "1850", "2026.5", ""]) {
        const { res } = await get(`?year=${year}`);
        assert.equal(res.status, 400, `year=${year}`);
      }
    });
  },
);
