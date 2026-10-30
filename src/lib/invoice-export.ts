/**
 * The year-end export: one CSV row per invoice in a UK tax year (6 April to
 * 5 April), for an accountant or a spreadsheet. Amounts come from the stored
 * rows, grouped as the invoice page groups them (`summariseInvoice`), never
 * re-billed, so the file can't disagree with the invoices. The stored
 * `subtotal*` columns aren't used: day-based invoices leave them at zero.
 */
import { formatFy } from "@/lib/tax-year";

export interface ExportInvoice {
  invoiceNumber: string;
  invoiceDate: Date;
  clientName: string | null;
  showName: string;
  status: string;
  currency: string;
  /** Day rates, travel and dark days, and overtime */
  labour: number;
  perDiems: number;
  /** Expense lines, and any other fee on the invoice */
  expenses: number;
  /** As stored: what the client is asked to pay */
  totalAmount: number;
}

/**
 * Invoice dates are stored at UTC midnight, so the year's bounds are too:
 * `from` is 6 April, `to` is the following 6 April, exclusive (1–5 April
 * belongs to the year that's ending).
 */
export const fyBounds = (fyStart: number) => ({
  from: new Date(Date.UTC(fyStart, 3, 6)),
  to: new Date(Date.UTC(fyStart + 1, 3, 6)),
});

export const exportFilename = (fyStart: number) =>
  `caley-invoices-${formatFy(fyStart).replace("/", "-")}.csv`;

/**
 * A cell as CSV. Anything starting with a character a spreadsheet reads as a
 * formula is prefixed with an apostrophe: a job named "=HYPERLINK(...)" would
 * otherwise run when the file is opened.
 */
export const csvCell = (value: string | number): string => {
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) && typeof value === "string" ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const money = (value: number) => value.toFixed(2);

const COLUMNS = [
  "Invoice number",
  "Invoice date",
  "Client",
  "Job",
  "Status",
  "Currency",
  "Labour",
  "Per diems",
  "Expenses",
  "Total",
] as const;

/** Oldest first, with a byte order mark so Excel reads it as UTF-8 */
export const buildInvoiceCsv = (invoices: ExportInvoice[]): string => {
  const rows = [...invoices]
    .sort(
      (a, b) =>
        a.invoiceDate.getTime() - b.invoiceDate.getTime() ||
        a.invoiceNumber.localeCompare(b.invoiceNumber),
    )
    .map((i) =>
      [
        i.invoiceNumber,
        i.invoiceDate.toISOString().slice(0, 10),
        i.clientName ?? "",
        i.showName,
        i.status,
        i.currency,
        money(i.labour),
        money(i.perDiems),
        money(i.expenses),
        money(i.totalAmount),
      ].map(csvCell),
    );
  const lines = [COLUMNS.map(csvCell), ...rows].map((cells) => cells.join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
};
