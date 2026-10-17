/**
 * Reads an invoice's stored billing into the groups the invoice page shows:
 * the strip's legend and the paper's line groups. Every amount comes from
 * the stored line items, overtime entries and expenses, never re-billed in
 * the browser, so the page can't disagree with the PDF or the dashboard.
 */
import type { InvoiceTerms } from "@/lib/billing";
import { STANDARD_LINE_ITEMS, isStandardLineItem } from "@/lib/invoice-items";
import {
  deriveOvertimeHourlyRate,
  overtimeEntryCost,
  overtimeMultiplier,
} from "@/lib/overtime";

interface StoredItem {
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
}

interface StoredOvertime {
  /** ISO timestamp or yyyy-mm-dd; only the date part is used */
  date: Date | string;
  hours: number;
  rateType: string;
}

export interface SummaryLine {
  description: string;
  qty: number;
  unit?: string;
  rate: number;
  amount: number;
  /** Overtime rows: the dates the hours fell on, yyyy-mm-dd */
  dates?: string[];
}

const dateOnly = (value: Date | string) =>
  (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

export const summariseInvoice = ({
  items,
  overtimeEntries,
  customExpenseEntries,
  days = [],
  terms,
}: {
  items: StoredItem[];
  overtimeEntries: StoredOvertime[];
  customExpenseEntries: StoredItem[];
  days?: Array<{ type: string; alsoTravel?: string | null }>;
  terms?: InvoiceTerms | null;
}) => {
  const item = (description: (typeof STANDARD_LINE_ITEMS)[number]) =>
    items.find((i) => i.description === description) ?? {
      description,
      quantity: 0,
      unitPrice: 0,
      cost: 0,
    };

  const hourly = deriveOvertimeHourlyRate(items);
  // One line per date and rate, as the PDFs have always shown it
  const overtimeLines = (() => {
    const lines = new Map<
      string,
      { date: string; rateType: string; hours: number; amount: number }
    >();
    for (const e of overtimeEntries) {
      const rateType = e.rateType === "1.5x" ? "1.5x" : "2x";
      const date = dateOnly(e.date);
      const key = `${date}|${rateType}`;
      const line = lines.get(key) ?? { date, rateType, hours: 0, amount: 0 };
      line.hours += Number(e.hours);
      line.amount += overtimeEntryCost(e, hourly);
      lines.set(key, line);
    }
    return [...lines.values()]
      .filter((l) => l.hours > 0)
      .sort(
        (x, y) =>
          x.date.localeCompare(y.date) || x.rateType.localeCompare(y.rateType),
      );
  })();
  const overtimeAt = (rateType: string) =>
    overtimeLines.filter((l) => l.rateType === rateType);

  // Which days the stored counts include, spelled out on day invoices
  const combo = days.filter((d) => d.type === "work" && d.alsoTravel).length;
  const dark = days.filter((d) => d.type === "dark").length;
  const includes = (parts: Array<string | false>) => {
    const shown = parts.filter(Boolean);
    return shown.length ? ` (incl. ${shown.join(", ")})` : "";
  };
  const comboNote = `${combo} travel + work`;
  const bill = terms?.travelWork.bill;
  const perDiem = terms?.travelWork.perDiem;

  const line = (stored: StoredItem, description: string): SummaryLine => ({
    description,
    qty: stored.quantity,
    rate: stored.unitPrice,
    amount: stored.cost,
  });

  const labour: SummaryLine[] = [
    line(
      item("Travel Days"),
      `Travel days${includes([combo > 0 && bill !== "work" && comboNote])}`,
    ),
    line(
      item("Work Days"),
      `Work days${includes([combo > 0 && bill !== "travel" && comboNote])}`,
    ),
    line(item("Dark days"), "Dark days"),
    ...overtimeLines.map((o) => ({
      description: `Overtime at ${o.rateType.replace("x", "×")}`,
      qty: o.hours,
      unit: "h",
      rate: hourly * overtimeMultiplier(o.rateType),
      amount: o.amount,
      dates: [o.date],
    })),
  ].filter((l) => l.qty > 0);

  const perDiems: SummaryLine[] = [
    line(
      item("Per Diems Travel Days"),
      `Travel days${includes([
        combo > 0 && perDiem === "travel" && comboNote,
        dark > 0 && `${dark} dark`,
      ])}`,
    ),
    line(
      item("Per Diems Work Days"),
      `Work days${includes([combo > 0 && perDiem === "work" && comboNote])}`,
    ),
  ].filter((l) => l.qty > 0);

  // Anything else the old form or the assistant added (kit hire, a fee)
  const other: SummaryLine[] = items
    .filter((i) => !isStandardLineItem(i.description) && i.quantity > 0)
    .map((i) => line(i, i.description));

  const expenses: SummaryLine[] = customExpenseEntries.map((e) =>
    line(e, e.description),
  );

  return {
    labour,
    perDiems,
    other,
    expenses,
    /** For the strip's legend */
    work: { days: item("Work Days").quantity, amount: item("Work Days").cost },
    travel: {
      days: item("Travel Days").quantity,
      amount: item("Travel Days").cost,
    },
    dark: { days: item("Dark days").quantity, amount: item("Dark days").cost },
    overtime: {
      first: overtimeAt("1.5x").reduce((n, l) => n + l.hours, 0),
      after: overtimeAt("2x").reduce((n, l) => n + l.hours, 0),
      amount: overtimeLines.reduce((n, l) => n + l.amount, 0),
    },
    comboDays: combo,
  };
};
