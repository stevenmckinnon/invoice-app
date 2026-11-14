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
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";

import { getOpenEditor } from "@/components/ai/editor-bridge";
import {
  CHAT_CONVERSATIONS_KEY,
  deleteConversationRequest,
  loadConversation,
  saveConversation,
} from "@/hooks/use-chat-conversations";
import { EDIT_OPEN_INVOICE_TOOL, editorEditSchema } from "@/lib/editor-edits";

const STORAGE_KEY = "caley-chat-session";

const newConversationId = () => crypto.randomUUID();

/** What this browser keeps of the open chat. Older versions stored just the
 *  messages, so that shape is still read (and given an id). */
const readStoredSession = (): { id: string; messages: UIMessage[] } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.length > 0
        ? { id: newConversationId(), messages: parsed as UIMessage[] }
        : null;
    }
    const stored = parsed as { id?: unknown; messages?: unknown };
    if (typeof stored?.id === "string" && Array.isArray(stored.messages)) {
      return { id: stored.id, messages: stored.messages as UIMessage[] };
    }
  } catch {
    // Ignore malformed storage
  }
  return null;
};

const noopSubscribe = () => () => {};

/** False during SSR and the hydration pass, true after — gates localStorage UI */
const useIsHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

// Each request says what the invoice editor shows, if one is open, so the
// assistant can work it; the route offers the editor tool only then
const transport = new DefaultChatTransport({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => ({
    body: {
      ...body,
      id,
      messages,
      trigger,
      messageId,
      editor: getOpenEditor()?.snapshot(),
    },
  }),
});

const EDITOR_TOOL_PART = `tool-${EDIT_OPEN_INVOICE_TOOL}`;

/**
 * Carry on once the browser has answered the editor tool, so the model can
 * say what changed. Only for that tool: a reply that ran out of steps on a
 * server tool shouldn't send itself again.
 */
const editorCallAnswered = ({ messages }: { messages: UIMessage[] }) => {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return false;
  const stepStart = last.parts.findLastIndex((p) => p.type === "step-start");
  const step = last.parts.slice(stepStart + 1);
  const editorCalls = step.filter((p) => p.type === EDITOR_TOOL_PART);
  return (
    editorCalls.length > 0 &&
    step.every(
      (p) =>
        !p.type.startsWith("tool-") ||
        ("state" in p &&
          (p.state === "output-available" || p.state === "output-error")),
    )
  );
};

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
  /** Whether the draft preview is showing, shared across both chat surfaces */
  draftPanelOpen: boolean;
  setDraftPanelOpen: (open: boolean) => void;
  /** The saved chat on screen; a new one has an id before it is first saved */
  conversationId: string;
  /** The list of past chats, shared so both surfaces agree on whether it's showing */
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  /** Start again with an empty chat. The one you leave stays in history. */
  newChat: () => void;
  /** Reopen a saved chat; false if it couldn't be loaded */
  openConversation: (id: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<void>;
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

/** Non-throwing variant for surfaces that render outside ChatProvider, like
 *  the marketing header — returns null instead of erroring. */
export const useChatSessionOptional = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const mounted = useIsHydrated();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const chat = useChat({
    transport,
    throttle: 50,
    // The editor tool runs here, not on the server: it changes the form on
    // screen, and the person saves it themselves
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName !== EDIT_OPEN_INVOICE_TOOL) return;
      const answer = (
        result:
          | { output: unknown }
          | { errorText: string },
      ) =>
        void chat.addToolOutput(
          "errorText" in result
            ? {
                tool: EDIT_OPEN_INVOICE_TOOL,
                toolCallId: toolCall.toolCallId,
                state: "output-error",
                errorText: result.errorText,
              }
            : {
                tool: EDIT_OPEN_INVOICE_TOOL,
                toolCallId: toolCall.toolCallId,
                output: result.output,
              },
        );
      const editor = getOpenEditor();
      if (!editor) {
        answer({
          errorText:
            "The invoice editor isn't open any more, so nothing was changed.",
        });
        return;
      }
      const edit = editorEditSchema.safeParse(toolCall.input);
      if (!edit.success) {
        answer({ errorText: `Invalid edit: ${edit.error.message}` });
        return;
      }
      answer({ output: editor.apply(edit.data) });
    },
    sendAutomaticallyWhen: editorCallAnswered,
  });
  const { messages, setMessages, status, stop, clearError } = chat;
  const queryClient = useQueryClient();
  // Read once, before anything renders: the id is never drawn into the page,
  // so the server (no storage) and the client agreeing isn't a concern
  const [stored] = useState(readStoredSession);
  const [conversationId, setConversationId] = useState(
    () => stored?.id ?? newConversationId(),
  );

  const isGenerating = status === "submitted" || status === "streaming";

  // Derived, not stored — clearing the conversation clears the draft with it
  const draftInvoiceId = useMemo(() => findDraftInvoiceId(messages), [messages]);

  // Stored as "which draft did you collapse", not as a plain boolean, so a
  // newly created draft opens on its own without an effect that writes state.
  const [collapsedDraftId, setCollapsedDraftId] = useState<string | null>(null);
  const draftPanelOpen =
    Boolean(draftInvoiceId) && collapsedDraftId !== draftInvoiceId;
  const setDraftPanelOpen = (open: boolean) =>
    setCollapsedDraftId(open ? null : draftInvoiceId);

  // Put the open chat back once on mount
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (stored) setMessages(stored.messages);
  }, [stored, setMessages]);

  // Keep this browser's copy on a trailing debounce rather than only when
  // idle, so a refresh mid-stream keeps what has arrived so far. Serializing
  // on every chunk blocks the main thread, hence the delay.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mounted || messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id: conversationId, messages }),
        );
      } catch {
        // Ignore storage errors (quota, private mode)
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, conversationId, mounted]);

  // Save to your account when a reply finishes (or is stopped), not on every
  // chunk, so history follows you to the other device without a request per
  // token. `unsaved` is true from the moment a reply starts until it's saved.
  const unsaved = useRef(false);
  const refreshHistory = () =>
    queryClient.invalidateQueries({ queryKey: CHAT_CONVERSATIONS_KEY });
  useEffect(() => {
    if (isGenerating) {
      unsaved.current = true;
      return;
    }
    if (!unsaved.current || !mounted || messages.length === 0) return;
    unsaved.current = false;
    void saveConversation(conversationId, messages).then((saved) => {
      if (saved) refreshHistory();
    });
    // refreshHistory only wraps the stable queryClient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, messages, conversationId, mounted]);

  /** Leaving a chat mid-reply: save what there is first, so it isn't lost */
  const leaveCurrentChat = () => {
    if (unsaved.current && messages.length > 0) {
      void saveConversation(conversationId, messages).then((saved) => {
        if (saved) refreshHistory();
      });
    }
    unsaved.current = false;
    stop();
    clearError();
  };

  const newChat = () => {
    leaveCurrentChat();
    setMessages([]);
    setConversationId(newConversationId());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const openConversation = async (id: string) => {
    if (id === conversationId) return true;
    leaveCurrentChat();
    const saved = await loadConversation(id);
    if (!saved) {
      toast.error("Couldn't open that chat");
      refreshHistory();
      return false;
    }
    unsaved.current = false;
    setConversationId(id);
    setMessages(saved);
    return true;
  };

  const deleteConversation = async (id: string) => {
    const deleted = await deleteConversationRequest(id);
    if (!deleted) {
      toast.error("Couldn't delete that chat");
      return;
    }
    if (id === conversationId) newChat();
    refreshHistory();
  };

  return (
    <ChatContext.Provider
      value={{
        ...chat,
        mounted,
        isGenerating,
        draftInvoiceId,
        draftPanelOpen,
        setDraftPanelOpen,
        conversationId,
        historyOpen,
        setHistoryOpen,
        newChat,
        openConversation,
        deleteConversation,
        open,
        setOpen,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
