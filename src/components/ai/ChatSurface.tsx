"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import { PanelRightIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import { ChatContent } from "@/components/ai/ChatContent";
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
}: ChatSurfaceProps) => {
  const {
    draftInvoiceId,
    isGenerating,
    draftPanelOpen,
    setDraftPanelOpen,
  } = useChatSession();

  const hasDraft = Boolean(draftInvoiceId);

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-4 py-3.5">
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
          <div className="bg-muted/40 flex max-h-[45vh] flex-col overflow-hidden rounded-xl">
            <DraftInvoicePreview
              invoiceId={draftInvoiceId!}
              isGenerating={isGenerating}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <ChatContent className="min-w-0 flex-1" />

        {hasDraft && draftPanelOpen && (
          <aside className="bg-muted/40 hidden w-[21rem] shrink-0 lg:flex lg:flex-col">
            <DraftInvoicePreview
              invoiceId={draftInvoiceId!}
              isGenerating={isGenerating}
              onNavigate={onNavigate}
            />
          </aside>
        )}
      </div>
    </>
  );
};
