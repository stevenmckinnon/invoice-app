import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
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
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div className="flex items-center gap-4">
      {backHref && (
        <Button asChild variant="outline" size="sm">
          <Link href={backHref} transitionTypes={["back"]} aria-label="Go back">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden md:block">Back</span>
          </Link>
        </Button>
      )}
      <div className="space-y-1">
        <h1 className="font-oswald text-4xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm font-medium">
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
