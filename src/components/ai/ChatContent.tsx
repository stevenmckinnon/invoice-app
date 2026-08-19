"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, Copy01Icon, Refresh01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";

import { isTextUIPart, type ToolUIPart, type UIMessage } from "ai";
import { useChatSession } from "@/components/ai/ChatProvider";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Create an invoice",
  "What's my revenue this month?",
  "How many invoices are outstanding?",
  "Show me my top clients by revenue",
];

// Cycled in order, not at random — a label that jumps around reads as jitter
const THINKING_MESSAGES = [
  "Thinking…",
  "Checking your invoices…",
  "Reading the ledger…",
  "Doing the maths…",
];

const TOOL_TITLES: Record<string, string> = {
  "tool-createInvoiceDraft": "Create invoice draft",
  "tool-updateInvoiceDraft": "Update invoice draft",
};

const getMessageText = (message: UIMessage): string =>
  message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

/** Mounts fresh for each pending turn, so the cycle always starts at the top */
const ThinkingIndicator = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % THINKING_MESSAGES.length),
      2500,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <Shimmer className="text-muted-foreground text-sm">
      {THINKING_MESSAGES[index]}
    </Shimmer>
  );
};

/**
 * Assistant turn. No avatar chip: the alternating alignment and the blue user
 * bubble already carry who is speaking, and a tinted icon badge on every turn
 * is the decorative-chip pattern the rest of the app avoids.
 */
const AssistantRow = ({ children }: { children: React.ReactNode }) => (
  <Message from="assistant" className="min-w-0">
    {children}
  </Message>
);

/** Copy / retry, revealed on hover — always visible on the turn being acted on */
const AssistantActions = ({
  text,
  onRetry,
  alwaysVisible,
}: {
  text: string;
  onRetry?: () => void;
  alwaysVisible: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context, denied permission) — no state change
    }
  };

  // Reset the tick without leaving a timer running if the message unmounts first
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <MessageActions
      className={cn(
        "-ml-1 transition-opacity",
        // Hover reveal is desktop-only; on touch there is no hover, so the
        // actions on the turn you would act on stay visible.
        alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      <MessageAction tooltip={copied ? "Copied" : "Copy"} onClick={handleCopy}>
        {copied ? (
          <HugeiconsIcon icon={Tick01Icon} className="text-success size-3.5" />
        ) : (
          <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
        )}
      </MessageAction>
      {onRetry && (
        <MessageAction tooltip="Try again" onClick={onRetry}>
          <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
        </MessageAction>
      )}
    </MessageActions>
  );
};

export const ChatContent = ({ className }: { className?: string }) => {
  const {
    messages,
    sendMessage,
    status,
    stop,
    mounted,
    isGenerating,
    clearChat,
    error,
    clearError,
    regenerate,
  } = useChatSession();

  const handleSubmit = ({ text }: { text: string }) => {
    if (!text.trim()) return;
    if (error) clearError();
    sendMessage({ text });
  };

  const handleRetry = () => {
    if (error) clearError();
    regenerate();
  };

  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  // The last assistant turn has produced nothing renderable yet — either no
  // parts at all, or a tool call still running with no text alongside it
  const lastMessage = visibleMessages.at(-1);
  const awaitingFirstOutput =
    isGenerating &&
    (lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" &&
        !lastMessage.parts.some((p) => p.type === "text" && p.text)));

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <Conversation className="flex-1">
        <ConversationContent>
          {mounted && visibleMessages.length === 0 ? (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-muted-foreground text-sm">
                I can create invoices, check your revenue, and answer questions
                about your account. What do you need?
              </p>
              <Suggestions>
                {SUGGESTIONS.map((s) => (
                  <Suggestion
                    key={s}
                    suggestion={s}
                    onClick={(text) => sendMessage({ text })}
                  />
                ))}
              </Suggestions>
            </div>
          ) : (
            visibleMessages.map((message, messageIndex) =>
              message.role === "assistant" ? (
                <AssistantRow key={message.id}>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      if (!part.text) return null;
                      return (
                        <MessageContent key={i}>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      );
                    }
                    if (part.type.startsWith("tool-")) {
                      const toolPart = part as ToolUIPart;
                      return (
                        <Tool key={i}>
                          <ToolHeader
                            type={toolPart.type}
                            state={toolPart.state}
                            title={TOOL_TITLES[toolPart.type]}
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                  {/* Streaming text is incomplete and not worth copying, and
                      retrying mid-stream would abandon output still arriving */}
                  {!isGenerating && getMessageText(message) && (
                    <AssistantActions
                      text={getMessageText(message)}
                      alwaysVisible={messageIndex === visibleMessages.length - 1}
                      onRetry={
                        messageIndex === visibleMessages.length - 1
                          ? handleRetry
                          : undefined
                      }
                    />
                  )}
                </AssistantRow>
              ) : (
                <Message key={message.id} from="user">
                  <MessageContent>
                    <span>{getMessageText(message)}</span>
                  </MessageContent>
                </Message>
              ),
            )
          )}

          {awaitingFirstOutput && (
            <AssistantRow>
              <MessageContent>
                <ThinkingIndicator />
              </MessageContent>
            </AssistantRow>
          )}

          {/* Without this the request just vanishes: the thinking indicator
              stops and nothing replaces it, leaving the user staring at their
              own message with no idea whether it is still working. */}
          {error && (
            <div className="bg-destructive/10 flex flex-col gap-2 rounded-xl px-4 py-3">
              <div className="text-destructive flex items-start gap-2 text-sm">
                <HugeiconsIcon icon={Alert01Icon} className="mt-0.5 size-4 shrink-0" />
                <p className="min-w-0">
                  Something went wrong reaching the assistant. Your message
                  wasn&apos;t lost — try again.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="self-start"
              >
                <HugeiconsIcon icon={Refresh01Icon} className="size-3.5" />
                Try again
              </Button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Separated from the conversation by a lift rather than a hairline —
          the same way cards separate from the canvas everywhere else. */}
      <div className="shrink-0 px-4 pt-2 pb-4 shadow-[0_-8px_16px_-12px_var(--shadow-color)]">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            placeholder="Ask anything about your invoices…"
            // 16px at every breakpoint — below 16px iOS/iPadOS Safari zooms
            // the whole page when the input is focused
            className="font-sans text-base md:text-base"
          />
          <PromptInputFooter>
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={clearChat}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                Clear chat
              </button>
            ) : (
              <span className="text-muted-foreground hidden text-xs md:inline">
                Shift+Enter for new line
              </span>
            )}
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
