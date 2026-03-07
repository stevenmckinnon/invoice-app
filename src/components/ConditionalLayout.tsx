"use client";

import { usePathname } from "next/navigation";

import { AiChat } from "@/components/ai/AiChat";
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

  return (
    <>
      <AppHeader />
      <main className="mx-auto pt-12 md:pt-24">
        {children}
      </main>
      {!isChatPage && <MobileBottomNav />}
      <AiChat />
    </>
  );
};
