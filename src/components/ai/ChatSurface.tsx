"use client";
import {
  PanelLeftIcon,
  PanelRightIcon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { ChatContent, type ChatSurfaceKind } from "@/components/ai/ChatContent";
import { ChatHistoryPanel } from "@/components/ai/ChatHistory";
import { useChatSession } from "@/components/ai/ChatProvider";
import { DraftInvoicePreview } from "@/components/ai/DraftInvoicePreview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatSurfaceProps {
  /** The heading element — SheetTitle in the drawer, a plain <p> on /chat */
  title: React.ReactNode;
  /** Rendered before the icon, e.g. the mobile back button on /chat */
  leading?: React.ReactNode;
  /** Rendered at the end of the header row, e.g. the drawer's close button */
  trailing?: React.ReactNode;
  /** Called when a link inside the surface navigates away */
  onNavigate?: () => void;
  /** See ChatContent — "canvas" drops the surrounding card on /chat */
  surface?: ChatSurfaceKind;
}

/**
 * Header, draft panel and conversation — everything both assistant surfaces
 * share. The drawer and /chat differ only in their container and heading, so
 * keeping this in one place stops the two from drifting apart.
 *
 * The draft renders beside the conversation from lg up and inline below it
 * otherwise, but it is one toggle either way, and the open state lives in
 * ChatProvider so the two surfaces agree.
 */
export const ChatSurface = ({
  title,
  leading,
  trailing,
  onNavigate,
  surface = "card",
}: ChatSurfaceProps) => {
  const {
    draftInvoiceId,
    isGenerating,
    draftPanelOpen,
    setDraftPanelOpen,
    messages,
    newChat,
    historyOpen,
    setHistoryOpen,
  } = useChatSession();

  const hasDraft = Boolean(draftInvoiceId);
  const onCanvas = surface === "canvas";

  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 px-4 py-3.5",
          onCanvas && "mx-auto w-full max-w-3xl",
        )}
      >
        {leading}
        <HugeiconsIcon icon={SparklesIcon} className="text-primary size-4 shrink-0" />
        {title}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {hasDraft && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraftPanelOpen(!draftPanelOpen)}
              className={cn("gap-1.5", draftPanelOpen && "bg-muted text-foreground")}
              // No aria-controls: the panel renders in two different places
              // depending on breakpoint, so there is no single id to point at.
              aria-expanded={draftPanelOpen}
            >
              <HugeiconsIcon icon={PanelRightIcon} className="size-3.5" />
              Draft
            </Button>
          )}
          {/* Nothing to start over from until something has been said */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={newChat}
            disabled={messages.length === 0}
            aria-label="New chat"
            title="New chat"
          >
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHistoryOpen(!historyOpen)}
            className={cn(historyOpen && "bg-muted text-foreground")}
            aria-label="Chat history"
            aria-expanded={historyOpen}
            title="Chat history"
          >
            <HugeiconsIcon icon={PanelLeftIcon} className="size-4" />
          </Button>
          {trailing}
        </div>
      </div>

      {/* Below lg the draft sits under the header, since there is no room
          beside the conversation. Same toggle, same panel. */}
      {hasDraft && draftPanelOpen && (
        <div className="shrink-0 px-3 pb-2 lg:hidden">
          {/* A height-capped flex column, not an overflow-y-auto box: the
              preview scrolls its own line items so the total and "Open in
              editor" stay pinned instead of sitting below the fold. */}
          <div
            className={cn(
              "flex max-h-[45vh] flex-col overflow-hidden rounded-xl",
              onCanvas ? "bg-card shadow-sm dark:border" : "bg-muted/40",
            )}
          >
            <DraftInvoicePreview
              invoiceId={draftInvoiceId!}
              isGenerating={isGenerating}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Beside the conversation on the full page from lg up */}
        {onCanvas && historyOpen && (
          <aside
            aria-label="Chat history"
            className="bg-card mb-4 ml-3 hidden w-64 shrink-0 flex-col overflow-hidden rounded-2xl shadow-sm lg:flex dark:border"
          >
            <ChatHistoryPanel />
          </aside>
        )}

        <ChatContent className="min-w-0 flex-1" surface={surface} />

        {hasDraft && draftPanelOpen && (
          <aside
            className={cn(
              "hidden w-[21rem] shrink-0 lg:flex lg:flex-col",
              // On the canvas the draft is its own object, so it gets a card
              onCanvas
                ? "bg-card mb-4 overflow-hidden rounded-2xl shadow-sm dark:border"
                : "bg-muted/40",
            )}
          >
            <DraftInvoicePreview
              invoiceId={draftInvoiceId!}
              isGenerating={isGenerating}
              onNavigate={onNavigate}
            />
          </aside>
        )}

        {/* Over the conversation everywhere else: the drawer and below lg.
            The scrim and Escape put it away, as does picking a chat. */}
        {historyOpen && (
          <div
            className={cn("absolute inset-0 z-20 flex", onCanvas && "lg:hidden")}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                // Put the list away without also closing the drawer around it
                e.stopPropagation();
                setHistoryOpen(false);
              }
            }}
          >
            <nav
              aria-label="Chat history"
              className="bg-card flex h-full w-[min(20rem,85%)] flex-col border-r shadow-xl"
            >
              <ChatHistoryPanel onDone={() => setHistoryOpen(false)} />
            </nav>
            <button
              type="button"
              aria-label="Close chat history"
              className="bg-background/60 min-w-0 flex-1 backdrop-blur-[1px]"
              onClick={() => setHistoryOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
};
