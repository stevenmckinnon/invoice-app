"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

const STORAGE_KEY = "caley-chat-session";

const noopSubscribe = () => () => {};

/** False during SSR and the hydration pass, true after — gates localStorage UI */
const useIsHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

const transport = new DefaultChatTransport({ api: "/api/chat" });

/** Latest invoice id produced by a draft tool call, or null. */
const findDraftInvoiceId = (messages: UIMessage[]): string | null => {
  let latest: string | null = null;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (
        (part.type === "tool-createInvoiceDraft" ||
          part.type === "tool-updateInvoiceDraft") &&
        part.state === "output-available"
      ) {
        const output = part.output as Record<string, unknown>;
        if (typeof output?.invoiceId === "string") latest = output.invoiceId;
      }
    }
  }
  return latest;
};

type ChatContextValue = ReturnType<typeof useChat> & {
  /** True once localStorage has been read — render gate for hydration safety */
  mounted: boolean;
  isGenerating: boolean;
  /** Invoice the assistant is currently working on, for the live preview */
  draftInvoiceId: string | null;
  clearChat: () => void;
  /** Drawer open state, shared so any surface can open the assistant */
  open: boolean;
  setOpen: (open: boolean) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export const useChatSession = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatSession must be used within ChatProvider");
  }
  return ctx;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const mounted = useIsHydrated();
  const [open, setOpen] = useState(false);
  const chat = useChat({ transport, throttle: 50 });
  const { messages, setMessages, status } = chat;

  const isGenerating = status === "submitted" || status === "streaming";

  // Derived, not stored — clearing the conversation clears the draft with it
  const draftInvoiceId = useMemo(() => findDraftInvoiceId(messages), [messages]);

  // Restore history once on mount
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: UIMessage[] = JSON.parse(raw);
        if (parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // Ignore malformed storage
    }
  }, [setMessages]);

  // Persist on a trailing debounce rather than only when idle, so a refresh
  // mid-stream keeps what has arrived so far. Serializing on every chunk
  // blocks the main thread, hence the delay.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted || messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Ignore storage errors (quota, private mode)
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, mounted]);

  const clearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        mounted,
        isGenerating,
        draftInvoiceId,
        clearChat,
        open,
        setOpen,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
