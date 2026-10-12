"use client";
import {
  Add01Icon,
  BubbleChatSpark01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { useChatSessionOptional } from "@/components/ai/ChatProvider";
import CaleyLogo from "@/components/CaleyLogo";
import { navItems } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/UserMenu";
import { useClients } from "@/hooks/use-clients";
import { useInvoices } from "@/hooks/use-invoices";
import { usePrefetchAppData } from "@/hooks/use-prefetch";
import { useRailExpanded } from "@/hooks/use-rail-expanded";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import {
  ThemeToggleButton,
  useThemeTransition,
} from "./ui/shadcn-io/theme-toggle-button";

const NEW_INVOICE_HREF = "/invoices/new";

/** Icon tile when collapsed, full-width labelled row when expanded */
const RAIL_ACTION =
  "text-muted-foreground hover:text-foreground rail-expanded:w-full rail-expanded:justify-start rail-expanded:gap-3 rail-expanded:px-2.5 rounded-xl";
const RAIL_LABEL = "rail-expanded:inline hidden whitespace-nowrap";

/**
 * Desktop navigation: an icon rail on the `bg-sidebar` frame that surrounds
 * the inset content panel (see ConditionalLayout). Icons carry no captions, so
 * every control has a tooltip and an accessible name.
 *
 * From lg up it can expand into a labelled sidebar. That switch is the
 * `rail-expanded:` CSS variant rather than conditional JSX, and icons keep the
 * same x-offset in both widths so nothing jumps sideways on toggle.
 *
 * Below `md` the AppHeader + MobileBottomNav pair takes over.
 */
export const AppRail = () => {
  const { data: session, isPending } = useSession();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { startTransition } = useThemeTransition();
  const { prefetchInvoices, prefetchClients } = usePrefetchAppData();
  const chatSession = useChatSessionOptional();
  const { expanded, toggle } = useRailExpanded();
  const { data: invoices } = useInvoices();
  const { data: clients } = useClients();

  const countByHref: Record<string, number | undefined> = {
    "/invoices": invoices?.length,
    "/clients": clients?.length,
  };

  const prefetchByHref: Record<string, () => void> = {
    "/dashboard": prefetchInvoices,
    "/invoices": prefetchInvoices,
    "/clients": prefetchClients,
  };

  const isCreatingInvoice = pathname === NEW_INVOICE_HREF;

  const handleThemeToggle = () => {
    startTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  };

  // px-3 + items-start (not items-center) keeps every icon at the same x in
  // both widths, so the width transition only ever reveals labels
  return (
    <aside className="rail-expanded:w-56 rail-expanded:items-stretch fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-start gap-4 overflow-x-clip px-3 py-4 transition-[width] duration-200 ease-out motion-reduce:transition-none md:flex">
      <Link
        href="/dashboard"
        aria-label="Caley dashboard"
        className="rail-expanded:w-auto rail-expanded:justify-start rail-expanded:px-1.5 flex size-10 items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <CaleyLogo className="h-7 w-7" />
        <span className="rail-expanded:inline hidden text-lg font-bold whitespace-nowrap">
          Caley
        </span>
      </Link>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="default"
              size="icon-lg"
              nativeButton={false}
              aria-label="New invoice"
              aria-current={isCreatingInvoice ? "page" : undefined}
              className="rail-expanded:w-full rail-expanded:justify-start rail-expanded:gap-3 rail-expanded:px-2.5 rounded-xl border border-transparent shadow-sm dark:shadow-none"
              render={<Link href={NEW_INVOICE_HREF} />}
            />
          }
        >
          <HugeiconsIcon icon={Add01Icon} className="size-5" />
          <span className="rail-expanded:inline hidden whitespace-nowrap">
            New invoice
          </span>
        </TooltipTrigger>
        {/* Tooltips only stand in for the labels the collapsed rail lacks */}
        <TooltipContent
          side="right"
          sideOffset={10}
          className="rail-expanded:hidden"
        >
          New invoice
        </TooltipContent>
      </Tooltip>

      <nav aria-label="Main" className="rail-expanded:w-full">
        <LayoutGroup>
          <ul className="rail-expanded:items-stretch m-0 flex list-none flex-col items-start gap-1 p-0">
            {navItems.map((item) => {
              // The New invoice button above owns /invoices/new
              const isActive = item.isActive(pathname) && !isCreatingInvoice;

              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Link
                          href={item.href}
                          onMouseEnter={prefetchByHref[item.href]}
                          onFocus={prefetchByHref[item.href]}
                          aria-label={item.label}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "focus-visible:ring-ring/50 rail-expanded:w-full rail-expanded:justify-start rail-expanded:gap-3 rail-expanded:px-2.5 relative flex size-10 items-center justify-center rounded-xl text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-[3px]",
                            isActive
                              ? "text-foreground"
                              : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                          )}
                        />
                      }
                    >
                      {/* Selected is a card on the frame — the same surface
                          treatment as <Card> */}
                      {isActive && (
                        <motion.span
                          layoutId="rail-nav-pill"
                          className="bg-card dark:border-border absolute inset-0 rounded-xl border border-transparent shadow-sm dark:shadow-none"
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                      <HugeiconsIcon
                        icon={item.icon}
                        className="relative z-10 size-5"
                      />
                      <span className="rail-expanded:inline relative z-10 hidden whitespace-nowrap">
                        {item.label}
                      </span>
                      {countByHref[item.href] !== undefined && (
                        <span className="text-muted-foreground rail-expanded:inline relative z-10 ml-auto hidden font-mono text-xs tabular-nums">
                          {countByHref[item.href]}
                        </span>
                      )}
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      sideOffset={10}
                      className="rail-expanded:hidden"
                    >
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </nav>

      {/* A column in both widths: a control that changed position on toggle
          would move the collapse button out from under the cursor */}
      <div className="rail-expanded:items-stretch mt-auto flex flex-col items-start gap-1">
        {chatSession && pathname !== "/chat" && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => chatSession.setOpen(!chatSession.open)}
                  aria-label="Open AI assistant"
                  aria-pressed={chatSession.open}
                  className={cn(RAIL_ACTION, chatSession.open && "bg-accent")}
                />
              }
            >
              <HugeiconsIcon icon={BubbleChatSpark01Icon} className="size-5" />
              <span className={RAIL_LABEL}>Ask AI</span>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="rail-expanded:hidden"
            >
              Ask AI
            </TooltipContent>
          </Tooltip>
        )}

        {!isPending && (
          <ThemeToggleButton
            size="icon"
            theme={theme as "light" | "dark"}
            onClick={handleThemeToggle}
            variant="circle-blur"
            start="bottom-left"
            showLabel
            // The component only renders its label unconditionally, so the
            // collapsed rail hides it from here
            className={cn(
              RAIL_ACTION,
              "rail-expanded:[&>span:last-child]:inline size-10 gap-0 [&>span:last-child]:hidden",
            )}
          />
        )}

        {/* Below lg the rail is always icons, so there is nothing to toggle */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                onClick={toggle}
                aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
                aria-expanded={expanded}
                className={cn(RAIL_ACTION, "hidden lg:inline-flex")}
              />
            }
          >
            <HugeiconsIcon icon={SidebarLeftIcon} className="size-5" />
            <span className={RAIL_LABEL}>Collapse</span>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={10}
            className="rail-expanded:hidden"
          >
            Expand sidebar
          </TooltipContent>
        </Tooltip>

        {!isPending && session && (
          <UserMenu
            user={session.user}
            variant="rail"
            side="top"
            align="start"
          />
        )}
      </div>
    </aside>
  );
};
