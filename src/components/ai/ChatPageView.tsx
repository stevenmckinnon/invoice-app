"use client";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";

import { ChatSurface } from "@/components/ai/ChatSurface";
import { Button } from "@/components/ui/button";

/**
 * Full-page assistant — the mobile surface, and a direct link on desktop.
 * Shares one conversation with the drawer via ChatProvider.
 */
export const ChatPageView = () => {
  const router = useRouter();

  return (
    // Full-bleed on mobile. On desktop it sits straight on the page canvas
    // rather than in a card — the app panel is already the surface, and a
    // card here put the composer four layers deep.
    // No page padding below the composer: with no card edge to hold off the
    // panel's, the composer's own pb is the whole gap. The height is the
    // panel (100dvh minus its 0.5rem inset top and bottom) less the pt-4.
    <div className="mx-auto w-full max-w-6xl md:px-6 md:pt-4">
      <div className="bg-background fixed inset-0 z-50 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:z-auto md:h-[calc(100dvh-2rem)] md:pt-0 md:pb-0">
        <ChatSurface
          surface="canvas"
          leading={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 md:hidden"
              aria-label="Go back"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </Button>
          }
          title={
            <p className="text-sm leading-none font-semibold">
              Caley Assistant
            </p>
          }
        />
      </div>
    </div>
  );
};
