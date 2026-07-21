/**
 * Overtime is billed off the day rate rather than a rate of its own, so the
 * derivation lives here — shared by the editor, the invoice detail page, the
 * chat draft preview, the chat tools and the PDF, which must all agree.
 */

/**
 * The column is a plain string in the DB, so the helpers take `string` and
 * treat anything that isn't "1.5x" as double time — the behaviour every call
 * site already had.
 */
export type OvertimeRateType = "1.5x" | "2x";

/**
 * A working day is 10 hours, so the hourly rate is a tenth of the day rate,
 * which is carried on the "Work Days" line item and varies per client.
 * Returns 0 when there is nothing to derive from rather than guessing, so an
 * unpriced draft reads as zero instead of quietly billing another client's rate.
 */
export const deriveOvertimeHourlyRate = (
  items: Array<{ description: string; unitPrice: number }>,
): number => {
  const workDaysItem = items.find((it) => it.description === "Work Days");
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
