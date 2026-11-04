/**
 * Pencils through the real route handlers: yours only, released 1sts move
 * their 2nds up, and confirming one links it to the invoice it became.
 *
 * Needs a database, like lifecycle.test.ts: set `TEST_DATABASE_URL`.
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
  const [{ prisma }, { auth }, holdsRoute, holdRoute, invoicesRoute, invoiceRoute] =
    await Promise.all([
      import("@/lib/db"),
      import("@/lib/auth"),
      import("@/app/api/holds/route"),
      import("@/app/api/holds/[id]/route"),
      import("@/app/api/invoices/route"),
      import("@/app/api/invoices/[id]/route"),
    ]);
  return { prisma, auth, holdsRoute, holdRoute, invoicesRoute, invoiceRoute };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe(
  "pencils through the routes",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    let cookie: string;
    let otherCookie: string;
    let clientId: string;
    let otherClientId: string;

    const as = (who: string) => {
      requestHeaders = new Headers({ cookie: who });
    };
    const json = (url: string, method: string, body?: object) =>
      new NextRequest(`http://localhost${url}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
    const pencil = async (body: object, who = cookie) => {
      as(who);
      return mod.holdsRoute.POST(json("/api/holds", "POST", body));
    };
    const release = (id: string, who = cookie) => {
      as(who);
      return mod.holdRoute.DELETE(json(`/api/holds/${id}`, "DELETE"), params(id));
    };
    const stored = (id: string) => mod.prisma.hold.findUnique({ where: { id } });

    const signUp = async (name: string) => {
      const { headers, response } = await mod.auth.api.signUpEmail({
        body: {
          email: `${name}-${Date.now()}@example.test`,
          password: "test-password-123",
          name,
        },
        returnHeaders: true,
      });
      return {
        id: response.user.id,
        cookie: headers
          .getSetCookie()
          .map((c) => c.split(";")[0])
          .join("; "),
      };
    };

    before(async () => {
      mod = await load();
      const me = await signUp("pencil");
      const other = await signUp("pencil-other");
      cookie = me.cookie;
      otherCookie = other.cookie;
      clientId = (
        await mod.prisma.client.create({
          data: { userId: me.id, name: "WWE", dayRate: 500 },
        })
      ).id;
      otherClientId = (
        await mod.prisma.client.create({
          data: { userId: other.id, name: "Theirs", dayRate: 500 },
        })
      ).id;
    });

    after(async () => {
      await mod.prisma.user.deleteMany({
        where: { email: { contains: "@example.test", startsWith: "pencil" } },
      });
      await mod.prisma.$disconnect();
    });

    it("stores dates sorted and once each", async () => {
      const res = await pencil({
        clientId,
        showName: "Triplemania 35",
        dates: ["2026-12-11", "2026-12-10", "2026-12-11"],
        rank: 1,
      });
      assert.equal(res.status, 201);
      const { id } = await res.json();
      assert.deepEqual((await stored(id))?.dates, ["2026-12-10", "2026-12-11"]);
    });

    it("won't pencil a job on someone else's client", async () => {
      const res = await pencil({
        clientId: otherClientId,
        showName: "Nope",
        dates: ["2026-12-10"],
        rank: 1,
      });
      assert.equal(res.status, 400);
    });

    it("keeps other people's pencils out of reach", async () => {
      const { id } = await (
        await pencil({ clientId, showName: "Mine", dates: ["2026-12-01"], rank: 1 })
      ).json();
      assert.equal((await release(id, otherCookie)).status, 404);
      assert.ok(await stored(id));
      as(otherCookie);
      const theirs = await (await mod.holdsRoute.GET()).json();
      assert.equal(theirs.some((h: { id: string }) => h.id === id), false);
    });

    it("moves the 2nd up when the 1st on its dates is released", async () => {
      const first = await (
        await pencil({ clientId, showName: "First", dates: ["2027-01-10", "2027-01-11"], rank: 1 })
      ).json();
      const second = await (
        await pencil({ clientId, showName: "Second", dates: ["2027-01-11"], rank: 2 })
      ).json();
      const res = await release(first.id);
      assert.deepEqual((await res.json()).promoted, [second.id]);
      assert.equal(await stored(first.id), null);
      assert.equal((await stored(second.id))?.rank, 1);
    });

    it("links a pencil to the invoice it becomes, and back when that draft goes", async () => {
      const { id: holdId } = await (
        await pencil({ clientId, showName: "Raw Glasgow", dates: ["2026-12-12"], rank: 1 })
      ).json();
      const invoice = {
        invoiceNumber: `PEN-${Date.now()}`,
        invoiceDate: "2026-12-13",
        showName: "Raw Glasgow",
        fullName: "Test Person",
        email: "pencil@example.test",
        addressLine1: "1 Test Street",
        city: "Glasgow",
        postalCode: "G1 1AA",
        country: "United Kingdom",
        sortCode: "12-34-56",
        accountNumber: "12345678",
        clientId,
        days: [{ date: "2026-12-12", type: "work" }],
        customExpenseEntries: [],
        holdId,
      };
      as(cookie);
      const created = await mod.invoicesRoute.POST(json("/api/invoices", "POST", invoice));
      assert.equal(created.status, 201);
      const { id: invoiceId } = await created.json();
      assert.equal((await stored(holdId))?.invoiceId, invoiceId);

      // Can't confirm it twice
      as(cookie);
      const again = await mod.invoicesRoute.POST(
        json("/api/invoices", "POST", { ...invoice, invoiceNumber: `${invoice.invoiceNumber}-2` }),
      );
      assert.equal(again.status, 409);

      // A confirmed job's dates belong to its invoice
      as(cookie);
      const edit = await mod.holdRoute.PATCH(
        json(`/api/holds/${holdId}`, "PATCH", { dates: ["2026-12-20"] }),
        params(holdId),
      );
      assert.equal(edit.status, 409);

      // Deleting the draft makes it a pencil again
      as(cookie);
      await mod.invoiceRoute.DELETE(json(`/api/invoices/${invoiceId}`, "DELETE"), params(invoiceId));
      assert.equal((await stored(holdId))?.invoiceId, null);
    });
  },
);
