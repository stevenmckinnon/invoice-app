/**
 * Once an invoice has gone out it's a record: billing is locked, it can't be
 * deleted, and a mistake is fixed by a corrected invoice that voids it. End to
 * end through the real route handlers.
 *
 * Needs a database, like authz.test.ts: set `TEST_DATABASE_URL`.
 */
import { NextRequest } from "next/server";
import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";

import {
  canChangeStatus,
  canCorrectInvoice,
  canDeleteInvoice,
  isBillingLocked,
  statusesThatCanBecome,
} from "@/lib/invoice-lifecycle";

describe("invoice lifecycle rules", () => {
  it("locks billing and deletion on everything but a draft", () => {
    for (const status of ["sent", "paid", "overdue", "void"]) {
      assert.equal(isBillingLocked(status), true, status);
      assert.equal(canDeleteInvoice(status), false, status);
      assert.equal(canCorrectInvoice(status), true, status);
    }
    assert.equal(isBillingLocked("draft"), false);
    assert.equal(canDeleteInvoice("draft"), true);
    assert.equal(canCorrectInvoice("draft"), false);
  });

  it("keeps a void invoice void", () => {
    for (const to of ["draft", "sent", "paid", "overdue"]) {
      assert.equal(canChangeStatus("void", to), false, to);
    }
    assert.equal(canChangeStatus("void", "void"), true);
  });

  it("voids only what has gone out", () => {
    assert.equal(canChangeStatus("draft", "void"), false);
    for (const from of ["sent", "paid", "overdue"]) {
      assert.equal(canChangeStatus(from, "void"), true, from);
    }
  });

  it("lets a mistaken sent go back to draft, but never paid", () => {
    assert.equal(canChangeStatus("sent", "draft"), true);
    assert.equal(canChangeStatus("overdue", "draft"), true);
    assert.equal(canChangeStatus("paid", "draft"), false);
    assert.equal(canChangeStatus("paid", "sent"), true);
  });

  it("leaves void out of a bulk change", () => {
    assert.deepEqual(statusesThatCanBecome("paid"), [
      "draft",
      "sent",
      "paid",
      "overdue",
    ]);
    assert.deepEqual(statusesThatCanBecome("draft"), [
      "draft",
      "sent",
      "overdue",
    ]);
  });
});

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

let requestHeaders = new Headers();

const load = async () => {
  mock.module("next/headers", {
    namedExports: { headers: async () => requestHeaders },
  });
  const [{ prisma }, { auth }, invoicesRoute, invoiceRoute, pdfRoute, exportRoute] =
    await Promise.all([
      import("@/lib/db"),
      import("@/lib/auth"),
      import("@/app/api/invoices/route"),
      import("@/app/api/invoices/[id]/route"),
      import("@/app/api/invoices/[id]/pdf/route"),
      import("@/app/api/invoices/export/route"),
    ]);
  return { prisma, auth, invoicesRoute, invoiceRoute, pdfRoute, exportRoute };
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const url = (path: string) => `http://localhost/api/invoices${path}`;

describe(
  "issued invoices through the routes",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    let userId: string;
    let cookie: string;
    let otherCookie: string;
    let otherUserId: string;
    let clientId: string;

    const body = (overrides: object = {}) => ({
      invoiceNumber: `LIFE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      invoiceDate: "2026-09-12",
      showName: "Triplemania 34",
      fullName: "Test Person",
      email: "life@example.test",
      addressLine1: "1 Test Street",
      city: "Glasgow",
      postalCode: "G1 1AA",
      country: "United Kingdom",
      iban: "GB00TEST0000000000000",
      swiftBic: "TESTGB2L",
      clientId,
      days: [{ date: "2026-09-10", type: "work" }],
      customExpenseEntries: [],
      ...overrides,
    });

    const post = (payload: object, as = cookie) => {
      requestHeaders = new Headers({ cookie: as });
      return mod.invoicesRoute.POST(
        new NextRequest(url(""), {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
    };
    const put = (id: string, payload: object) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.PUT(
        new NextRequest(url(`/${id}`), {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
        params(id),
      );
    };
    const patch = (id: string, payload: object) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.PATCH(
        new NextRequest(url(`/${id}`), {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
        params(id),
      );
    };
    const remove = (id: string) => {
      requestHeaders = new Headers({ cookie });
      return mod.invoiceRoute.DELETE(
        new NextRequest(url(`/${id}`), { method: "DELETE" }),
        params(id),
      );
    };
    const stored = (id: string) =>
      mod.prisma.invoice.findUnique({ where: { id } });

    /** A fresh invoice at the given status, set directly so each test stands alone */
    const make = async (status: string) => {
      const res = await post(body());
      assert.equal(res.status, 201);
      const { id } = await res.json();
      await mod.prisma.invoice.update({ where: { id }, data: { status } });
      return id as string;
    };

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
      const me = await signUp("life");
      const other = await signUp("life-other");
      userId = me.id;
      cookie = me.cookie;
      otherCookie = other.cookie;
      otherUserId = other.id;
      const client = await mod.prisma.client.create({
        data: {
          userId,
          name: "Life Client",
          dayRate: 500,
          perDiemWork: 0,
          perDiemTravel: 0,
        },
      });
      clientId = client.id;
    });

    after(async () => {
      await mod.prisma.user.deleteMany({
        where: { email: { contains: "@example.test", startsWith: "life" } },
      });
      await mod.prisma.$disconnect();
    });

    for (const status of ["sent", "paid", "overdue", "void"]) {
      it(`refuses to change the billing of a ${status} invoice`, async () => {
        const id = await make(status);
        const before = await stored(id);
        const res = await put(id, body({ days: [] , showName: "Rewritten" }));
        assert.equal(res.status, 409);
        const after = await stored(id);
        assert.equal(after?.showName, before?.showName);
        assert.equal(Number(after?.totalAmount), Number(before?.totalAmount));
      });

      it(`refuses to delete a ${status} invoice`, async () => {
        const id = await make(status);
        assert.equal((await remove(id)).status, 409);
        assert.ok(await stored(id));
      });
    }

    it("still edits and deletes a draft", async () => {
      const id = await make("draft");
      const res = await put(id, body({ showName: "Renamed" }));
      assert.equal(res.status, 200);
      assert.equal((await stored(id))?.showName, "Renamed");
      assert.equal((await remove(id)).status, 200);
      assert.equal(await stored(id), null);
    });

    it("takes notes on an issued invoice", async () => {
      const id = await make("paid");
      assert.equal((await patch(id, { notes: "PO 4471" })).status, 200);
      assert.equal((await stored(id))?.notes, "PO 4471");
    });

    it("refuses paid back to draft, and any way out of void", async () => {
      const paid = await make("paid");
      assert.equal((await patch(paid, { status: "draft" })).status, 409);
      assert.equal((await stored(paid))?.status, "paid");

      const voided = await make("void");
      assert.equal((await patch(voided, { status: "paid" })).status, 409);
      assert.equal((await stored(voided))?.status, "void");
    });

    it("voids a sent invoice but not a draft", async () => {
      const sent = await make("sent");
      assert.equal((await patch(sent, { status: "void" })).status, 200);
      assert.equal((await stored(sent))?.status, "void");

      const draft = await make("draft");
      assert.equal((await patch(draft, { status: "void" })).status, 409);
    });

    it("skips voided invoices in a bulk change", async () => {
      const voided = await make("void");
      const sent = await make("sent");
      requestHeaders = new Headers({ cookie });
      const res = await mod.invoicesRoute.PATCH(
        new NextRequest(url(""), {
          method: "PATCH",
          body: JSON.stringify({ ids: [voided, sent], status: "paid" }),
        }),
      );
      assert.equal((await res.json()).count, 1);
      assert.equal((await stored(voided))?.status, "void");
      assert.equal((await stored(sent))?.status, "paid");
    });

    describe("a corrected invoice", () => {
      it("voids the original and links back to it, as a draft", async () => {
        const original = await make("paid");
        const res = await post(body({ correctsId: original, status: "paid" }));
        assert.equal(res.status, 201);
        const { id } = await res.json();
        assert.equal((await stored(original))?.status, "void");
        const correction = await stored(id);
        assert.equal(correction?.correctsId, original);
        assert.equal(correction?.status, "draft");
      });

      it("keeps the original's rates after the client's go up", async () => {
        const client = await mod.prisma.client.create({
          data: {
            userId,
            name: "Rising Rates",
            dayRate: 500,
            perDiemWork: 0,
            perDiemTravel: 0,
          },
        });
        const made = await post(body({ clientId: client.id }));
        const { id: original } = await made.json();
        await patch(original, { status: "sent" });
        await mod.prisma.client.update({
          where: { id: client.id },
          data: { dayRate: 900 },
        });
        const res = await post(
          body({ clientId: client.id, correctsId: original }),
        );
        const { id } = await res.json();
        assert.equal(Number((await stored(id))?.totalAmount), 500);
      });

      it("leaves the original alone if the correction fails", async () => {
        const original = await make("sent");
        const taken = (await stored(original))?.invoiceNumber;
        const res = await post(
          body({ correctsId: original, invoiceNumber: taken }),
        );
        assert.equal(res.status, 400);
        assert.equal((await stored(original))?.status, "sent");
      });

      it("refuses to correct a draft", async () => {
        const draft = await make("draft");
        const res = await post(body({ correctsId: draft }));
        assert.equal(res.status, 409);
      });

      it("refuses a second correction while the first stands", async () => {
        const original = await make("sent");
        assert.equal(
          (await post(body({ correctsId: original }))).status,
          201,
        );
        assert.equal(
          (await post(body({ correctsId: original }))).status,
          409,
        );
      });

      it("can follow a correction that was abandoned", async () => {
        const original = await make("sent");
        const first = await post(body({ correctsId: original }));
        const { id } = await first.json();
        assert.equal((await remove(id)).status, 200);
        assert.equal((await stored(original))?.status, "void");
        assert.equal(
          (await post(body({ correctsId: original }))).status,
          201,
        );
      });

      it("can't reach another user's invoice", async () => {
        const original = await make("sent");
        const theirs = await mod.prisma.client.create({
          data: { userId: otherUserId, name: "Theirs", dayRate: 500 },
        });
        const res = await post(
          body({ correctsId: original, clientId: theirs.id }),
          otherCookie,
        );
        assert.equal(res.status, 404);
        assert.equal((await stored(original))?.status, "sent");
      });
    });

    it("gives a void invoice no PDF and leaves it out of the export", async () => {
      const voided = await make("void");
      const invoice = await stored(voided);
      requestHeaders = new Headers({ cookie });
      const pdf = await mod.pdfRoute.GET(
        new NextRequest(url(`/${voided}/pdf`)),
        params(voided),
      );
      assert.equal(pdf.status, 409);

      requestHeaders = new Headers({ cookie });
      const csv = await mod.exportRoute.GET(
        new NextRequest(url("/export?year=2026")),
      );
      assert.equal((await csv.text()).includes(invoice!.invoiceNumber), false);
    });
  },
);
