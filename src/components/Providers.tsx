"use client";
import { useEffect } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ThemeColorMeta } from "@/components/theme-color-meta";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mutations invalidate explicitly, so cached data can stay fresh longer —
      // navigating between pages serves from cache instead of re-showing skeletons
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * A pull only means "refresh the page" when it starts on the page itself. A
 * touch inside a scroll container or a fixed layer (the chat overlay, sheets,
 * dialogs, the bottom nav) belongs to that element, even at its scroll top.
 */
const canPullFrom = (target: EventTarget | null): boolean => {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el);
    if (style.position === "fixed") return false;
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      el.scrollHeight > el.clientHeight
    ) {
      return false;
    }
    el = el.parentElement;
  }
  return true;
};

export const Providers = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // @ts-expect-error: 'standalone' is a non-standard property used on iOS Safari
    if (window.navigator.standalone !== true) return;

    // The library's own test is just `!window.scrollY`. That is true for the
    // whole of /chat (a fixed overlay, so the window never scrolls) and inside
    // any sheet, dialog or inner scroller while the page behind is at the top,
    // so dragging a conversation back up reloaded the app. Decide once per
    // gesture, from where the finger landed, before the library sees it.
    let pullAllowed = false;
    const onGestureStart = (event: Event) => {
      pullAllowed = window.scrollY === 0 && canPullFrom(event.target);
    };
    window.addEventListener("touchstart", onGestureStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener("pointerdown", onGestureStart, {
      capture: true,
      passive: true,
    });

    let destroy: (() => void) | undefined;
    let cancelled = false;
    import("pulltorefreshjs").then(({ default: PullToRefresh }) => {
      if (cancelled) return;
      const instance = PullToRefresh.init({
        mainElement: "body",
        shouldPullToRefresh: () => pullAllowed && window.scrollY === 0,
        onRefresh() {
          window.location.reload();
        },
      });
      destroy = () => instance.destroy();
    });

    return () => {
      cancelled = true;
      destroy?.();
      window.removeEventListener("touchstart", onGestureStart, {
        capture: true,
      });
      window.removeEventListener("pointerdown", onGestureStart, {
        capture: true,
      });
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ThemeColorMeta />
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
