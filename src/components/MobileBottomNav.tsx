"use client";
import {
  FileAttachmentIcon,
  Home01Icon,
  BubbleChatSpark01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, IconSvgElement } from "@hugeicons/react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { usePrefetchAppData } from "@/hooks/use-prefetch";
import { useSession } from "@/lib/auth-client";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  isActive: (pathname: string) => boolean;
}

/**
 * Settings deliberately lives in the header's avatar menu rather than here:
 * five labelled items overflowed a 375px viewport, clipping the first and
 * last. Labels also match page titles, so "Dashboard" rather than "Home".
 */
const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home01Icon,
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileAttachmentIcon,
    isActive: (pathname) => pathname.startsWith("/invoices"),
  },
  {
    href: "/clients",
    label: "Clients",
    icon: UserGroupIcon,
    isActive: (pathname) => pathname.startsWith("/clients"),
  },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { prefetchInvoices, prefetchClients } = usePrefetchAppData();
  const isVisible = useHideOnScroll();

  // Warm the data cache as soon as a nav item is touched, before navigation
  const prefetchByHref: Record<string, () => void> = {
    "/dashboard": prefetchInvoices,
    "/invoices": prefetchInvoices,
    "/clients": prefetchClients,
  };

  // Don't show bottom nav if user is not logged in
  if (!session?.user) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-24 md:hidden" />

      <div className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 flex justify-center md:hidden">
        <AnimatePresence initial={false} mode="wait">
          {isVisible && (
            <motion.nav
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="border-border bg-card/90 pointer-events-auto flex items-center gap-2 rounded-full border p-2 shadow-lg backdrop-blur-xl"
            >
              <LayoutGroup>
                <ul className="m-0 flex list-none items-center gap-1 p-0">
                  {navItems.slice(0, 2).map((item) => {
                    const isActive = item.isActive(pathname);
                    const Icon = item.icon;

                    return (
                      <li key={item.href} className="relative z-10">
                        <Link
                          href={item.href}
                          onClick={() => hapticLight()}
                          onTouchStart={prefetchByHref[item.href]}
                          className={cn(
                            "relative flex items-center gap-2 rounded-full px-3 py-2 transition-colors duration-200 min-[360px]:px-4",
                            !isActive &&
                              "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isActive && "text-background",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="bg-foreground absolute inset-0 rounded-full"
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <HugeiconsIcon
                              icon={item.icon}
                              className="h-5 w-5"
                            />
                            <span className="text-xs font-medium whitespace-nowrap">
                              {item.label}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}

                  {/* AI chat — centre button */}
                  <li key="ai-chat" className="relative z-10">
                    <Link
                      href="/chat"
                      onClick={() => hapticLight()}
                      className={cn(
                        "relative flex flex-col items-center gap-1 rounded-full px-3 py-2 transition-colors duration-200 min-[360px]:px-4",
                        pathname === "/chat"
                          ? "text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-label="Open AI assistant"
                    >
                      {pathname === "/chat" && (
                        <motion.div
                          layoutId="nav-pill"
                          className="bg-foreground absolute inset-0 rounded-full"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                      <HugeiconsIcon
                        icon={BubbleChatSpark01Icon}
                        className="relative z-10 h-5 w-5"
                      />
                      <span className="relative z-10 text-xs font-medium whitespace-nowrap">
                        Ask AI
                      </span>
                    </Link>
                  </li>

                  {navItems.slice(2).map((item) => {
                    const isActive = item.isActive(pathname);
                    const Icon = item.icon;

                    return (
                      <li key={item.href} className="relative z-10">
                        <Link
                          href={item.href}
                          onClick={() => hapticLight()}
                          onTouchStart={prefetchByHref[item.href]}
                          className={cn(
                            "relative flex items-center gap-2 rounded-full px-3 py-2 transition-colors duration-200 min-[360px]:px-4",
                            !isActive &&
                              "text-muted-foreground hover:bg-muted hover:text-foreground",
                            isActive && "text-background",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="bg-foreground absolute inset-0 rounded-full"
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <HugeiconsIcon
                              icon={item.icon}
                              className="h-5 w-5"
                            />
                            <span className="text-xs font-medium whitespace-nowrap">
                              {item.label}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </LayoutGroup>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
