/**
 * The money in the demo is the product's own: the painted days go through the
 * same `billDays` and `summariseInvoice` the invoice page uses, so a figure on
 * the paper is a figure Caley would really produce. Mallard's terms are the
 * ones the billing tests use.
 */
import {
  type BillableDay,
  type InvoiceTerms,
  BillingError,
  billDays,
} from "@/lib/billing";
import {
  type Summary,
  summariseInvoice,
  summaryTotals,
} from "@/lib/invoice-summary";

export const TERMS: InvoiceTerms = {
  dayRate: 450,
  perDiem: { travel: 60, work: 45 },
  overtimeTier: { tierHours: 2, firstRate: "1.5x", afterRate: "2x" },
  travelWork: { bill: "both", perDiem: "travel" },
};

export type Kind = "work" | "travel";

/** The one day that carries overtime in the story */
export const OT_DATE = "2026-10-15";

export const money = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Overtime hours from what's typed in the field: whole or half hours */
export const hoursOf = (typed: string) => {
  const n = Number(typed);
  return Number.isFinite(n) && n > 0 ? Math.min(14, Math.round(n * 2) / 2) : 0;
};

export interface Bill {
  summary: Summary;
  total: number;
}

const EMPTY: Bill = {
  summary: summariseInvoice({
    items: [],
    overtimeEntries: [],
    customExpenseEntries: [],
  }),
  total: 0,
};

export const billFor = (painted: Record<string, Kind>, typed: string): Bill => {
  const hours = hoursOf(typed);
  const days: BillableDay[] = Object.entries(painted)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, type]) => ({
      date,
      type,
      ...(date === OT_DATE && type === "work" && hours > 0
        ? { overtimeHours: hours }
        : {}),
    }));
  if (days.length === 0) return EMPTY;
  try {
    const bill = billDays({ days, terms: TERMS });
    const summary = summariseInvoice({
      items: bill.items,
      overtimeEntries: bill.overtimeEntries,
      customExpenseEntries: bill.customExpenseEntries,
      days,
      terms: TERMS,
    });
    return { summary, total: summaryTotals(summary).total };
  } catch (error) {
    if (error instanceof BillingError) return EMPTY;
    throw error;
  }
};

/** How a day's overtime splits under the client's tier, as the editor says it */
export const splitText = (hours: number) => {
  const tier = TERMS.overtimeTier!;
  const first = Math.min(hours, tier.tierHours);
  const after = hours - first;
  const rate = (r: string) => r.replace("x", "×");
  if (!hours) return "Hours past a 10-hour day.";
  return after
    ? `${first}h at ${rate(tier.firstRate)} and ${after}h at ${rate(tier.afterRate)}: the rate changes after ${tier.tierHours}h.`
    : `${hours}h at ${rate(tier.firstRate)}.`;
};
