/**
 * Turns a job's dated days into the line items, overtime entries and total
 * that Caley stores. The days are what you edit; these outputs are what the
 * PDF, the invoice page and the dashboard read, so they keep working unchanged.
 *
 * Every day-to-money rule lives here and nowhere else. The form, the API and
 * the chat tools all bill through `billDays`, so they can't disagree.
 */

import {
  STANDARD_LINE_ITEMS,
  type StandardLineItem,
} from "@/lib/invoice-items";
import {
  type OvertimeRateType,
  type OvertimeTierRule,
  clientOvertimeRule,
  overtimeEntryCost,
  splitOvertimeHours,
} from "@/lib/overtime";

export type DayType = "work" | "travel" | "dark";
export type TravelDirection = "out" | "home";

export interface BillableDay {
  /** yyyy-mm-dd. One entry per date; a day off is simply absent. */
  date: string;
  type: DayType;
  /** Work days only: travelled that day too ("out" = flew in, "home" = flew home) */
  alsoTravel?: TravelDirection | null;
  /** Travel days only. Display detail; it never changes the bill. */
  direction?: TravelDirection | null;
  /** Work days only: hours past a 10-hour day */
  overtimeHours?: number | null;
}

/**
 * The billing terms an invoice is priced under. Copied from the client when
 * the invoice is created and stored on it, so changing a client's rates later
 * never re-prices an invoice that has already gone out.
 */
export interface InvoiceTerms {
  dayRate: number;
  perDiem: { work: number; travel: number };
  /** Null when the client has no tier: every overtime hour bills at 1.5x */
  overtimeTier: OvertimeTierRule | null;
  /** How a work day that also had travel is billed */
  travelWork: {
    bill: "both" | "work" | "travel";
    perDiem: "travel" | "work";
  };
}

export interface BillableExpense {
  description: string;
  quantity: number;
  unitPrice: number;
}

export class BillingError extends Error {
  name = "BillingError";
}

/** With no tier rule, all overtime is time and a half */
const UNTIERED_RATE: OvertimeRateType = "1.5x";

/** Money is stored to the penny; float sums like 32.97 + 27.66 drift past it */
const toPence = (amount: number) => Math.round(amount * 100) / 100;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const validate = (days: BillableDay[], terms: InvoiceTerms) => {
  const seen = new Set<string>();
  for (const day of days) {
    if (!DATE.test(day.date) || Number.isNaN(Date.parse(day.date))) {
      throw new BillingError(`"${day.date}" isn't a yyyy-mm-dd date.`);
    }
    if (seen.has(day.date)) {
      throw new BillingError(
        `${day.date} appears twice. A date can only be billed once.`,
      );
    }
    seen.add(day.date);
    if (!["work", "travel", "dark"].includes(day.type)) {
      throw new BillingError(
        `${day.date} has an unknown day type "${day.type}".`,
      );
    }
    if (day.type !== "work" && day.alsoTravel) {
      throw new BillingError(
        `${day.date} is a ${day.type} day; only work days can also have travel.`,
      );
    }
    if (day.type !== "travel" && day.direction) {
      throw new BillingError(
        `${day.date} is a ${day.type} day; only travel days have a direction.`,
      );
    }
    const hours = day.overtimeHours ?? 0;
    if (!Number.isFinite(hours) || hours < 0) {
      throw new BillingError(`${day.date} has invalid overtime hours.`);
    }
    if (hours > 0 && day.type !== "work") {
      throw new BillingError(
        `${day.date} is a ${day.type} day; only work days have overtime.`,
      );
    }
  }
  if (days.length && !(terms.dayRate > 0)) {
    throw new BillingError(
      "There's no day rate to bill these days at. Set one on the client.",
    );
  }
};

/**
 * Bills a job. Returns the five standard line items in their usual order
 * (zero-quantity rows included, as every invoice carries them), one overtime
 * entry per day per rate, the expenses as given, and the total.
 */
export const billDays = ({
  days,
  terms,
  expenses = [],
}: {
  days: BillableDay[];
  terms: InvoiceTerms;
  expenses?: BillableExpense[];
}) => {
  validate(days, terms);

  const plain = (type: DayType) =>
    days.filter((day) => day.type === type && !day.alsoTravel).length;
  const combo = days.filter(
    (day) => day.type === "work" && day.alsoTravel,
  ).length;
  const { bill, perDiem } = terms.travelWork;

  const quantities: Record<StandardLineItem, number> = {
    "Travel Days": plain("travel") + (bill === "work" ? 0 : combo),
    "Work Days": plain("work") + (bill === "travel" ? 0 : combo),
    "Dark days": plain("dark"),
    // Dark days take the travel per diem: away from home, no work that day
    "Per Diems Travel Days":
      plain("travel") + plain("dark") + (perDiem === "travel" ? combo : 0),
    "Per Diems Work Days": plain("work") + (perDiem === "work" ? combo : 0),
  };
  const unitPrices: Record<StandardLineItem, number> = {
    "Travel Days": terms.dayRate,
    // Overtime's hourly rate is read back off this row's price (day rate ÷ 10),
    // so it carries the day rate even on a job with no work days
    "Work Days": terms.dayRate,
    "Dark days": terms.dayRate,
    "Per Diems Travel Days": terms.perDiem.travel,
    "Per Diems Work Days": terms.perDiem.work,
  };

  const items = STANDARD_LINE_ITEMS.map((description) => ({
    description,
    quantity: quantities[description],
    unitPrice: unitPrices[description],
    cost: toPence(quantities[description] * unitPrices[description]),
  }));

  // One row per rate per day; the tier is a daily allowance, never per job
  const overtimeEntries = [...days]
    .filter((day) => (day.overtimeHours ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((day) =>
      (terms.overtimeTier
        ? splitOvertimeHours(day.overtimeHours!, terms.overtimeTier)
        : [{ hours: day.overtimeHours!, rateType: UNTIERED_RATE }]
      ).map((row) => ({ date: day.date, ...row })),
    );

  // Only the billed fields, never a spread: the API's expenses carry the
  // browser's temporary ids, which would otherwise be written as primary
  // keys and collide with the next invoice that reuses them
  const customExpenseEntries = expenses.map((expense) => ({
    description: expense.description,
    quantity: expense.quantity,
    unitPrice: expense.unitPrice,
    cost: toPence(expense.quantity * expense.unitPrice),
  }));

  const hourlyRate = terms.dayRate / 10;
  const itemsTotal = items.reduce((sum, item) => sum + item.cost, 0);
  const overtimeTotal = overtimeEntries.reduce(
    (sum, entry) => sum + overtimeEntryCost(entry, hourlyRate),
    0,
  );
  const expensesTotal = customExpenseEntries.reduce(
    (sum, e) => sum + e.cost,
    0,
  );

  return {
    items,
    overtimeEntries,
    customExpenseEntries,
    itemsTotal: toPence(itemsTotal),
    overtimeTotal: toPence(overtimeTotal),
    expensesTotal: toPence(expensesTotal),
    totalAmount: toPence(itemsTotal + overtimeTotal + expensesTotal),
  };
};

const BILL_OPTIONS = ["both", "work", "travel"] as const;
const PER_DIEM_OPTIONS = ["travel", "work"] as const;

/**
 * The terms an invoice for this client would be billed under, or null when
 * the client has no day rate and so can't price a day. Takes loose types
 * because rates arrive as Prisma `Decimal` from the server and as
 * `number | string` from the JSON API.
 */
export const termsFromClient = (client: {
  dayRate?: unknown;
  perDiemWork?: unknown;
  perDiemTravel?: unknown;
  overtimeTierHours?: unknown;
  overtimeFirstRate?: unknown;
  overtimeAfterRate?: unknown;
  travelWorkBill?: unknown;
  travelWorkPerDiem?: unknown;
}): InvoiceTerms | null => {
  const dayRate = Number(client.dayRate ?? NaN);
  if (!Number.isFinite(dayRate) || dayRate <= 0) return null;

  const money = (value: unknown) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const pick = <T extends string>(value: unknown, options: readonly T[]) =>
    (options as readonly unknown[]).includes(value) ? (value as T) : options[0];

  return {
    dayRate,
    perDiem: {
      work: money(client.perDiemWork),
      travel: money(client.perDiemTravel),
    },
    overtimeTier: clientOvertimeRule(client),
    travelWork: {
      bill: pick(client.travelWorkBill, BILL_OPTIONS),
      perDiem: pick(client.travelWorkPerDiem, PER_DIEM_OPTIONS),
    },
  };
};
