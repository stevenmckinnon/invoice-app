"use client";

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
      <AppHeader />
      <main className="mx-auto min-h-dvh pt-12 md:pt-24">
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
