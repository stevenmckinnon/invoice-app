"use client";

import { useEffect, useState } from "react";

import { FileText, Home, Settings, Sparkles, Users } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    isActive: (pathname) => pathname === "/dashboard",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
    isActive: (pathname) => pathname.startsWith("/invoices"),
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/clients"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    isActive: (pathname) => pathname.startsWith("/settings"),
  },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  // Don't show bottom nav if user is not logged in
  if (!session?.user) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-24 md:hidden" />

      <div className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 flex justify-center md:hidden">
        <AnimatePresence mode="wait">
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
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/10 bg-white/90 p-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-black/90"
            >
              <LayoutGroup>
                <motion.ul
                  layout
                  className="m-0 flex list-none items-center gap-1 p-0"
                >
                  {navItems.slice(0, 2).map((item) => {
                    const isActive = item.isActive(pathname);
                    const Icon = item.icon;

                    return (
                      <motion.li
                        key={item.href}
                        layout
                        className="relative z-10"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => hapticLight()}
                          className={cn(
                            "relative flex items-center gap-2 rounded-full px-5 py-2 transition-colors duration-200",
                            !isActive &&
                              "text-black/50 hover:bg-black/10 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white",
                            isActive && "text-white dark:text-black",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="absolute inset-0 rounded-full bg-black dark:bg-white"
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <Icon className="h-5 w-5" />
                            <motion.span
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                              className="overflow-hidden text-xs font-medium whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}

                  {/* AI chat — centre button */}
                  <motion.li key="ai-chat" layout className="relative z-10">
                    <Link
                      href="/chat"
                      onClick={() => hapticLight()}
                      className={cn(
                        "relative flex flex-col items-center gap-1 overflow-hidden rounded-full px-4 py-2",
                        pathname === "/chat"
                          ? "text-white dark:text-black"
                          : "text-black/50 dark:text-white",
                      )}
                      aria-label="Open AI assistant"
                    >
                      {pathname === "/chat" && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 rounded-full bg-black dark:bg-white"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                      <Sparkles className="relative z-10 h-5 w-5" />
                      <span className="relative z-10 overflow-hidden text-xs font-medium whitespace-nowrap">
                        Ask AI
                      </span>
                    </Link>
                  </motion.li>

                  {navItems.slice(2).map((item) => {
                    const isActive = item.isActive(pathname);
                    const Icon = item.icon;

                    return (
                      <motion.li
                        key={item.href}
                        layout
                        className="relative z-10"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => hapticLight()}
                          className={cn(
                            "relative flex items-center gap-2 rounded-full px-5 py-2 transition-colors duration-200",
                            !isActive &&
                              "text-black/50 hover:bg-black/10 hover:text-black dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white",
                            isActive && "text-white dark:text-black",
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="absolute inset-0 rounded-full bg-black dark:bg-white"
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <Icon className="h-5 w-5" />
                            <motion.span
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                              className="overflow-hidden text-xs font-medium whitespace-nowrap"
                            >
                              {item.label}
                            </motion.span>
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              </LayoutGroup>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
