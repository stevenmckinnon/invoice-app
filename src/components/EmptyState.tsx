import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional call to action, e.g. a create button */
  action?: React.ReactNode;
}

/**
 * Standard empty state for lists and cards: consistent icon, copy hierarchy
 * and action placement everywhere data can be empty.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    {Icon && (
      <div
        className="bg-muted text-muted-foreground mb-5 flex size-14 items-center justify-center rounded-2xl"
        aria-hidden="true"
      >
        <Icon className="size-6" />
      </div>
    )}
    <h3 className="text-base font-semibold">{title}</h3>
    {description && (
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
        {description}
      </p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
