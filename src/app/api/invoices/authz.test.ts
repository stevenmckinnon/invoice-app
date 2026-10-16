/**
 * Invoice routes must only ever act on the caller's own invoices.
 *
 * Regression tests for two holes: the PDF route served any invoice (IBAN and
 * date of birth included) to anyone with its id, and PUT deleted the line
 * items, overtime and expenses of whatever invoice it was pointed at before
 * checking who owned it.
 *
 * These run the real route handlers against real better-auth sessions, so
 * they need a database — set `TEST_DATABASE_URL` (see
 * invoice-tools.execute.test.ts). Only `next/headers` is mocked, since there
 * is no request scope outside Next; that needs
 * `--experimental-test-module-mocks`, which `pnpm test` passes.
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
  const [
    { prisma },
    { auth },
    { dayBillingWrites },
    { termsFromClient },
    pdfRoute,
    invoiceRoute,
    invoicesRoute,
    deleteAccountRoute,
  ] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/auth"),
    import("@/lib/day-invoice"),
    import("@/lib/billing"),
    import("@/app/api/invoices/[id]/pdf/route"),
    import("@/app/api/invoices/[id]/route"),
    import("@/app/api/invoices/route"),
    import("@/app/api/account/delete/route"),
  ]);
  return {
    prisma,
    auth,
    dayBillingWrites,
    termsFromClient,
    pdfRoute,
    invoiceRoute,
    invoicesRoute,
    deleteAccountRoute,
  };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const invoiceBody = {
  invoiceNumber: "ATTACK-1",
  invoiceDate: "2026-08-14",
  showName: "Overwritten",
  fullName: "Attacker",
  email: "attacker@example.test",
  addressLine1: "1 Elsewhere",
  city: "Nowhere",
  postalCode: "X1 1XX",
  country: "United Kingdom",
  iban: "GB00ATTACK0000000000000",
  swiftBic: "ATTKGB2L",
  days: [{ date: "2026-08-14", type: "work" }],
  customExpenseEntries: [],
};

describe(
  "invoice route authorization",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    const userIds: string[] = [];
    let victimCookie: string;
    let attackerCookie: string;
    let victimInvoiceId: string;
    let victimClientId: string;

    /** Signs a user up through better-auth and returns their cookie header */
    const signUp = async (label: string) => {
      const email = `authz-${label}-${Date.now()}@example.test`;
      const { headers, response } = await mod.auth.api.signUpEmail({
        body: { email, password: "test-password-123", name: label },
        returnHeaders: true,
      });
      userIds.push(response.user.id);
      const cookie = headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
      return { userId: response.user.id, cookie };
    };

    const childCounts = async (invoiceId: string) => {
      const [items, overtime, expenses] = await Promise.all([
        mod.prisma.invoiceLineItem.count({ where: { invoiceId } }),
        mod.prisma.overtimeEntry.count({ where: { invoiceId } }),
        mod.prisma.customExpenseEntry.count({ where: { invoiceId } }),
      ]);
      return { items, overtime, expenses };
    };

    const getPdf = (cookie?: string) => {
      requestHeaders = new Headers(cookie ? { cookie } : {});
      return mod.pdfRoute.GET(
        new NextRequest(`http://localhost/api/invoices/${victimInvoiceId}/pdf`),
        params(victimInvoiceId),
      );
    };

    const putInvoice = (cookie: string, body: object = invoiceBody) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.PUT(
        new NextRequest(`http://localhost/api/invoices/${victimInvoiceId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
        params(victimInvoiceId),
      );
    };

    const postInvoice = (cookie: string, body: object) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoicesRoute.POST(
        new NextRequest("http://localhost/api/invoices", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    };

    const deleteAccount = (cookie: string, password: string) => {
      requestHeaders = new Headers({ cookie });
      return mod.deleteAccountRoute.POST(
        new NextRequest("http://localhost/api/account/delete", {
          method: "POST",
          body: JSON.stringify({ password, confirmation: "DELETE MY ACCOUNT" }),
        }),
      );
    };

    before(async () => {
      mod = await load();
      const victim = await signUp("victim");
      const attacker = await signUp("attacker");
      victimCookie = victim.cookie;
      attackerCookie = attacker.cookie;

      const client = await mod.prisma.client.create({
        data: { userId: victim.userId, name: "Victim's Client", dayRate: 500 },
      });
      victimClientId = client.id;

      // Priced at the client's terms but not linked to it yet, so the owner
      // attaching it later is a real change
      const invoice = await mod.prisma.invoice.create({
        data: {
          userId: victim.userId,
          invoiceNumber: `VICTIM-${Date.now()}`,
          invoiceDate: new Date("2026-08-14"),
          showName: "Victim Show",
          fullName: "Victim",
          email: "victim@example.test",
          addressLine1: "1 Victim Street",
          city: "Glasgow",
          postalCode: "G1 1AA",
          country: "United Kingdom",
          iban: "GB00VICTIM000000000000",
          swiftBic: "VICTGB2L",
          dateOfBirth: new Date("1990-01-01"),
          regularRate: 0,
          overtimeRate: 0,
          perDiemRate: 0,
          travelDayRate: 0,
          ...mod.dayBillingWrites(
            [{ date: "2026-08-14", type: "work", overtimeHours: 2 }],
            mod.termsFromClient(client)!,
            [{ description: "Parking", quantity: 1, unitPrice: 25 }],
          ),
        },
      });
      victimInvoiceId = invoice.id;
    });

    after(async () => {
      mock.reset();
      if (!mod) return;
      // Invoices, sessions and children cascade from the user
      await mod.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    });

    it("serves the owner their PDF", async () => {
      // Proves the cookies work, so the refusals below mean something
      const res = await getPdf(victimCookie);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/pdf");
    });

    it("refuses a PDF to a request with no session", async () => {
      const res = await getPdf();
      assert.equal(res.status, 401);
      assert.notEqual(res.headers.get("content-type"), "application/pdf");
    });

    it("refuses a PDF to another user's session", async () => {
      const res = await getPdf(attackerCookie);
      assert.equal(res.status, 404);
      assert.notEqual(res.headers.get("content-type"), "application/pdf");
    });

    it("leaves the owner's invoice and its children alone on a non-owner PUT", async () => {
      const before = await childCounts(victimInvoiceId);
      assert.deepEqual(before, { items: 5, overtime: 1, expenses: 1 });

      const res = await putInvoice(attackerCookie);
      assert.equal(res.status, 404);

      assert.deepEqual(await childCounts(victimInvoiceId), before);
      const invoice = await mod.prisma.invoice.findUniqueOrThrow({
        where: { id: victimInvoiceId },
      });
      assert.equal(invoice.showName, "Victim Show");
      assert.equal(invoice.iban, "GB00VICTIM000000000000");
    });

    it("still lets the owner replace their own invoice's children", async () => {
      const res = await putInvoice(victimCookie);
      assert.equal(res.status, 200);
      assert.deepEqual(await childCounts(victimInvoiceId), {
        items: 5,
        overtime: 0,
        expenses: 0,
      });
    });

    it("refuses to create an invoice against another user's client", async () => {
      const res = await postInvoice(attackerCookie, {
        ...invoiceBody,
        invoiceNumber: `ATTACK-POST-${Date.now()}`,
        clientId: victimClientId,
      });
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "Client not found" });
      assert.equal(
        await mod.prisma.invoice.count({ where: { clientId: victimClientId } }),
        0,
      );
    });

    it("refuses to move an invoice onto another user's client", async () => {
      const attacker = await signUp("client-mover");
      const ownClient = await mod.prisma.client.create({
        data: { userId: attacker.userId, name: "Own Client", dayRate: 100 },
      });
      const ownBody = {
        ...invoiceBody,
        invoiceNumber: `ATTACK-OWN-${Date.now()}`,
        clientId: ownClient.id,
      };
      const own = await postInvoice(attacker.cookie, ownBody);
      assert.equal(own.status, 201);
      const { id } = await own.json();

      requestHeaders = new Headers({ cookie: attacker.cookie });
      const res = await mod.invoiceRoute.PUT(
        new NextRequest(`http://localhost/api/invoices/${id}`, {
          method: "PUT",
          body: JSON.stringify({ ...ownBody, clientId: victimClientId }),
        }),
        params(id),
      );
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: "Client not found" });
      const invoice = await mod.prisma.invoice.findUniqueOrThrow({
        where: { id },
      });
      assert.equal(invoice.clientId, ownClient.id);
    });

    it("lets the owner attach their own client", async () => {
      const res = await putInvoice(victimCookie, {
        ...invoiceBody,
        clientId: victimClientId,
      });
      assert.equal(res.status, 200);
    });

    it("deletes an account only with the right password", async () => {
      // The route verified with bcrypt against better-auth's scrypt hashes,
      // so the right password was always rejected
      const user = await signUp("deleter");

      const wrong = await deleteAccount(user.cookie, "not-the-password");
      assert.equal(wrong.status, 401);
      assert.ok(
        await mod.prisma.user.findUnique({ where: { id: user.userId } }),
      );

      const right = await deleteAccount(user.cookie, "test-password-123");
      assert.equal(right.status, 200);
      assert.equal(
        await mod.prisma.user.findUnique({ where: { id: user.userId } }),
        null,
      );
    });
  },
);
