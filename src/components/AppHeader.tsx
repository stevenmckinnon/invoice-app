"use client";

import { useEffect, useState } from "react";

import { User, LogOut, Settings } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

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
import { useSession, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import {
  ThemeToggleButton,
  useThemeTransition,
} from "./ui/shadcn-io/theme-toggle-button";

const SCROLL_THRESHOLD = 200;

export const AppHeader = () => {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { startTransition } = useThemeTransition();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolled to top
      if (currentScrollY < SCROLL_THRESHOLD) {
        setIsVisible(true);
      } else if (
        currentScrollY > lastScrollY &&
        currentScrollY > SCROLL_THRESHOLD
      ) {
        // Scrolling down - hide header
        setIsVisible(false);
      } else {
        // Scrolling up - show header
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlHeader);
    return () => window.removeEventListener("scroll", controlHeader);
  }, [lastScrollY]);

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
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border/50 flex w-full items-center justify-between px-4 py-2 backdrop-blur md:mx-4 md:rounded-4xl md:border">
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

        {/* Navigation */}
        {session?.user && (
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <Link
              href="/dashboard"
              className={`hover:text-foreground/80 transition-colors ${
                pathname === "/dashboard"
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/clients"
              className={`hover:text-foreground/80 transition-colors ${
                pathname.startsWith("/clients")
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              Clients
            </Link>
            <Link
              href="/invoices"
              className={`hover:text-foreground/80 transition-colors ${
                pathname.startsWith("/invoices") && pathname !== "/invoices/new"
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              Invoices
            </Link>
            <Link
              href="/invoices/new"
              className={`hover:text-foreground/80 transition-colors ${
                pathname === "/invoices/new"
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              New Invoice
            </Link>
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {!session?.user && (
            <ThemeToggleButton
              size="icon"
              theme={theme as "light" | "dark"}
              onClick={handleThemeToggle}
              variant="circle-blur"
              start="top-right"
            />
          )}

          {/* User Menu or Auth Buttons */}
          {session ? (
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
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 dark:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
};
