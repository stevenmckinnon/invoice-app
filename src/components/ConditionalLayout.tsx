"use client";

import { ViewTransition } from "react";

import { usePathname } from "next/navigation";

import { AiChat } from "@/components/ai/AiChat";
import { ChatProvider } from "@/components/ai/ChatProvider";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();

  const authRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];

  const isLandingPage = pathname === "/";
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isChatPage = pathname === "/chat";

  if (isAuthRoute) {
    return (
      <main className="h-[100dvh] w-full overflow-hidden">
        <ViewTransition>{children}</ViewTransition>
      </main>
    );
  }

  if (isLandingPage) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto">
          <ViewTransition>{children}</ViewTransition>
        </main>
      </>
    );
  }

  return (
    <ChatProvider>
      <AppHeader />
      <main className="mx-auto min-h-dvh pt-12 md:pt-24">
        {/* update="none" keeps navigation enter/exit transitions but opts out
            of animating in-place content changes — otherwise every streamed
            chat chunk counts as an update and flashes the viewport */}
        <ViewTransition update="none">{children}</ViewTransition>
      </main>
      {!isChatPage && <MobileBottomNav />}
      <AiChat />
    </ChatProvider>
  );
};
