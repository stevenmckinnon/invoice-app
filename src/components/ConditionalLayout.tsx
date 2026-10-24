"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { AiChat } from "@/components/ai/AiChat";
import { ChatProvider } from "@/components/ai/ChatProvider";
import { AppHeader } from "@/components/AppHeader";
import { AppRail } from "@/components/AppRail";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);

  // From md up the content panel is its own scroll container, so Next's
  // scroll-to-top on navigation (which targets the document) never reaches it
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const authRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];

  const isLandingPage = pathname === "/";
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isChatPage = pathname === "/chat";

  // Not wrapped in React's <ViewTransition>: ConditionalLayout returns a
  // completely different element shape per route type (bare <main> here vs.
  // <AppHeader> + <main> on the landing page vs. the full ChatProvider shell
  // below), so switching between them unmounts one tree and mounts another
  // rather than updating in place. Doing that while ViewTransition is mid
  // native-snapshot throws "Cannot read properties of null (removeChild)"
  // and forces React to silently tear down and rebuild the whole root.
  if (isAuthRoute) {
    return <main className="min-h-dvh w-full">{children}</main>;
  }

  if (isLandingPage) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto">{children}</main>
      </>
    );
  }

  return (
    <ChatProvider>
      {/* From md up the rail carries navigation; the header is mobile chrome */}
      <AppHeader className="md:hidden" />
      <div className="bg-sidebar fixed inset-0 hidden md:block" />
      <AppRail />
      {/* Inset panel: the frame is bg-sidebar and the panel is the usual
          canvas, so white cards inside it keep their surface contrast */}
      <main
        ref={panelRef}
        className="md:bg-background dark:md:border-border rail-expanded:left-[calc(14rem+env(safe-area-inset-left))] mx-auto min-h-dvh pt-12 motion-reduce:transition-none md:fixed md:inset-y-2 md:right-[max(0.5rem,env(safe-area-inset-right))] md:left-[calc(4rem+env(safe-area-inset-left))] md:min-h-0 md:overflow-y-auto md:rounded-2xl md:border md:border-transparent md:pt-0 md:shadow-sm md:transition-[left] md:duration-200 md:ease-out dark:md:shadow-none"
      >
        {/* Bottom-nav taps go through here (dashboard/invoices/clients/chat).
            Deliberately not wrapped in ViewTransition: it triggers a native
            full-page snapshot on every navigation, which combined with the
            backdrop-blur nav pill was making every tab switch feel sluggish
            on iOS Safari/PWA. */}
        {children}
      </main>
      {!isChatPage && <MobileBottomNav />}
      <AiChat />
    </ChatProvider>
  );
};
