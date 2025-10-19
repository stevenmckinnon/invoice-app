"use client";

import { useSession, signOut } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Moon, Sun, User, LogOut, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import WWELogo from "@/components/WWELogo";
import { useState } from "react";
import {
  ThemeToggleButton,
  useThemeTransition,
} from "./ui/shadcn-io/theme-toggle-button";

export const AppHeader = () => {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { startTransition } = useThemeTransition();

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  const handleThemeToggle = () => {
    startTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  };

  return (
    <header className="sticky px-4 md:px-0 top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex justify-center">
      <div className="container flex h-16 items-center justify-between">
        {/* Mobile Menu (Hamburger) */}
        <div className="flex items-center gap-2">
          {session?.user && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <WWELogo className="h-6 w-6" />
                    WWE Invoicing
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col px-4 gap-4 mt-4">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-all hover:bg-accent ${
                      pathname === "/dashboard"
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/invoices"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-all hover:bg-accent ${
                      pathname.startsWith("/invoices") &&
                      pathname !== "/invoices/new"
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    Invoices
                  </Link>
                  <Link
                    href="/invoices/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-base transition-all hover:bg-accent ${
                      pathname === "/invoices/new"
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    New Invoice
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          )}
          {/* Logo */}
          <Link
            href={session?.user ? "/dashboard" : "/"}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <WWELogo className="h-8 w-8" />
            <span className="font-bold text-lg hidden sm:inline-block">
              WWE Invoicing
            </span>
          </Link>
        </div>

        {/* Navigation */}
        {session?.user && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-foreground/80 ${
                pathname === "/dashboard"
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/invoices"
              className={`transition-colors hover:text-foreground/80 ${
                pathname.startsWith("/invoices") && pathname !== "/invoices/new"
                  ? "text-foreground font-semibold"
                  : "text-foreground/60"
              }`}
            >
              Invoices
            </Link>
            <Link
              href="/invoices/new"
              className={`transition-colors hover:text-foreground/80 ${
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
          <ThemeToggleButton
            size="icon"
            theme={theme as "light" | "dark"}
            onClick={handleThemeToggle}
            variant="circle-blur"
            start="top-right"
          />

          {/* User Menu or Auth Buttons */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs text-foreground">
                      {(
                        session.user.name?.[0] ||
                        session.user.email?.[0] ||
                        "U"
                      ).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm">
                    {session.user.name?.split(" ")[0] || session.user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {session.user.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
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
    </header>
  );
};
