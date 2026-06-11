export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

interface InvoiceStatusConfig {
  value: InvoiceStatus;
  label: string;
  /** Solid dot used in status lists, selects and badges */
  dotClass: string;
  /** Tinted pill styling for the status badge */
  badgeClass: string;
}

/**
 * Single source of truth for invoice status display — every dot, badge and
 * select option derives from this so the colour language stays consistent.
 */
export const INVOICE_STATUSES: InvoiceStatusConfig[] = [
  {
    value: "draft",
    label: "Draft",
    dotClass: "bg-gray-500",
    badgeClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  },
  {
    value: "sent",
    label: "Sent",
    dotClass: "bg-blue-500",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  {
    value: "paid",
    label: "Paid",
    dotClass: "bg-green-500",
    badgeClass:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  {
    value: "overdue",
    label: "Overdue",
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
];

export const getInvoiceStatusConfig = (status: string): InvoiceStatusConfig =>
  INVOICE_STATUSES.find((s) => s.value === status) ?? {
    value: "draft",
    label: status,
    dotClass: "bg-gray-500",
    badgeClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
  };
