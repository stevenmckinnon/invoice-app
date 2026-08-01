/**
 * Overtime is billed off the day rate rather than a rate of its own, so the
 * derivation lives here — shared by the editor, the invoice detail page, the
 * chat draft preview, the chat tools and the PDF, which must all agree.
 */

import { WORK_DAYS_ITEM } from "@/lib/invoice-items";

/**
 * The column is a plain string in the DB, so the helpers take `string` and
 * treat anything that isn't "1.5x" as double time — the behaviour every call
 * site already had.
 */
export const OVERTIME_RATE_TYPES = ["1.5x", "2x"] as const;

export type OvertimeRateType = (typeof OVERTIME_RATE_TYPES)[number];

/**
 * A working day is 10 hours, so the hourly rate is a tenth of the day rate,
 * which is carried on the "Work Days" line item and varies per client.
 * Returns 0 when there is nothing to derive from rather than guessing, so an
 * unpriced draft reads as zero instead of quietly billing another client's rate.
 */
export const deriveOvertimeHourlyRate = (
  items: Array<{ description: string; unitPrice: number }>,
): number => {
  const workDaysItem = items.find((it) => it.description === WORK_DAYS_ITEM);
  return workDaysItem && workDaysItem.unitPrice > 0
    ? workDaysItem.unitPrice * 0.1
    : 0;
};

export const overtimeMultiplier = (
  rateType: OvertimeRateType | string,
): number => (rateType === "1.5x" ? 1.5 : 2);

export const overtimeEntryCost = (
  entry: { hours: number; rateType: OvertimeRateType | string },
  hourlyRate: number,
): number => entry.hours * hourlyRate * overtimeMultiplier(entry.rateType);

/**
 * Some clients pay a higher multiplier past a certain number of overtime hours
 * *in a single day* — WWE bill the first 2 hours at 1.5x and everything after
 * at 2x. The rule is per-client commercial terms, stored alongside their rates.
 */
export interface OvertimeTierRule {
  /** Hours charged at `firstRate` each day before `afterRate` takes over. */
  tierHours: number;
  firstRate: OvertimeRateType;
  afterRate: OvertimeRateType;
}

const asRateType = (value: unknown): OvertimeRateType | null =>
  value === "1.5x" || value === "2x" ? value : null;

/**
 * Reads a client's tiering rule off its saved columns. All three must be set
 * for a rule to exist — a half-filled rule would price overtime by guesswork,
 * so it reads as "no tiering" instead.
 *
 * Takes an unknown-ish shape because the columns arrive as Prisma `Decimal`
 * from the server and as `number | string` from the JSON API.
 */
export const clientOvertimeRule = (
  client: {
    overtimeTierHours?: unknown;
    overtimeFirstRate?: unknown;
    overtimeAfterRate?: unknown;
  } | null,
): OvertimeTierRule | null => {
  if (!client) return null;

  const tierHours = Number(client.overtimeTierHours ?? NaN);
  const firstRate = asRateType(client.overtimeFirstRate);
  const afterRate = asRateType(client.overtimeAfterRate);

  if (!Number.isFinite(tierHours) || tierHours <= 0) return null;
  if (!firstRate || !afterRate) return null;

  return { tierHours, firstRate, afterRate };
};

/**
 * Shapes a client's submitted rule for storage. A rule only means anything with
 * all three parts, so a partial one is stored as no rule at all rather than
 * half-applied at invoice time — matching what `clientOvertimeRule` will read
 * back out.
 */
export const overtimeRuleData = (input: {
  overtimeTierHours?: string | number | null;
  overtimeFirstRate?: string | null;
  overtimeAfterRate?: string | null;
}): {
  overtimeTierHours: number | null;
  overtimeFirstRate: OvertimeRateType | null;
  overtimeAfterRate: OvertimeRateType | null;
} => {
  const cleared = {
    overtimeTierHours: null,
    overtimeFirstRate: null,
    overtimeAfterRate: null,
  };

  const tierHours = input.overtimeTierHours
    ? Number(input.overtimeTierHours)
    : null;
  const firstRate = asRateType(input.overtimeFirstRate);
  const afterRate = asRateType(input.overtimeAfterRate);

  if (tierHours === null || !Number.isFinite(tierHours) || tierHours <= 0) {
    return cleared;
  }
  if (!firstRate || !afterRate) return cleared;

  return {
    overtimeTierHours: tierHours,
    overtimeFirstRate: firstRate,
    overtimeAfterRate: afterRate,
  };
};

/**
 * Splits a day's overtime across the client's tiers, returning one row per
 * rate — which is exactly how `OvertimeEntry` already stores it, so two rows
 * for the same date sum correctly with no pricing changes.
 *
 * `hoursAlreadyLogged` is the overtime already recorded against that same date,
 * so a second entry starts where the first left off rather than getting a fresh
 * allowance at the lower rate. The tier resets per day, never per invoice.
 *
 * Shared by the manual form and the chat tool so typing "5 hours" and asking
 * for "5 hours" produce the same two rows.
 */
export const splitOvertimeHours = (
  hours: number,
  rule: OvertimeTierRule,
  hoursAlreadyLogged = 0,
): Array<{ hours: number; rateType: OvertimeRateType }> => {
  if (hours <= 0) return [];

  const remainingAtFirstRate = Math.max(
    0,
    rule.tierHours - Math.max(0, hoursAlreadyLogged),
  );
  const atFirstRate = Math.min(hours, remainingAtFirstRate);
  const atAfterRate = hours - atFirstRate;

  // One rate covers the whole entry — either it fits inside the tier, the tier
  // is already used up, or the client's two rates are the same
  if (atAfterRate === 0) return [{ hours, rateType: rule.firstRate }];
  if (atFirstRate === 0) return [{ hours, rateType: rule.afterRate }];
  if (rule.firstRate === rule.afterRate)
    return [{ hours, rateType: rule.firstRate }];

  return [
    { hours: atFirstRate, rateType: rule.firstRate },
    { hours: atAfterRate, rateType: rule.afterRate },
  ];
};
