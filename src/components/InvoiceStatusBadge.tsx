import { getInvoiceStatusConfig } from "@/lib/invoice-status";
import { cn } from "@/lib/utils";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export const InvoiceStatusBadge = ({
  status,
  className,
}: InvoiceStatusBadgeProps) => {
  const config = getInvoiceStatusConfig(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        config.badgeClass,
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
};
