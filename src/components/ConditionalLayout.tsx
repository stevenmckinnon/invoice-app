"use client";

import { useState } from "react";

import { usePathname } from "next/navigation";

import { AiChat } from "@/components/ai/AiChat";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);

  // Define auth routes where we want to hide the header
  const authRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];

  const isLandingPage = pathname === "/";

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    // Auth pages: no header, full viewport height
    return (
      <main className="h-[100dvh] w-full overflow-hidden">{children}</main>
    );
  }

  if (isLandingPage) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto">{children}</main>
      </>
    );
  }

  // Regular pages: show header, mobile nav, and AI chat
  return (
    <>
      <AppHeader />
      <main className="mx-auto pt-12 md:pt-24">
        {children}
      </main>
      <MobileBottomNav onOpenChat={() => setChatOpen(true)} />
      <AiChat open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};
