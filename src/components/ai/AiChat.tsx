"use client";

import { useState } from "react";

import { ChevronDownIcon, SparklesIcon } from "lucide-react";

import { ChatContent } from "@/components/ai/ChatContent";
import { useChatSession } from "@/components/ai/ChatProvider";
import { DraftInvoicePreview } from "@/components/ai/DraftInvoicePreview";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const AiChat = () => {
  const { open, setOpen, draftInvoiceId, isGenerating } = useChatSession();
  const [expandedOnNarrow, setExpandedOnNarrow] = useState(false);

  const hasDraft = Boolean(draftInvoiceId);

  return (
    <>
      {/* Desktop floating action button — hidden on mobile (mobile uses /chat route) */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 z-40 hidden size-14 overflow-hidden rounded-full shadow-lg md:flex"
        size="icon"
        aria-label="Open AI assistant"
      >
        <SparklesIcon className="relative z-10 size-5" />
        <span className="shimmer-overlay" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "flex w-full flex-col gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-[max-width] duration-300 sm:max-w-[480px]",
            // Widen to fit the draft alongside the conversation
            hasDraft && "lg:max-w-[860px]",
          )}
        >
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                <SparklesIcon className="text-primary size-4" />
              </div>
              <div className="flex-1 text-left">
                <SheetTitle className="text-sm leading-none font-semibold">
                  Caley Assistant
                </SheetTitle>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Powered by Claude
                </p>
              </div>
            </div>
          </SheetHeader>

          {/* Draft summary — collapsible below lg, where the side panel is hidden */}
          {hasDraft && (
            <div className="shrink-0 border-b lg:hidden">
              <button
                type="button"
                onClick={() => setExpandedOnNarrow((v) => !v)}
                className="hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors"
                aria-expanded={expandedOnNarrow}
              >
                <span className="text-xs font-medium">Draft invoice</span>
                <ChevronDownIcon
                  className={cn(
                    "text-muted-foreground ml-auto size-4 transition-transform",
                    expandedOnNarrow && "rotate-180",
                  )}
                />
              </button>
              {expandedOnNarrow && (
                <div className="max-h-72 overflow-y-auto border-t">
                  <DraftInvoicePreview
                    invoiceId={draftInvoiceId!}
                    isGenerating={isGenerating}
                    onNavigate={() => setOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex min-h-0 flex-1">
            <ChatContent className="min-w-0 flex-1" />

            {/* Live draft alongside the conversation */}
            {hasDraft && (
              <aside className="hidden w-[340px] shrink-0 border-l lg:flex lg:flex-col">
                <DraftInvoicePreview
                  invoiceId={draftInvoiceId!}
                  isGenerating={isGenerating}
                  onNavigate={() => setOpen(false)}
                />
              </aside>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
