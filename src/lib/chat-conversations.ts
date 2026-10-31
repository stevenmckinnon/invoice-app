/**
 * Saved assistant conversations, so a chat started on one device can be
 * reopened on another. The server only stores what the client holds: the AI
 * SDK's `UIMessage[]`, tool results included.
 */
import { z } from "zod";

/** Newest first, and the oldest beyond this are dropped when a new one is saved */
export const MAX_CONVERSATIONS = 50;
export const MAX_MESSAGES = 200;
/** The JSON of one conversation, in bytes: a long chat with tool output is well under */
export const MAX_CONVERSATION_BYTES = 512 * 1024;

/**
 * The client picks the id (so saving needs no round trip): a UUID, or any
 * short token of letters, digits, `-` and `_`. Never a path or a query.
 */
export const isValidConversationId = (id: string) =>
  /^[A-Za-z0-9_-]{8,64}$/.test(id);

/**
 * Loose on purpose: the shape of a message part changes with the AI SDK, and
 * the server only needs to know it is a list of role-tagged messages. The
 * client reads them back, and a malformed one only affects its owner.
 */
export const saveConversationInput = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.enum(["user", "assistant", "system"]),
          parts: z.array(z.looseObject({})),
        })
        .passthrough(),
    )
    .min(1)
    .max(MAX_MESSAGES),
});

type TitleMessage = { role: string; parts: Array<{ type?: string; text?: unknown }> };

/** The first thing you asked, trimmed to a line, as the chat's name */
export const conversationTitle = (messages: TitleMessage[]): string => {
  const first = messages.find((m) => m.role === "user");
  const text = (first?.parts ?? [])
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text as string)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "New chat";
  return text.length > 60 ? `${text.slice(0, 59).trimEnd()}…` : text;
};
