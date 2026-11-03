/**
 * Figures the dashboard shows beside its totals. Pure, so they're tested
 * apart from the page. Callers pass invoices in one currency: nothing here
 * adds pounds to dollars.
 */

type Paid = {
  totalAmount: number;
  status: string;
  paidAt: Date | string | null;
};

/**
 * What was marked paid in the calendar month `now` falls in, by the paid
 * date, not the invoice date: an April invoice paid in November counts in
 * November. Invoices paid before paid dates were recorded have none, so they
 * never count. Void is left out with the rest of the dashboard.
 */
export const paidInMonth = (invoices: Paid[], now: Date) => {
  let amount = 0;
  let count = 0;
  for (const inv of invoices) {
    if (inv.status !== "paid" || !inv.paidAt) continue;
    const paid = new Date(inv.paidAt);
    if (
      paid.getFullYear() !== now.getFullYear() ||
      paid.getMonth() !== now.getMonth() ||
      paid > now
    ) {
      continue;
    }
    amount += Number(inv.totalAmount);
    count += 1;
  }
  return { amount, count };
};

/** The average of a list of totals, or null with nothing to average */
export const averageOf = (amounts: number[]) =>
  amounts.length > 0
    ? amounts.reduce((sum, n) => sum + n, 0) / amounts.length
    : null;
