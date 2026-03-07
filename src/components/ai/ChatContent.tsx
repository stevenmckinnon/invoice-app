"use client";

import { useEffect, useRef, useState } from "react";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai";
import { ArrowLeftIcon, BotIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "caley-chat-session";

const SUGGESTIONS = [
  "Create an invoice",
  "What's my revenue this month?",
  "How many invoices are outstanding?",
  "Show me my top clients by revenue",
];

const transport = new DefaultChatTransport({ api: "/api/chat" });

const THINKING_MESSAGES = [
  "Thinking…",
  "Crunching numbers…",
  "Consulting the spreadsheets…",
  "Doing the math…",
  "Checking your invoices…",
  "Counting beans…",
  "Summoning insight…",
  "Reading the ledger…",
  "Calculating…",
  "On it…",
];

const getMessageText = (message: UIMessage): string =>
  message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

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

interface ChatContentProps {
  /** "drawer" = inside Sheet (desktop), "page" = standalone route */
  variant?: "drawer" | "page";
  onClose?: () => void;
}

export const ChatContent = ({
  variant = "drawer",
  onClose,
}: ChatContentProps) => {
  const router = useRouter();
  const [draftInvoiceId, setDraftInvoiceId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const thinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const { messages, sendMessage, setMessages, status, stop } = useChat({
    transport,
  });

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

  const isThinking = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (isThinking) {
      setThinkingIndex(Math.floor(Math.random() * THINKING_MESSAGES.length));
      thinkingIntervalRef.current = setInterval(() => {
        setThinkingIndex(() =>
          Math.floor(Math.random() * THINKING_MESSAGES.length),
        );
      }, 2000);
    } else {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    }
    return () => {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
    };
  }, [isThinking]);

  useEffect(() => {
    if (!mounted || messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages, mounted]);

  useEffect(() => {
    const id = findDraftInvoiceId(messages);
    if (id) setDraftInvoiceId(id);
  }, [messages]);

  const handleSubmit = ({ text }: { text: string; files: unknown[] }) => {
    if (!text.trim()) return;
    sendMessage({ text });
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage({ text: suggestion });
  };

  const clearChat = () => {
    setMessages([]);
    setDraftInvoiceId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const isGenerating = status === "submitted" || status === "streaming";

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  const headerActions = (
    <>
      {draftInvoiceId && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/invoices/${draftInvoiceId}/edit`} onClick={onClose}>
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
          className="text-muted-foreground text-xs"
        >
          Clear
        </Button>
      )}
    </>
  );

  const titleContent = (
    <div className="flex flex-1 items-center gap-3">
      <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
        <BotIcon className="text-primary size-4" />
      </div>
      <div className="flex-1 text-left">
        {variant === "drawer" ? (
          <SheetTitle className="text-sm leading-none font-semibold">
            Caley Assistant
          </SheetTitle>
        ) : (
          <p className="text-sm leading-none font-semibold">Caley Assistant</p>
        )}
        <p className="text-muted-foreground mt-0.5 text-xs">
          Powered by Claude
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col",
        variant === "page"
          ? "h-[calc(100dvh-3rem-env(safe-area-inset-top))] overflow-hidden pt-4 md:h-[calc(100dvh-6rem)] md:pt-0"
          : "min-h-0 flex-1",
      )}
    >
      {/* Header */}
      {variant === "drawer" ? (
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {titleContent}
            <div className="mr-4 flex items-center gap-2">{headerActions}</div>
          </div>
        </SheetHeader>
      ) : (
        <div className="shrink-0 border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            {titleContent}
            <div className="flex items-center gap-2">{headerActions}</div>
          </div>
        </div>
      )}

      {/* Messages — gated on mounted to avoid SSR/hydration mismatch with localStorage */}
      <Conversation className="flex-1">
        <ConversationContent>
          {mounted && visibleMessages.length === 0 ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-muted-foreground text-sm">
                Hi! I can help you create invoices, check your revenue, and
                answer questions about your account. What would you like to do?
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

          {isGenerating && visibleMessages.at(-1)?.role === "user" && (
            <div className="flex gap-3">
              <div className="bg-primary/10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                <BotIcon className="text-primary size-3.5" />
              </div>
              <Message from="assistant">
                <MessageContent>
                  <Shimmer className="text-muted-foreground text-sm">
                    {THINKING_MESSAGES[thinkingIndex]}
                  </Shimmer>
                </MessageContent>
              </Message>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      <div className="shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            placeholder="Ask anything about your invoices…"
            className="font-sans"
            disabled={isGenerating}
          />
          <PromptInputFooter>
            <span className="text-muted-foreground hidden text-xs md:inline">
              Shift+Enter for new line
            </span>
            <PromptInputSubmit
              status={status}
              onStop={stop}
              className="ml-auto"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
