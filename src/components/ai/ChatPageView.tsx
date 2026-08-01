"use client";

import { ArrowLeftIcon } from "lucide-react";
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
    // Full-bleed on mobile; on desktop it becomes a card inside the app's
    // container, like every other page.
    <div className="mx-auto w-full max-w-6xl md:p-6 md:py-10">
      <div className="bg-card dark:md:border-border fixed inset-0 z-50 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:static md:inset-auto md:z-auto md:h-[calc(100dvh-10rem)] md:rounded-2xl md:pt-0 md:pb-0 md:shadow-sm dark:md:border">
        <ChatSurface
          leading={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0 md:hidden"
              aria-label="Go back"
            >
              <ArrowLeftIcon className="size-4" />
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
