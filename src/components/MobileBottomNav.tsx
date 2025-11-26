"use client";

import { useEffect, useState } from "react";

import { FileText, Home, Plus, Settings, Users } from "lucide-react";
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
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/90 p-2 shadow-lg backdrop-blur-xl"
            >
              <LayoutGroup>
                <motion.ul
                  layout
                  className="m-0 flex list-none items-center gap-2 p-0"
                >
                  {navItems.map((item) => {
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
                            "relative flex items-center gap-2 rounded-full px-4 py-3 transition-colors duration-200",
                            !isActive &&
                              "text-white/60 hover:bg-white/10 hover:text-white",
                            isActive && "text-black"
                          )}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="absolute inset-0 rounded-full bg-white"
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          )}

                          <div className="relative z-10 flex items-center gap-2">
                            <Icon className="h-5 w-5" />
                            <AnimatePresence mode="popLayout" initial={false}>
                              {isActive && (
                                <motion.span
                                  initial={{
                                    width: 0,
                                    opacity: 0,
                                    filter: "blur(4px)",
                                  }}
                                  animate={{
                                    width: "auto",
                                    opacity: 1,
                                    filter: "blur(0px)",
                                  }}
                                  exit={{
                                    width: 0,
                                    opacity: 0,
                                    filter: "blur(4px)",
                                  }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30,
                                  }}
                                  className="overflow-hidden whitespace-nowrap text-sm font-medium"
                                >
                                  {item.label}
                                </motion.span>
                              )}
                            </AnimatePresence>
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
