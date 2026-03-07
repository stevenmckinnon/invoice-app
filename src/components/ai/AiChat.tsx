"use client";

import { useEffect, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai";
import { BotIcon, ExternalLinkIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const STORAGE_KEY = "caley-chat-session";

const SUGGESTIONS = [
  "Create an invoice",
  "What's my revenue this month?",
  "How many invoices are outstanding?",
  "Show me my top clients by revenue",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

/** Extract text content from a UIMessage's parts */
const getMessageText = (message: UIMessage): string =>
  message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

/** Find the most recent createInvoiceDraft tool output in message parts */
const findDraftInvoiceId = (messages: UIMessage[]): string | null => {
  let latest: string | null = null;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (
        part.type === "tool-createInvoiceDraft" &&
        part.state === "output-available"
      ) {
        const output = part.output as Record<string, unknown>;
        if (typeof output?.invoiceId === "string") latest = output.invoiceId;
      }
    }
  }
  return latest;
};

interface AiChatProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AiChat = ({ open: controlledOpen, onOpenChange }: AiChatProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [draftInvoiceId, setDraftInvoiceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport,
  });

  // Hydrate from localStorage once on client mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: UIMessage[] = JSON.parse(raw);
        if (parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // Ignore malformed storage
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist messages to localStorage on every change
  useEffect(() => {
    if (!mounted || messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages, mounted]);

  // Detect draft invoice ID from createInvoiceDraft tool output
  useEffect(() => {
    const id = findDraftInvoiceId(messages);
    if (id) setDraftInvoiceId(id);
  }, [messages]);

  const handleSubmit = ({ text }: { text: string; files: unknown[] }) => {
    if (!text.trim()) return;
    sendMessage({ text });
  };

  const handleSuggestion = (suggestion: string) => {
    setOpen(true);
    sendMessage({ text: suggestion });
  };

  const clearChat = () => {
    setMessages([]);
    setDraftInvoiceId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  if (!mounted) return null;

  const isGenerating = status === "submitted" || status === "streaming";

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  return (
    <>
      {/* Floating action button */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 z-40 hidden size-14 overflow-hidden rounded-full shadow-lg md:flex"
        size="icon"
        aria-label="Open AI assistant"
      >
        <SparklesIcon className="relative z-10 size-5" />
        <span className="shimmer-overlay" />
      </Button>

      {/* Chat drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:max-w-[480px]"
        >
          {/* Header */}
          <SheetHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                <BotIcon className="text-primary size-4" />
              </div>
              <div className="flex-1 text-left">
                <SheetTitle className="text-sm leading-none font-semibold">
                  Caley Assistant
                </SheetTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Powered by Claude
                </p>
              </div>
              <div className="flex items-center gap-2">
                {draftInvoiceId && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/invoices/${draftInvoiceId}/edit`}
                      onClick={() => setOpen(false)}
                    >
                      <ExternalLinkIcon className="size-3.5" />
                      Open draft
                    </Link>
                  </Button>
                )}
                {messages.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearChat}
                    className="text-muted-foreground mr-4 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Messages */}
          <Conversation className="flex-1">
            <ConversationContent>
              {visibleMessages.length === 0 ? (
                <div className="flex flex-col gap-4 pt-2">
                  <p className="text-muted-foreground text-sm">
                    Hi! I can help you create invoices, check your revenue, and
                    answer questions about your account. What would you like to
                    do?
                  </p>
                  <Suggestions>
                    {SUGGESTIONS.map((s) => (
                      <Suggestion
                        key={s}
                        suggestion={s}
                        onClick={handleSuggestion}
                      />
                    ))}
                  </Suggestions>
                </div>
              ) : (
                visibleMessages.map((message) =>
                  message.role === "assistant" ? (
                    <div key={message.id} className="flex gap-3">
                      <div className="bg-primary/10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                        <BotIcon className="text-primary size-3.5" />
                      </div>
                      <Message from="assistant">
                        <MessageContent>
                          <MessageResponse>
                            {getMessageText(message)}
                          </MessageResponse>
                        </MessageContent>
                      </Message>
                    </div>
                  ) : (
                    <Message key={message.id} from="user">
                      <MessageContent>
                        <span>{getMessageText(message)}</span>
                      </MessageContent>
                    </Message>
                  ),
                )
              )}

              {/* Thinking indicator while waiting for first token */}
              {isGenerating && visibleMessages.at(-1)?.role === "user" && (
                <div className="flex gap-3">
                  <div className="bg-primary/10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                    <BotIcon className="text-primary size-3.5" />
                  </div>
                  <Message from="assistant">
                    <MessageContent>
                      <span className="text-muted-foreground animate-pulse text-sm">
                        Thinking…
                      </span>
                    </MessageContent>
                  </Message>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input */}
          <div className="border-t p-3">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputTextarea
                placeholder="Ask anything about your invoices…"
                className="font-sans"
                disabled={isGenerating}
              />
              <PromptInputFooter>
                <span className="text-muted-foreground text-xs">
                  Shift+Enter for new line
                </span>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
