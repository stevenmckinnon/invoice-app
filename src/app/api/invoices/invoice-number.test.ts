/**
 * Invoice numbers are unique per user, not across the whole database.
 *
 * Regression tests: with a global unique index, a second user saving INV-2601
 * failed with a Prisma error, which also revealed that the number existed in
 * someone else's account, and `generateNextInvoiceNumber` skipped numbers
 * other users had taken.
 *
 * Runs the real route handlers against real better-auth sessions, so it needs
 * `TEST_DATABASE_URL` (see authz.test.ts). Only `next/headers` is mocked.
 */
import { NextRequest } from "next/server";
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be set before anything pulls in db.ts, which reads it at module load
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

/** What the mocked `headers()` hands the route — set per request */
let requestHeaders = new Headers();

const load = async () => {
  mock.module("next/headers", {
    namedExports: { headers: async () => requestHeaders },
  });
  const [{ prisma }, { auth }, invoicesRoute, invoiceRoute, numbering] =
    await Promise.all([
      import("@/lib/db"),
      import("@/lib/auth"),
      import("@/app/api/invoices/route"),
      import("@/app/api/invoices/[id]/route"),
      import("@/lib/invoice-number"),
    ]);
  return { prisma, auth, invoicesRoute, invoiceRoute, numbering };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

// Unique to this run, so leftovers from a crashed run can't collide
const run = Date.now().toString().slice(-6);
const shared = `SHARE-${run}-01`;

const invoiceBody = (invoiceNumber: string, clientId: string) => ({
  invoiceNumber,
  invoiceDate: "2026-08-14",
  showName: "Show",
  fullName: "Freelancer",
  email: "freelancer@example.test",
  addressLine1: "1 Street",
  city: "Glasgow",
  postalCode: "G1 1AA",
  country: "United Kingdom",
  iban: "GB00TEST0000000000000",
  swiftBic: "TESTGB2L",
  clientId,
  days: [{ date: "2026-08-14", type: "work" }],
  customExpenseEntries: [],
});

describe(
  "invoice numbers are unique per user",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    const userIds: string[] = [];
    let alice: { userId: string; cookie: string };
    let bob: { userId: string; cookie: string };
    /** Each user's client, by their cookie: days are priced at its rate */
    const clientIds = new Map<string, string>();

    const signUp = async (label: string) => {
      const email = `numbering-${label}-${Date.now()}@example.test`;
      const { headers, response } = await mod.auth.api.signUpEmail({
        body: { email, password: "test-password-123", name: label },
        returnHeaders: true,
      });
      userIds.push(response.user.id);
      const cookie = headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      const client = await mod.prisma.client.create({
        data: { userId: response.user.id, name: label, dayRate: 500 },
      });
      clientIds.set(cookie, client.id);
      return { userId: response.user.id, cookie };
    };

    const post = (cookie: string, invoiceNumber: string) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoicesRoute.POST(
        new NextRequest("http://localhost/api/invoices", {
          method: "POST",
          body: JSON.stringify(
            invoiceBody(invoiceNumber, clientIds.get(cookie)!),
          ),
        }),
      );
    };

    const put = (cookie: string, id: string, invoiceNumber: string) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.PUT(
        new NextRequest(`http://localhost/api/invoices/${id}`, {
          method: "PUT",
          body: JSON.stringify(
            invoiceBody(invoiceNumber, clientIds.get(cookie)!),
          ),
        }),
        params(id),
      );
    };

    before(async () => {
      mod = await load();
      alice = await signUp("alice");
      bob = await signUp("bob");
    });

    after(async () => {
      mock.reset();
      if (!mod) return;
      // Invoices and children cascade from the user
      await mod.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    it("lets two users each have the same number", async () => {
      assert.equal((await post(alice.cookie, shared)).status, 201);
      assert.equal((await post(bob.cookie, shared)).status, 201);

      const owners = await mod.prisma.invoice.findMany({
        where: { invoiceNumber: shared },
        select: { userId: true },
      });
      assert.deepEqual(
        owners.map((o) => o.userId).sort(),
        [alice.userId, bob.userId].sort(),
      );
    });

    it("refuses a user's second invoice with a number they've used", async () => {
      const res = await post(alice.cookie, shared);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), {
        error: `You already have an invoice numbered ${shared}.`,
      });
      assert.equal(
        await mod.prisma.invoice.count({
          where: { userId: alice.userId, invoiceNumber: shared },
        }),
        1,
      );
    });

    it("refuses renaming an invoice to a number the user already has", async () => {
      const other = `SHARE-${run}-02`;
      const created = await post(alice.cookie, other);
      const { id } = await created.json();

      const res = await put(alice.cookie, id, shared);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), {
        error: `You already have an invoice numbered ${shared}.`,
      });

      // The failed transaction must leave the invoice, its days and its
      // lines intact (a day invoice always has the five standard lines)
      const invoice = await mod.prisma.invoice.findUniqueOrThrow({
        where: { id },
        include: { items: true, days: true },
      });
      assert.equal(invoice.invoiceNumber, other);
      assert.equal(invoice.days.length, 1);
      assert.equal(invoice.items.length, 5);
    });

    it("lets a user rename an invoice to a number only someone else has", async () => {
      const bobOnly = `BOB-${run}-01`;
      assert.equal((await post(bob.cookie, bobOnly)).status, 201);

      const created = await post(alice.cookie, `ALICE-${run}-01`);
      const { id } = await created.json();
      assert.equal((await put(alice.cookie, id, bobOnly)).status, 200);
    });

    it("numbers from the user's own invoices, ignoring other accounts", async () => {
      const carol = await signUp("carol");
      const dave = await signUp("dave");
      assert.equal((await post(carol.cookie, `NUM-${run}-01`)).status, 201);
      // Dave already holds the number Carol would get next
      assert.equal((await post(dave.cookie, `NUM-${run}-02`)).status, 201);

      assert.equal(
        await mod.numbering.generateNextInvoiceNumber(carol.userId),
        `NUM-${run}-02`,
      );
    });
  },
);
