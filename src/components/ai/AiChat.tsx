"use client";
import { useEffect } from "react";

import { Close } from "@hugeicons/core-free-icons";
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
  const { open, setOpen, draftInvoiceId, draftPanelOpen, historyOpen } =
    useChatSession();

  const showDraftAlongside = Boolean(draftInvoiceId) && draftPanelOpen;

  // From xl up the drawer is docked: the page makes room instead of sitting
  // under it, so the assistant's edits stay visible. Widths are capped to a
  // share of the viewport so the page keeps room to work in.
  const dockWidth = showDraftAlongside
    ? historyOpen
      ? "min(64rem, 58vw)"
      : "min(48rem, 52vw)"
    : historyOpen
      ? "min(40rem, 50vw)"
      : "min(26rem, 100vw - 1rem)";

  useEffect(() => {
    const root = document.documentElement;
    if (!open) {
      root.style.removeProperty("--chat-dock-w");
      root.style.removeProperty("--chat-dock");
      return;
    }
    root.style.setProperty("--chat-dock-w", `calc(${dockWidth})`);
    // drawer width + its 0.5rem inset + a 0.5rem gap to the page panel
    root.style.setProperty("--chat-dock", `calc(${dockWidth} + 1rem)`);
    return () => {
      root.style.removeProperty("--chat-dock-w");
      root.style.removeProperty("--chat-dock");
    };
  }, [open, dockWidth]);

  return (
    <>
      {/* Non-modal: the assistant acts on the app's data, so the app has to
          stay readable and clickable while it's open. */}
      <Sheet
        open={open}
        onOpenChange={(nextOpen, eventDetails) => {
          // Clicking into the app behind the panel must not dismiss it
          if (
            eventDetails.reason === "outside-press" ||
            eventDetails.reason === "focus-out"
          ) {
            eventDetails.cancel();
            return;
          }
          setOpen(nextOpen);
        }}
        modal={false}
      >
        <SheetContent
          side="right"
          overlay={false}
          // Open ready to type, except by touch, where it would raise the
          // keyboard over the conversation
          initialFocus={(openType) =>
            openType === "touch"
              ? true
              : document.querySelector<HTMLElement>(
                  '[role="dialog"] textarea',
                )
          }
          // The header carries its own close button, in line with the rest of
          // the controls rather than floating over the conversation
          closeButton={false}
          className={cn(
            // A floating card rather than an edge-to-edge sheet — the same
            // surface language as every other panel in the app. max-w-none is
            // required at the sm: breakpoint too — the base sets sm:max-w-sm,
            // and a bare max-w-none is a different modifier group, so
            // tailwind-merge keeps both and the media query wins.
            "bg-background inset-y-4 right-4 flex h-auto w-[min(26rem,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-xl sm:max-w-none md:border-none",
            // Width comes from --chat-dock-w (set above), which main's right
            // edge also follows. Below lg the panel floats over the page.
            "motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out lg:w-[var(--chat-dock-w,26rem)]",
            // Docked, it is a pane of the same frame as the page panel: same
            // 0.5rem insets top, bottom and right, same shadow
            "xl:inset-y-2 xl:right-[max(0.5rem,env(safe-area-inset-right))] xl:shadow-sm dark:xl:shadow-none",
          )}
        >
          <ChatSurface
            // Same cream canvas as the page panel, so the composer and the
            // user's messages are the white cards, as on /chat
            surface="canvas"
            title={
              <SheetTitle className="text-sm leading-none font-semibold">
                Caley Assistant
              </SheetTitle>
            }
            trailing={
              <SheetClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close assistant"
                  />
                }
              >
                <HugeiconsIcon icon={Close} className="size-4" />
              </SheetClose>
            }
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};
