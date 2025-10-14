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
