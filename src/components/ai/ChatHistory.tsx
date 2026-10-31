"use client";

import { useState } from "react";

import {
  Cancel01Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useChatSession } from "@/components/ai/ChatProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatConversations } from "@/hooks/use-chat-conversations";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", then the date: enough to tell chats apart */
const whenLabel = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  if (date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_MS) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

/**
 * Past chats, newest first, with New chat at the top. It is a panel, not a
 * popup: ChatSurface puts it beside the conversation on /chat and over it
 * elsewhere. `onDone` is given only for the overlay, where picking a chat or
 * starting a new one should put the panel away again.
 *
 * The list is read whenever the panel opens (and when the window regains
 * focus), so a chat started on the phone is here on the laptop. Deleting asks
 * first: it can't be undone, and a hover-only button is easy to hit on touch.
 */
export const ChatHistoryPanel = ({ onDone }: { onDone?: () => void }) => {
  const {
    conversationId,
    messages,
    newChat,
    openConversation,
    deleteConversation,
    historyOpen,
  } = useChatSession();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } =
    useChatConversations(historyOpen);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 justify-start gap-2"
          // Nothing to start over from until something has been said
          disabled={messages.length === 0}
          onClick={() => {
            newChat();
            onDone?.();
          }}
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
          New chat
        </Button>
        {onDone && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close chat history"
            onClick={onDone}
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-muted-foreground px-4 pb-1 text-xs font-medium">
        Chats
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <div className="space-y-2 p-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {/* A failed refresh keeps showing the list it has; only say so with nothing to show */}
        {isError && !data && (
          <div className="p-2 text-sm">
            <p className="text-muted-foreground">
              Couldn&apos;t load your chats.
            </p>
            <Button
              variant="link"
              className="h-auto p-0"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        )}

        {data && data.length === 0 && (
          <p className="text-muted-foreground p-2 text-sm">
            Chats you have with the assistant are kept here, on every device.
          </p>
        )}

        {data && data.length > 0 && (
          <ul className="space-y-0.5">
            {data.map((chat) => {
              const active = chat.id === conversationId;
              return (
                <li key={chat.id} className="flex items-center gap-1">
                  {confirmingId === chat.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        Delete this chat?
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setConfirmingId(null);
                          void deleteConversation(chat.id);
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingId(null)}
                      >
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={async () => {
                          if (await openConversation(chat.id)) onDone?.();
                        }}
                        className={cn(
                          "hover:bg-muted flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1.5 text-left transition-colors",
                          active && "bg-muted",
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {chat.title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {whenLabel(chat.updatedAt)}
                        </span>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete chat: ${chat.title}`}
                        onClick={() => setConfirmingId(chat.id)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
