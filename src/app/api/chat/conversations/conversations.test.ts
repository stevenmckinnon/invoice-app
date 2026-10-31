/**
 * Saved chats belong to the person who made them: the routes never list, read,
 * overwrite or delete another user's. Needs `TEST_DATABASE_URL` (see
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
  const [{ prisma }, list, one, { MAX_CONVERSATIONS }] = await Promise.all([
    import("@/lib/db"),
    import("@/app/api/chat/conversations/route"),
    import("@/app/api/chat/conversations/[id]/route"),
    import("@/lib/chat-conversations"),
  ]);
  return { prisma, list, one, MAX_CONVERSATIONS };
};

describe(
  "chat conversation routes",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not set" },
  () => {
    let mod: Awaited<ReturnType<typeof load>>;
    const userIds: string[] = [];
    let mine: string;
    let theirs: string;
    const tag = Date.now().toString(36);
    const id = (name: string) => `${name}-${tag}`;

    const messages = (question: string, answer = "Done.") => [
      { id: "m1", role: "user", parts: [{ type: "text", text: question }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: answer }] },
    ];

    const url = (convId: string) => `http://localhost/api/chat/conversations/${convId}`;
    const params = (convId: string) => ({ params: Promise.resolve({ id: convId }) });

    const put = (convId: string, body: unknown) =>
      mod.one.PUT(
        new NextRequest(url(convId), {
          method: "PUT",
          body: typeof body === "string" ? body : JSON.stringify(body),
        }),
        params(convId),
      );
    const get = (convId: string) =>
      mod.one.GET(new NextRequest(url(convId)), params(convId));
    const del = (convId: string) =>
      mod.one.DELETE(new NextRequest(url(convId), { method: "DELETE" }), params(convId));
    const list = async () =>
      (await (await mod.list.GET()).json()) as Array<{ id: string; title: string }>;

    before(async () => {
      mod = await load();
      mine = (await mod.prisma.user.create({ data: { email: `chat-mine-${tag}@example.test` } })).id;
      theirs = (await mod.prisma.user.create({ data: { email: `chat-theirs-${tag}@example.test` } })).id;
      userIds.push(mine, theirs);
    });

    after(async () => {
      mock.reset();
      await mod.prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await mod.prisma.$disconnect();
    });

    it("refuses everything when signed out", async () => {
      sessionUser = null;
      assert.equal((await mod.list.GET()).status, 401);
      assert.equal((await get(id("a-chat"))).status, 401);
      assert.equal((await put(id("a-chat"), { messages: messages("hi") })).status, 401);
      assert.equal((await del(id("a-chat"))).status, 401);
    });

    it("saves a chat under the client's id and names it by the first question", async () => {
      sessionUser = mine;
      const res = await put(id("first"), { messages: messages("Invoice WWE for Bad Blood") });
      assert.equal(res.status, 200);
      assert.equal(((await res.json()) as { title: string }).title, "Invoice WWE for Bad Blood");

      const loaded = (await (await get(id("first"))).json()) as { messages: unknown[]; title: string };
      assert.equal(loaded.messages.length, 2);
      assert.equal(loaded.title, "Invoice WWE for Bad Blood");
    });

    it("keeps the messages exactly as sent, tool parts included", async () => {
      sessionUser = mine;
      const withTool = [
        ...messages("Add Thursday"),
        {
          id: "m3",
          role: "assistant",
          parts: [{ type: "tool-createInvoiceDraft", state: "output-available", output: { invoiceId: "inv_123" } }],
        },
      ];
      await put(id("tool"), { messages: withTool });
      const loaded = (await (await get(id("tool"))).json()) as { messages: unknown[] };
      assert.deepEqual(loaded.messages, withTool);
    });

    it("saving again replaces the messages and keeps one row", async () => {
      sessionUser = mine;
      await put(id("again"), { messages: messages("One") });
      await put(id("again"), { messages: [...messages("One"), ...messages("Two")] });
      const loaded = (await (await get(id("again"))).json()) as { messages: unknown[] };
      assert.equal(loaded.messages.length, 4);
      assert.equal(await mod.prisma.chatConversation.count({ where: { id: id("again") } }), 1);
    });

    it("lists only your own chats, newest first, without their messages", async () => {
      sessionUser = theirs;
      await put(id("theirs"), { messages: messages("Their private question") });

      sessionUser = mine;
      const mineList = await list();
      assert.ok(mineList.length >= 3);
      assert.ok(mineList.every((c) => c.id !== id("theirs")));
      assert.ok(!JSON.stringify(mineList).includes("Their private question"));
      assert.ok(!("messages" in mineList[0]!));

      sessionUser = theirs;
      assert.deepEqual((await list()).map((c) => c.id), [id("theirs")]);
    });

    it("answers 404 for someone else's chat, and won't overwrite or delete it", async () => {
      sessionUser = mine;
      assert.equal((await get(id("theirs"))).status, 404);
      assert.equal((await put(id("theirs"), { messages: messages("Overwritten") })).status, 404);
      assert.equal((await del(id("theirs"))).status, 204);

      const row = await mod.prisma.chatConversation.findUniqueOrThrow({ where: { id: id("theirs") } });
      assert.equal(row.userId, theirs);
      assert.equal(row.title, "Their private question");
    });

    it("deletes your own chat", async () => {
      sessionUser = mine;
      assert.equal((await del(id("first"))).status, 204);
      assert.equal((await get(id("first"))).status, 404);
    });

    it("refuses an invalid id, malformed JSON, a bad shape and an oversized chat", async () => {
      sessionUser = mine;
      assert.equal((await put("../x", { messages: messages("hi") })).status, 400);
      assert.equal((await put(id("bad-json"), "{nope")).status, 400);
      assert.equal((await put(id("bad-shape"), { messages: [] })).status, 400);
      const huge = [{ role: "user", parts: [{ type: "text", text: "x".repeat(600 * 1024) }] }];
      assert.equal((await put(id("huge"), { messages: huge })).status, 413);
      assert.equal(await mod.prisma.chatConversation.count({ where: { id: { in: [id("bad-json"), id("bad-shape"), id("huge")] } } }), 0);
    });

    it("drops the oldest chats beyond the limit when a new one is saved", async () => {
      sessionUser = theirs;
      const now = Date.now();
      await mod.prisma.chatConversation.createMany({
        data: Array.from({ length: mod.MAX_CONVERSATIONS }, (_, n) => ({
          id: `bulk-${tag}-${String(n).padStart(3, "0")}`,
          userId: theirs,
          title: `Chat ${n}`,
          messages: messages("x") as never,
          updatedAt: new Date(now - (n + 1) * 60_000),
        })),
      });
      // 50 bulk + the earlier "theirs" = 51; saving one more makes 52
      await put(id("newest"), { messages: messages("The newest") });

      const remaining = await mod.prisma.chatConversation.findMany({
        where: { userId: theirs },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      assert.equal(remaining.length, mod.MAX_CONVERSATIONS);
      assert.equal(remaining[0]!.id, id("newest"));
      assert.ok(!remaining.some((c) => c.id === `bulk-${tag}-${String(mod.MAX_CONVERSATIONS - 1).padStart(3, "0")}`));
    });
  },
);
