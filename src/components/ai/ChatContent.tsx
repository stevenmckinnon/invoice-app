"use client";

import { useEffect, useState } from "react";

import { isTextUIPart, type ToolUIPart, type UIMessage } from "ai";
import { BotIcon } from "lucide-react";

import { useChatSession } from "@/components/ai/ChatProvider";
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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
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

const AssistantAvatar = () => (
  <div className="bg-primary/10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
    <BotIcon className="text-primary size-3.5" />
  </div>
);

/** Assistant turn: avatar in the gutter, message body beside it */
const AssistantRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex gap-3">
    <AssistantAvatar />
    <Message from="assistant" className="min-w-0 flex-1">
      {children}
    </Message>
  </div>
);

export const ChatContent = ({ className }: { className?: string }) => {
  const {
    messages,
    sendMessage,
    status,
    stop,
    mounted,
    isGenerating,
    clearChat,
  } = useChatSession();

  const handleSubmit = ({ text }: { text: string }) => {
    if (!text.trim()) return;
    sendMessage({ text });
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
            visibleMessages.map((message) =>
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="shrink-0 border-t p-3">
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
