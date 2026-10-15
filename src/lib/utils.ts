export { cn } from "cn";

// Helper to parse date strings without timezone shift
/**
 * Where to send the user after sign-in. Only same-origin paths are allowed —
 * "//host" and "/\\host" are protocol-relative to browsers, and anything
 * absolute could be another site or a javascript: URL.
 */
export const safeCallbackUrl = (
  value: string | null | undefined,
  fallback = "/dashboard",
): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value.includes("\\") ? fallback : value;
};

export const parseDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  return new Date(date + "T12:00:00");
};

// Shared display formatters so amounts and dates render identically on every page
const currencyFormatters = new Map<string, Intl.NumberFormat>();

const getCurrencyFormatter = (currency: string, decimals: number) => {
  const key = `${currency}:${decimals}`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt;
};

export const formatCurrency = (
  amount: number,
  currency: string = "GBP",
  { decimals = 2 }: { decimals?: number } = {},
): string => getCurrencyFormatter(currency, decimals).format(amount);

/**
 * Totals per currency, largest first. Amounts in different currencies are
 * never added together — there's no rate that makes £ + $ one number.
 */
export const sumByCurrency = (
  invoices: { currency: string; totalAmount: number | string }[],
): { currency: string; amount: number }[] => {
  const totals = new Map<string, number>();
  for (const inv of invoices) {
    totals.set(
      inv.currency,
      (totals.get(inv.currency) ?? 0) + Number(inv.totalAmount),
    );
  }
  return [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
};

/** "£14,022.50 + $1,200.00", or a single amount when there's one currency */
export const formatCurrencyTotals = (
  invoices: { currency: string; totalAmount: number | string }[],
  fallbackCurrency = "GBP",
): string => {
  const totals = sumByCurrency(invoices);
  if (totals.length === 0) return formatCurrency(0, fallbackCurrency);
  return totals
    .map(({ currency, amount }) => formatCurrency(amount, currency))
    .join(" + ");
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Time-of-day greeting for the dashboard header.
 *
 * Reads the *viewer's* clock, which can differ from the server's by enough to
 * flip morning/afternoon — whatever renders this needs suppressHydrationWarning.
 * Falls back to "Good morning" when there's no name, since a bare "Morning"
 * reads oddly as a heading on its own.
 */
export const getGreeting = (firstName?: string | null): string => {
  const hour = new Date().getHours();
  const partOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  return firstName
    ? `${partOfDay[0].toUpperCase()}${partOfDay.slice(1)}, ${firstName}`
    : `Good ${partOfDay}`;
};
