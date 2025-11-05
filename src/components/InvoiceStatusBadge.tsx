import { cn } from "@/lib/utils";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export const InvoiceStatusBadge = ({
  status,
  className,
}: InvoiceStatusBadgeProps) => {
  const statusConfig: Record<
    InvoiceStatus,
    { label: string; className: string }
  > = {
    draft: {
      label: "Draft",
      className:
        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    },
    sent: {
      label: "Sent",
      className:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    },
    paid: {
      label: "Paid",
      className:
        "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    },
    overdue: {
      label: "Overdue",
      className:
        "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    },
  };

  const config = statusConfig[status as InvoiceStatus] || {
    label: status,
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
};
