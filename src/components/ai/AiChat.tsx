"use client";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useChatSession } from "@/components/ai/ChatProvider";
import { ChatSurface } from "@/components/ai/ChatSurface";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const AiChat = () => {
  const { open, setOpen, draftInvoiceId, draftPanelOpen } = useChatSession();

  const showDraftAlongside = Boolean(draftInvoiceId) && draftPanelOpen;

  return (
    <>
      {/* Non-modal: the assistant acts on the app's data, so the app has to
          stay readable and clickable while it's open. */}
      <Sheet open={open} onOpenChange={setOpen} modal={false}>
        <SheetContent
          side="right"
          overlay={false}
          // The header carries its own close button, in line with the rest of
          // the controls rather than floating over the conversation
          closeButton={false}
          // Clicking into the app behind the panel must not dismiss it
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            // A floating card rather than an edge-to-edge sheet — the same
            // surface language as every other panel in the app. max-w-none is
            // required at the sm: breakpoint too — the base sets sm:max-w-sm,
            // and a bare max-w-none is a different modifier group, so
            // tailwind-merge keeps both and the media query wins.
            "bg-card inset-y-4 right-4 flex h-auto w-[min(26rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-xl sm:max-w-none md:border-none",
            // Widen only when the draft is actually showing beside the
            // conversation, so collapsing it gives the width back
            showDraftAlongside && "lg:w-[min(52rem,calc(100vw-2rem))]",
          )}
        >
          <ChatSurface
            title={
              <SheetTitle className="text-sm leading-none font-semibold">
                Caley Assistant
              </SheetTitle>
            }
            trailing={
              <SheetClose asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close assistant">
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
              </SheetClose>
            }
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
