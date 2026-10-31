import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_MESSAGES,
  conversationTitle,
  isValidConversationId,
  saveConversationInput,
} from "./chat-conversations";

const text = (role: string, value: string) => ({
  role,
  parts: [{ type: "text", text: value }],
});

describe("conversationTitle", () => {
  it("is the first thing you asked", () => {
    assert.equal(
      conversationTitle([text("user", "Invoice WWE for Bad Blood"), text("assistant", "Done")]),
      "Invoice WWE for Bad Blood",
    );
  });

  it("skips anything before your first message", () => {
    assert.equal(
      conversationTitle([text("assistant", "Hi"), text("user", "How much am I owed?")]),
      "How much am I owed?",
    );
  });

  it("collapses whitespace and trims to one short line", () => {
    assert.equal(conversationTitle([text("user", "  one\n\n two   three ")]), "one two three");
    const long = conversationTitle([text("user", "word ".repeat(40))]);
    assert.ok(long.length <= 60);
    assert.ok(long.endsWith("…"));
  });

  it("falls back when there's no text to name it by", () => {
    assert.equal(conversationTitle([]), "New chat");
    assert.equal(conversationTitle([{ role: "user", parts: [{ type: "file" }] }]), "New chat");
  });
});

describe("isValidConversationId", () => {
  it("accepts a UUID and a short token", () => {
    assert.ok(isValidConversationId("6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f"));
    assert.ok(isValidConversationId("abc_DEF-123"));
  });

  it("refuses anything that could be a path, a query or nothing", () => {
    for (const id of ["", "short", "../../etc/passwd", "a/b/c/d/e/f/g/h", "id with space", "x".repeat(65), "id?x=1&y=2"]) {
      assert.equal(isValidConversationId(id), false, id);
    }
  });
});

describe("saveConversationInput", () => {
  const ok = (value: unknown) => saveConversationInput.safeParse(value).success;

  it("takes role-tagged messages and keeps their extra fields", () => {
    const parsed = saveConversationInput.parse({
      messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hi", extra: 1 }] }],
    });
    assert.equal((parsed.messages[0] as { id?: string }).id, "m1");
  });

  it("refuses an empty list, an unknown role and parts that aren't a list", () => {
    assert.equal(ok({ messages: [] }), false);
    assert.equal(ok({ messages: [{ role: "tool", parts: [] }] }), false);
    assert.equal(ok({ messages: [{ role: "user", parts: "hi" }] }), false);
    assert.equal(ok({}), false);
  });

  it("caps how many messages one conversation holds", () => {
    const many = Array.from({ length: MAX_MESSAGES + 1 }, () => text("user", "x"));
    assert.equal(ok({ messages: many }), false);
    assert.equal(ok({ messages: many.slice(1) }), true);
  });
});
