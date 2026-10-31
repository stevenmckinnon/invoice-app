import { useQuery } from "@tanstack/react-query";

import type { UIMessage } from "ai";

export interface ChatConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export const CHAT_CONVERSATIONS_KEY = ["chat-conversations"] as const;

const fetchConversations = async (): Promise<ChatConversationSummary[]> => {
  const res = await fetch("/api/chat/conversations");
  if (!res.ok) throw new Error("Failed to load your chats");
  return res.json();
};

/** Past chats for the history list. Enabled only while the list is showing,
 *  so it is fresh each time it opens (a chat may have been made on a phone). */
export const useChatConversations = (enabled: boolean) =>
  useQuery({
    queryKey: CHAT_CONVERSATIONS_KEY,
    queryFn: fetchConversations,
    enabled,
    staleTime: 0,
  });

/** True if saved. A failure is quiet: the chat is still in this browser. */
export const saveConversation = async (
  id: string,
  messages: UIMessage[],
): Promise<boolean> => {
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const loadConversation = async (
  id: string,
): Promise<UIMessage[] | null> => {
  try {
    const res = await fetch(`/api/chat/conversations/${id}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { messages?: UIMessage[] };
    return Array.isArray(body.messages) ? body.messages : null;
  } catch {
    return null;
  }
};

export const deleteConversationRequest = async (
  id: string,
): Promise<boolean> => {
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
};
