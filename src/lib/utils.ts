import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

/** Currency symbol only (e.g. "£", "€", "US$") — for AnimatedCounter prefixes */
export const currencySymbol = (currency: string = "GBP"): string =>
  getCurrencyFormatter(currency, 0)
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? currency;

export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
