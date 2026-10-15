"use client";
import {
  Logout01Icon,
  Settings01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { AVATAR_TINT_CLASS, avatarTintStyle } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  /** `header` shows the first name beside the avatar; `rail` is avatar-only
   *  until the rail expands, then a name + email row */
  variant?: "header" | "rail";
  side?: React.ComponentProps<typeof DropdownMenuContent>["side"];
  align?: React.ComponentProps<typeof DropdownMenuContent>["align"];
}

/** Shared by AppHeader and AppRail so the account menu can't drift between them */
export const UserMenu = ({
  user,
  variant = "header",
  side = "bottom",
  align = "end",
}: UserMenuProps) => {
  const isRail = variant === "rail";
  const initial = (user.name?.[0] || user.email?.[0] || "U").toUpperCase();
  // Keyed on the id so renaming yourself keeps your colour
  const tintStyle = avatarTintStyle(user.id || user.email || "");

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            aria-label={isRail ? "Account menu" : undefined}
            className={cn(
              "h-9 gap-2 px-2",
              isRail &&
                "rail-expanded:w-full rail-expanded:justify-start rail-expanded:gap-3 rail-expanded:px-1.5 size-10 rounded-xl",
            )}
          />
        }
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image || undefined} alt="Profile photo" />
          <AvatarFallback
            className={cn("text-xs font-semibold", AVATAR_TINT_CLASS)}
            style={tintStyle}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
        {isRail ? (
          <span className="rail-expanded:flex hidden min-w-0 flex-col text-left">
            <span className="truncate text-sm leading-tight font-medium">
              {user.name || "User"}
            </span>
            <span className="text-muted-foreground truncate text-xs leading-tight font-normal">
              {user.email}
            </span>
          </span>
        ) : (
          <span className="hidden text-sm sm:inline-block">
            {user.name?.split(" ")[0] || user.email}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarImage
                  src={user.image || undefined}
                  alt="Profile photo"
                />
                <AvatarFallback
            className={cn("text-xs font-semibold", AVATAR_TINT_CLASS)}
            style={tintStyle}
          >
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className="text-muted-foreground text-xs">{user.email}</p>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/profile" className="cursor-pointer" />}
        >
          <HugeiconsIcon icon={UserIcon} className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/settings" className="cursor-pointer" />}
        >
          <HugeiconsIcon icon={Settings01Icon} className="mr-2 h-4 w-4" />
          Account Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 dark:text-red-400"
        >
          <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
