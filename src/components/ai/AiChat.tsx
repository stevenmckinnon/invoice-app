"use client";

import { useState } from "react";

import { SparklesIcon } from "lucide-react";

import { ChatContent } from "@/components/ai/ChatContent";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export const AiChat = () => {
  const [open, setOpen] = useState(false);

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
          className="flex w-full flex-col gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:max-w-[480px]"
        >
          <ChatContent variant="drawer" onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};
