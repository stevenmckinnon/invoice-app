"use client";
import { BubbleChatSpark01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useChatSessionOptional } from "@/components/ai/ChatProvider";
import CaleyLogo from "@/components/CaleyLogo";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { usePrefetchAppData } from "@/hooks/use-prefetch";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import {
  ThemeToggleButton,
  useThemeTransition,
} from "./ui/shadcn-io/theme-toggle-button";

/** Order and labels mirror MobileBottomNav so the two navs agree */
const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/clients", label: "Clients" },
];

export const AppHeader = ({ className }: { className?: string }) => {
  const { data: session, isPending } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { startTransition } = useThemeTransition();
  const { prefetchInvoices, prefetchClients } = usePrefetchAppData();
  const isVisible = useHideOnScroll();
  const chatSession = useChatSessionOptional();

  const prefetchByHref: Record<string, () => void> = {
    "/dashboard": prefetchInvoices,
    "/invoices": prefetchInvoices,
    "/clients": prefetchClients,
  };

  // The landing page is the one place the wordmark has to hold at every width:
  // it is a visitor's first sight of the name, and the reason the app hides it
  // below `sm` — the nav needs the room — does not apply there.
  const isLandingPage = pathname === "/";

  const isNavLinkActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href) && pathname !== "/invoices/new";

  const handleThemeToggle = () => {
    startTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  };

  return (
    <motion.header
      layout
      // Only the landing page earns an entrance. On app routes the header is
      // chrome, and dropping it in on every hard load reads as a layout shift.
      initial={isLandingPage ? { opacity: 0, y: -100 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 right-0 left-0 z-50 mx-auto flex w-full max-w-6xl justify-center transition-transform duration-300 ease-in-out md:top-5 md:w-auto",
        isVisible
          ? "translate-y-0"
          : "-translate-y-full md:-translate-y-[calc(100%+20px)]",
        className,
      )}
    >
      <div
        className="bg-card/90 supports-[backdrop-filter]:bg-card/70 dark:border-border/50 flex w-full items-center justify-between border-transparent px-4 py-3 shadow-sm backdrop-blur-md md:mx-4 md:rounded-2xl md:border md:shadow-md"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
        }}
      >
        {/* Logo */}
        <Link
          href={session?.user ? "/dashboard" : "/"}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <CaleyLogo className="h-8 w-8" />
          <span
            className={cn(
              "text-xl font-bold",
              isLandingPage ? "inline-block" : "hidden sm:inline-block",
            )}
          >
            Caley
          </span>
        </Link>

        {/* Navigation — shares the pill treatment with MobileBottomNav so
            "selected" looks the same on both breakpoints */}
        {session?.user && (
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            <LayoutGroup>
              {navLinks.map(({ href, label }) => {
                const isActive = isNavLinkActive(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    onMouseEnter={prefetchByHref[href]}
                    onFocus={prefetchByHref[href]}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative rounded-full px-3.5 py-1.5 transition-colors duration-200",
                      isActive
                        ? "text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="header-nav-pill"
                        className="bg-foreground absolute inset-0 rounded-full"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </Link>
                );
              })}
            </LayoutGroup>
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* AI assistant trigger — a tool, not a page, so it lives with the
              other utility controls rather than in the nav links */}
          {chatSession && pathname !== "/chat" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => chatSession.setOpen(true)}
              aria-label="Open AI assistant"
              aria-pressed={chatSession.open}
              className={cn(chatSession.open && "bg-accent")}
            >
              <HugeiconsIcon
                icon={BubbleChatSpark01Icon}
                className="size-4.5"
              />
            </Button>
          )}

          {/* Theme Toggle */}
          {!isPending && (
            <ThemeToggleButton
              size="icon"
              theme={theme as "light" | "dark"}
              onClick={handleThemeToggle}
              variant="circle-blur"
              start="top-right"
            />
          )}

          {/* User Menu or Auth Buttons */}
          {!isPending &&
            (session ? (
              <UserMenu user={session.user} />
            ) : (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/auth/signin">Sign in</Link>}
              />
            ))}
        </div>
      </div>
    </motion.header>
  );
};
