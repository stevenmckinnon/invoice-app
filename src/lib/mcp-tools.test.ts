/**
 * The MCP connector: tools only ever see the user the token was issued to, and
 * the endpoint refuses anything without a valid token.
 *
 * Needs a scratch database like invoice-tools.execute.test.ts: set
 * `TEST_DATABASE_URL` (the suite skips without it). The token-less cases don't
 * touch the database but live here so the connector is covered in one place.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be set before anything pulls in db.ts, which reads it at module load
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

const load = async () => {
  const [{ createMcpHandler }, { createCaleyMcpServer }, { prisma }] =
    await Promise.all([
      import("@modelcontextprotocol/server"),
      import("@/lib/mcp-tools"),
      import("@/lib/db"),
    ]);
  return { createMcpHandler, createCaleyMcpServer, prisma };
};

/** One JSON-RPC call to the tools, as `userId`, the way a connector sends it */
const callTool = async (
  mod: Awaited<ReturnType<typeof load>>,
  userId: string,
  name: string,
  args: Record<string, unknown>,
  scopes: string[] = ["invoices:read"],
) => {
  const handler = mod.createMcpHandler(() =>
    mod.createCaleyMcpServer(userId, scopes),
  );
  const response = await handler.fetch(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    }),
  );
  const raw = await response.text();
  const json = raw.startsWith("event:")
    ? raw.split("data: ")[1]!.split("\n")[0]!
    : raw;
  const { result } = JSON.parse(json) as {
    result: { content: Array<{ text: string }>; isError?: boolean };
  };
  return {
    isError: result.isError === true,
    text: result.content[0]!.text,
  };
};

describe("MCP endpoint without a token", () => {
  const post = async (headers: Record<string, string> = {}) => {
    const { POST } = await import("@/app/api/mcp/route");
    return POST(
      new Request("http://localhost:3000/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
    );
  };

  it("answers 401 and says where to authorize", async () => {
    const response = await post();
    assert.equal(response.status, 401);
    assert.match(
      response.headers.get("www-authenticate") ?? "",
      /resource_metadata="[^"]*\/\.well-known\/oauth-protected-resource/,
    );
  });

  it("answers 401 for a token it didn't issue", async () => {
    const response = await post({ authorization: "Bearer abc.def.ghi" });
    assert.equal(response.status, 401);
  });
});

describe("protected resource metadata", () => {
  it("names the endpoint the tokens are for, and the scope", async () => {
    const [{ GET }, { MCP_RESOURCE, authIssuer }] = await Promise.all([
      import("@/app/.well-known/oauth-protected-resource/route"),
      import("@/lib/auth"),
    ]);
    const metadata = (await GET().json()) as Record<string, unknown>;
    assert.equal(metadata.resource, MCP_RESOURCE);
    assert.deepEqual(metadata.authorization_servers, [authIssuer]);
    assert.deepEqual(metadata.scopes_supported, [
      "invoices:read",
      "invoices:write",
    ]);
  });
});

describe(
  "MCP tools",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    const userIds: string[] = [];
    let mine: string;
    let theirs: string;

    const makeUser = async (label: string) => {
      const user = await mod.prisma.user.create({
        data: { email: `mcp-${label}-${Date.now()}@example.test` },
      });
      userIds.push(user.id);
      await mod.prisma.invoice.create({
        data: {
          userId: user.id,
          invoiceNumber: `MCP-${label}`,
          invoiceDate: new Date("2026-08-14"),
          showName: `${label} show`,
          fullName: "Test Freelancer",
          email: "test@example.test",
          addressLine1: "1 Test Street",
          city: "Glasgow",
          postalCode: "G1 1AA",
          country: "United Kingdom",
          iban: "GB00TEST00000000000000",
          swiftBic: "TESTGB2L",
          clientName: `${label} Productions`,
          regularRate: 500,
          overtimeRate: 75,
          perDiemRate: 50,
          travelDayRate: 500,
          subtotalLabor: 1000,
          subtotalPerDiem: 0,
          subtotalTravel: 0,
          totalAmount: 1000,
          status: "sent",
        },
      });
      return user.id;
    };

    before(async () => {
      mod = await load();
      const tag = Date.now().toString(36);
      mine = await makeUser(`mine-${tag}`);
      theirs = await makeUser(`theirs-${tag}`);
    });

    after(async () => {
      await mod.prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await mod.prisma.$disconnect();
    });

    it("lists only the token's own invoices", async () => {
      const { text } = await callTool(mod, mine, "list_invoices", {});
      const invoices = JSON.parse(text) as Array<{ invoiceNumber: string }>;
      assert.equal(invoices.length, 1);
      assert.match(invoices[0]!.invoiceNumber, /^MCP-mine-/);
    });

    it("won't open another user's invoice by number", async () => {
      const other = await mod.prisma.invoice.findFirstOrThrow({
        where: { userId: theirs },
      });
      const { isError } = await callTool(mod, mine, "get_invoice", {
        invoiceNumber: other.invoiceNumber,
      });
      assert.equal(isError, true);
    });

    it("won't open another user's invoice by id", async () => {
      const other = await mod.prisma.invoice.findFirstOrThrow({
        where: { userId: theirs },
      });
      const { isError } = await callTool(mod, mine, "get_invoice", {
        id: other.id,
      });
      assert.equal(isError, true);
    });

    describe("drafts", () => {
      const write = ["invoices:read", "invoices:write"];
      let writer: string;
      let bare: string;
      let clientId: string;

      const days = (...dates: string[]) =>
        dates.map((date) => ({ date, type: "work" }));

      before(async () => {
        const tag = Date.now().toString(36);
        writer = (
          await mod.prisma.user.create({
            data: {
              email: `mcp-writer-${tag}@example.test`,
              fullName: "Test Freelancer",
              addressLine1: "1 Test Street",
              city: "Glasgow",
              postalCode: "G1 1AA",
              country: "United Kingdom",
              iban: "GB00TEST00000000000000",
              swiftBic: "TESTGB2L",
              currency: "GBP",
            },
          })
        ).id;
        // No profile: an invoice can't be made without bank details
        bare = (
          await mod.prisma.user.create({
            data: { email: `mcp-bare-${tag}@example.test` },
          })
        ).id;
        userIds.push(writer, bare);
        clientId = (
          await mod.prisma.client.create({
            data: { userId: writer, name: "Mallard", dayRate: 500 },
          })
        ).id;
      });

      const create = (userId = writer, scopes = write) =>
        callTool(
          mod,
          userId,
          "create_invoice_draft",
          {
            showName: "Harbour Lights",
            invoiceDate: "2026-10-30",
            clientId,
            days: days("2026-10-26", "2026-10-27"),
          },
          scopes,
        );

      it("won't create anything on a read-only connection", async () => {
        const { isError, text } = await create(writer, ["invoices:read"]);
        assert.equal(isError, true);
        assert.match(text, /reconnect|connect it again/);
        assert.equal(
          await mod.prisma.invoice.count({ where: { userId: writer } }),
          0,
        );
      });

      it("creates a draft priced from the client's terms", async () => {
        const { isError, text } = await create();
        assert.equal(isError, false);
        const made = JSON.parse(text) as {
          invoiceId: string;
          open: string;
        };
        assert.match(made.open, /\/invoices\//);
        const invoice = await mod.prisma.invoice.findFirstOrThrow({
          where: { id: made.invoiceId },
          include: { days: true },
        });
        assert.equal(invoice.status, "draft");
        assert.equal(invoice.userId, writer);
        assert.equal(invoice.days.length, 2);
        assert.equal(Number(invoice.totalAmount), 1000);
      });

      it("refuses without bank details rather than make half an invoice", async () => {
        const { isError, text } = await create(bare);
        assert.equal(isError, true);
        assert.match(text, /profile/i);
      });

      it("reprices a draft when its days change", async () => {
        const draft = await mod.prisma.invoice.findFirstOrThrow({
          where: { userId: writer, status: "draft" },
        });
        const { isError } = await callTool(
          mod,
          writer,
          "update_invoice_draft",
          {
            invoiceId: draft.id,
            days: days("2026-10-26", "2026-10-27", "2026-10-28"),
          },
          write,
        );
        assert.equal(isError, false);
        const after = await mod.prisma.invoice.findFirstOrThrow({
          where: { id: draft.id },
        });
        assert.equal(Number(after.totalAmount), 1500);
      });

      it("won't change an invoice that has been sent", async () => {
        const draft = await mod.prisma.invoice.findFirstOrThrow({
          where: { userId: writer },
        });
        await mod.prisma.invoice.update({
          where: { id: draft.id },
          data: { status: "sent" },
        });
        const { isError, text } = await callTool(
          mod,
          writer,
          "update_invoice_draft",
          { invoiceId: draft.id, notes: "sneaky" },
          write,
        );
        assert.equal(isError, true);
        assert.match(text, /sent/);
        const after = await mod.prisma.invoice.findFirstOrThrow({
          where: { id: draft.id },
        });
        assert.notEqual(after.notes, "sneaky");
      });

      it("won't touch another user's draft", async () => {
        const mineDraft = await create();
        const id = (JSON.parse(mineDraft.text) as { invoiceId: string })
          .invoiceId;
        const { isError } = await callTool(
          mod,
          mine,
          "update_invoice_draft",
          { invoiceId: id, notes: "not yours" },
          write,
        );
        assert.equal(isError, true);
        const after = await mod.prisma.invoice.findFirstOrThrow({
          where: { id },
        });
        assert.notEqual(after.notes, "not yours");
      });

      it("won't price against someone else's client", async () => {
        const { isError } = await callTool(
          mod,
          mine,
          "create_invoice_draft",
          {
            showName: "Borrowed",
            invoiceDate: "2026-10-30",
            clientId,
            days: days("2026-10-26"),
          },
          write,
        );
        assert.equal(isError, true);
      });
    });

    it("finds a search across clients, jobs and numbers within the user", async () => {
      const { text } = await callTool(mod, mine, "list_invoices", {
        search: "productions",
      });
      assert.equal((JSON.parse(text) as unknown[]).length, 1);
    });
  },
);
