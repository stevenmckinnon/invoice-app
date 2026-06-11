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
  <div className="py-12 text-center">
    {Icon && (
      <Icon
        className="text-muted-foreground mx-auto mb-4 h-10 w-10"
        aria-hidden="true"
      />
    )}
    <h3 className="text-base font-semibold">{title}</h3>
    {description && (
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    )}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
