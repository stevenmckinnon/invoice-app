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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import WWELogo from "@/components/WWELogo";
import {
  ThemeToggleButton,
  useThemeTransition,
} from "./ui/shadcn-io/theme-toggle-button";

export const AppHeader = () => {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
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
