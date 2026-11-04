import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * List or Diary: two views of the same work, so they share the Invoices nav
 * item rather than adding a fifth (it doesn't fit at 375px). Links, not tabs,
 * so each view has its own address and the back button works.
 */
export const InvoicesViewSwitch = ({ current }: { current: "list" | "diary" }) => (
  <nav aria-label="Invoices view" className="bg-muted flex w-fit rounded-full p-0.5 text-sm font-medium">
    {(
      [
        { id: "list", label: "List", href: "/invoices" },
        { id: "diary", label: "Diary", href: "/invoices/diary" },
      ] as const
    ).map((view) => (
      <Link
        key={view.id}
        href={view.href}
        aria-current={current === view.id ? "page" : undefined}
        className={cn(
          "rounded-full px-4 py-1.5 transition-colors",
          current === view.id
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {view.label}
      </Link>
    ))}
  </nav>
);
