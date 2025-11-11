"use client";

import { FileText, Home, Plus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth-client";
import { hapticLight } from "@/lib/haptics";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

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
    href: "/clients",
    label: "Clients",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/clients"),
  },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <>
      <div
        className="h-24 md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      />

      <motion.nav
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-x-0 bottom-0 z-50 flex w-full justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] md:hidden"
      >
        <div className="relative flex w-full max-w-xl items-end justify-between gap-3">
          {/* Main pill navigation */}
          <div className="bg-muted/90 relative flex items-center gap-1 rounded-full p-1 shadow-lg shadow-black/5 backdrop-blur">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => hapticLight()}
                  className={cn(
                    "relative flex flex-1 justify-center",
                    !isActive && "text-foreground/35",
                  )}
                >
                  <motion.span
                    layout
                    className="relative inline-flex max-w-full items-center gap-2 rounded-full p-4"
                    transition={{ type: "spring", stiffness: 240, damping: 30 }}
                  >
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 220,
                            damping: 30,
                          }}
                          className="bg-background absolute inset-0 rounded-full shadow"
                        />
                      )}
                    </AnimatePresence>

                    <motion.span
                      layout
                      animate={{
                        scale: isActive ? 1.04 : 0.96,
                        opacity: isActive ? 1 : 0.55,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 250,
                        damping: 24,
                      }}
                      className="relative z-10"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.span>

                    <motion.span
                      layout
                      initial={false}
                      animate={{
                        width: isActive ? "auto" : 0,
                        opacity: isActive ? 1 : 0,
                        marginLeft: isActive ? 4 : 0,
                      }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="text-foreground relative z-10 overflow-hidden text-sm font-semibold whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  </motion.span>
                </Link>
              );
            })}
          </div>

          {/* Floating create button */}
          <Button
            asChild
            size="lg"
            variant="default"
            className="bg-foreground text-background absolute right-0 h-14 w-14 rounded-full shadow-lg shadow-black/20 transition-transform active:scale-95"
          >
            <Link href="/invoices/new" onClick={() => hapticLight()}>
              <Plus className="size-6" />
              <span className="sr-only">Create Invoice</span>
            </Link>
          </Button>
        </div>
      </motion.nav>
    </>
  );
};
