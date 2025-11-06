"use client";

import { FileText, Home, Plus, Settings, Users } from "lucide-react";
import { motion } from "motion/react";
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
    isActive: (pathname) =>
      pathname.startsWith("/invoices") && pathname !== "/invoices/new",
  },
  {
    href: "/invoices/new",
    label: "New Invoice",
    icon: Plus,
    isActive: (pathname) => pathname === "/invoices/new",
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

  // Don't show bottom nav if user is not logged in
  if (!session?.user) {
    return null;
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div
        className="h-20 md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      />

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed right-0 bottom-0 left-0 z-50 flex w-full justify-center md:hidden"
      >
        {/* iOS-style Navigation Container with enhanced blur */}
        <div 
          className="relative w-full border-t border-black/10 bg-white/80 backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-black/60"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) / 2)",
          }}
        >
          {/* Navigation Items */}
          <div className="relative flex w-full items-center justify-center gap-0.5 px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => hapticLight()}
                  className={cn(
                    "relative flex w-[85px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-all duration-200 ease-out",
                    "active:scale-95 active:opacity-70",
                    isActive ? "text-primary" : "text-foreground/60",
                  )}
                >
                  {/* Active Background Indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="bg-primary/10 absolute inset-0 rounded-2xl"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}

                  {/* Icon */}
                  <div className="relative z-10">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive && "scale-110",
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "relative z-10 text-[10px] font-medium transition-all duration-200",
                      isActive ? "opacity-100" : "opacity-60",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </>
  );
};
