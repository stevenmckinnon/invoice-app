/**
 * The five line items every invoice carries, matching the manual new-invoice
 * form's defaults.
 *
 * These strings are load-bearing, not labels: overtime is priced by finding the
 * "Work Days" item by exact description (see `deriveOvertimeHourlyRate`), and
 * the chat tools merge model-supplied items onto these by description. They
 * live here so the AI tool schema, the merge logic and the overtime derivation
 * cannot drift apart.
 */
export const STANDARD_LINE_ITEMS = [
  "Travel Days",
  "Work Days",
  "Dark days",
  "Per Diems Travel Days",
  "Per Diems Work Days",
] as const;

export type StandardLineItem = (typeof STANDARD_LINE_ITEMS)[number];

/** The item overtime derives its hourly rate from. */
export const WORK_DAYS_ITEM: StandardLineItem = "Work Days";

/**
 * Splits a stored invoice's rows back into the standard five and everything
 * else, so the two can be replaced independently on an update.
 */
export const isStandardLineItem = (
  description: string,
): description is StandardLineItem =>
  (STANDARD_LINE_ITEMS as readonly string[]).includes(description);
