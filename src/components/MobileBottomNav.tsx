"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

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
    isActive: (pathname) => pathname.startsWith("/invoices") && pathname !== "/invoices/new",
  },
  {
    href: "/invoices/new",
    label: "New",
    icon: PlusCircle,
    isActive: (pathname) => pathname === "/invoices/new",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    isActive: (pathname) => pathname === "/profile",
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Liquid Glass Container */}
        <div className="relative mx-4 mb-4">
          {/* Glass Effect Background */}
          <div className="absolute inset-0 bg-background/80 dark:bg-background/90 backdrop-blur-xl rounded-3xl border border-border/50 shadow-lg" />
          
          {/* Navigation Items */}
          <div className="relative flex items-center justify-around px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.isActive(pathname);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300 ease-out",
                    "hover:scale-105 active:scale-95",
                    isActive
                      ? "text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Active Background Pill */}
                  {isActive && (
                    <div className="absolute inset-0 bg-accent rounded-2xl shadow-md animate-in fade-in zoom-in-95 duration-200" />
                  )}
                  
                  {/* Icon */}
                  <div className="relative">
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isActive && "drop-shadow-sm"
                      )}
                    />
                  </div>
                  
                  {/* Label */}
                  <span
                    className={cn(
                      "relative text-xs font-medium transition-all duration-300",
                      isActive ? "opacity-100" : "opacity-70"
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

