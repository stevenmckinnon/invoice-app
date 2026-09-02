export { cn } from "cn";

// Helper to parse date strings without timezone shift
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
