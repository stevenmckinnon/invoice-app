import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  /** ReactNode rather than string so callers can wrap client-clock-dependent
      text (the dashboard greeting) in suppressHydrationWarning */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Where the back button points; omit for top-level pages */
  backHref?: string;
  /** Right-aligned slot for page-level actions */
  actions?: React.ReactNode;
}

/**
 * Standard header for all logged-in pages: consistent typography, optional
 * back navigation, and a right-aligned actions slot.
 */
export const PageHeader = ({
  title,
  subtitle,
  backHref,
  actions,
}: PageHeaderProps) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div className="flex items-center gap-4">
      {backHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={backHref} transitionTypes={["back"]} aria-label="Go back">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden md:block">Back</span>
          </Link>
        </Button>
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    )}
  </div>
);
