"use client";
import {
  Logout01Icon,
  BubbleChatSpark01Icon,
  Settings01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useChatSessionOptional } from "@/components/ai/ChatProvider";
import CaleyLogo from "@/components/CaleyLogo";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { usePrefetchAppData } from "@/hooks/use-prefetch";
import { useSession, signOut } from "@/lib/auth-client";
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

export const AppHeader = () => {
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

  const isNavLinkActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href) && pathname !== "/invoices/new";

  const handleSignOut = async () => {
    try {
      await signOut();
      // Use window.location for a hard redirect to ensure session is cleared
      window.location.href = "/auth/signin";
    } catch (error) {
      console.error("Error signing out:", error);
      // Even if signOut fails, redirect to signin
      window.location.href = "/auth/signin";
    }
  };

  const handleThemeToggle = () => {
    startTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed top-0 right-0 left-0 z-50 mx-auto flex w-full max-w-6xl justify-center transition-transform duration-300 ease-in-out md:top-5 md:w-auto",
        isVisible
          ? "translate-y-0"
          : "-translate-y-full md:-translate-y-[calc(100%+20px)]",
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
          <span className="hidden text-xl font-bold sm:inline-block">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={session.user.image || undefined}
                        alt="Profile photo"
                      />
                      <AvatarFallback className="text-foreground text-xs">
                        {(
                          session.user.name?.[0] ||
                          session.user.email?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm sm:inline-block">
                      {session.user.name?.split(" ")[0] || session.user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage
                          src={session.user.image || undefined}
                          alt="Profile photo"
                        />
                        <AvatarFallback className="text-foreground text-xs">
                          {(
                            session.user.name?.[0] ||
                            session.user.email?.[0] ||
                            "U"
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">
                          {session.user.name || "User"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <HugeiconsIcon
                        icon={Settings01Icon}
                        className="mr-2 h-4 w-4"
                      />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-red-600 dark:text-red-400"
                  >
                    <HugeiconsIcon
                      icon={Logout01Icon}
                      className="mr-2 h-4 w-4"
                    />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline">
                <Link href="/auth/signin">Sign in</Link>
              </Button>
            ))}
        </div>
      </div>
    </motion.header>
  );
};
