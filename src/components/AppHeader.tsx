"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/ui/shadcn-io/navbar";
import WWELogo from "@/components/WWELogo";

export const AppHeader = () => {
  const { setTheme, theme } = useTheme();
  const { data: session } = useSession();

  const navigationLinks = [{ href: "/", label: "Dashboard" }];

  const handleNavClick = (href: string) => {
    window.location.href = href;
  };

  const handleUserMenuClick = (item: string) => {
    if (item === "logout") {
      signOut();
    } else if (item === "profile") {
      window.location.href = "/profile";
    } else if (item === "settings") {
      window.location.href = "/settings";
    }
  };

  const handleInfoClick = (item: string) => {
    if (item === "help") {
      window.location.href = "/help";
    } else if (item === "documentation") {
      window.location.href = "/docs";
    }
  };

  const handleThemeClick = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Navbar
      logo={<WWELogo />}
      logoHref="/"
      navigationLinks={session?.user ? navigationLinks : []}
      userName={
        session?.user?.fullName ||
        session?.user?.firstName ||
        session?.user?.email ||
        undefined
      }
      userEmail={session?.user?.email || undefined}
      userAvatar={session?.user?.image || undefined}
      notificationCount={0}
      onNavItemClick={handleNavClick}
      onUserItemClick={handleUserMenuClick}
      onInfoItemClick={handleInfoClick}
      className="border-b"
    >
      {/* Theme toggle button in the extra actions slot */}
    </Navbar>
  );
};
