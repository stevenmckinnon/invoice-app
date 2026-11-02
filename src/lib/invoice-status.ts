import {
  AlertCircleIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  FileEditIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";

import type { InvoiceStatus } from "./invoice-lifecycle";
import type { IconSvgElement } from "@hugeicons/react";


interface InvoiceStatusConfig {
  value: InvoiceStatus;
  label: string;
  /** Solid dot used in status lists, selects and badges */
  dotClass: string;
  /** Tinted pill styling for the status badge */
  badgeClass: string;
  /** Leading icon for list rows */
  icon: IconSvgElement;
  /** Tinted square behind the row icon — colour always means the status */
  tileClass: string;
}

/**
 * Single source of truth for invoice status display — every dot, badge and
 * select option derives from this so the colour language stays consistent.
 */
export const INVOICE_STATUSES: (InvoiceStatusConfig & {
  value: Exclude<InvoiceStatus, "void">;
})[] = [
  {
    value: "draft",
    label: "Draft",
    dotClass: "bg-gray-500",
    badgeClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    icon: FileEditIcon,
    tileClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    value: "sent",
    label: "Sent",
    dotClass: "bg-blue-500",
    badgeClass:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    icon: SentIcon,
    tileClass: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    value: "paid",
    label: "Paid",
    dotClass: "bg-green-500",
    badgeClass:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    icon: CheckmarkCircle02Icon,
    tileClass:
      "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-300",
  },
  {
    value: "overdue",
    label: "Overdue",
    dotClass: "bg-red-500",
    badgeClass:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    icon: AlertCircleIcon,
    tileClass: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300",
  },
];

/**
 * Kept apart from the list above, which is what you can choose and what the
 * dashboards count: voiding is its own confirmed action, and void isn't owed.
 */
export const VOID_STATUS: InvoiceStatusConfig = {
  value: "void",
  label: "Void",
  dotClass: "bg-stone-400",
  badgeClass:
    "bg-stone-100 text-stone-600 border-stone-200 line-through dark:bg-stone-900 dark:text-stone-400 dark:border-stone-700",
  icon: CancelCircleIcon,
  tileClass:
    "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export const getInvoiceStatusConfig = (status: string): InvoiceStatusConfig =>
  [...INVOICE_STATUSES, VOID_STATUS].find((s) => s.value === status) ?? {
    value: "draft",
    label: status,
    dotClass: "bg-gray-500",
    badgeClass:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    icon: FileEditIcon,
    tileClass: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  };
