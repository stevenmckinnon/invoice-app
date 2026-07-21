"use client";

import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { ChatContent } from "@/components/ai/ChatContent";
import { useChatSession } from "@/components/ai/ChatProvider";
import { DraftInvoicePreview } from "@/components/ai/DraftInvoicePreview";
import { Button } from "@/components/ui/button";

/**
 * Full-page assistant — the mobile surface, and a direct link on desktop.
 * Shares one conversation with the drawer via ChatProvider.
 */
export const ChatPageView = () => {
  const router = useRouter();
  const { draftInvoiceId, isGenerating } = useChatSession();

  return (
    <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:z-auto md:h-[calc(100dvh-6rem)] md:bg-transparent md:pt-0 md:pb-0">
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
          <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
            <SparklesIcon className="text-primary size-4" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm leading-none font-semibold">
              Caley Assistant
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Powered by Claude
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <ChatContent className="min-w-0 flex-1" />

        {draftInvoiceId && (
          <aside className="hidden w-[340px] shrink-0 border-l lg:flex lg:flex-col">
            <DraftInvoicePreview
              invoiceId={draftInvoiceId}
              isGenerating={isGenerating}
            />
          </aside>
        )}
      </div>
    </div>
  );
};
