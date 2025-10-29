"use client";

import { Home, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth-client";
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
    href: "/invoices/new",
    label: "New",
    icon: PlusCircle,
    isActive: (pathname) => pathname === "/invoices/new",
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
    isActive: (pathname) =>
      pathname.startsWith("/invoices") && pathname !== "/invoices/new",
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
      <div className="h-20 md:hidden" />

      {/* Bottom Navigation */}
      <nav className="fixed right-0 bottom-0 left-0 z-50 flex justify-center md:hidden">
        {/* Glassy Navigation Container */}
        <div className="relative mb-4 rounded-4xl border border-black/10 bg-white/13 shadow-lg backdrop-blur-md backdrop-saturate-[185%] dark:border-white/10 dark:bg-black/20">
          {/* Navigation Items */}
          <div className="relative flex items-center justify-center gap-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex w-[95px] flex-col items-center justify-center gap-1 rounded-3xl px-6 py-2 transition-all duration-300 ease-out",
                    "hover:scale-105 active:scale-95",
                    isActive
                      ? "text-accent-foreground"
                      : "text-foreground hover:text-foreground",
                  )}
                >
                  {/* Active Background Pill */}
                  {isActive && (
                    <div className="bg-accent animate-in fade-in zoom-in-95 absolute inset-0 rounded-3xl shadow-md duration-200" />
                  )}

                  {/* Icon */}
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isActive && "drop-shadow-sm",
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={cn(
                      "relative text-xs font-medium transition-all duration-300",
                      isActive ? "opacity-100" : "opacity-70",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
