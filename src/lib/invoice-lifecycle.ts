/**
 * What can happen to an invoice once it exists. Pure, so the routes, the
 * assistant's tools and the screens all apply one set of rules.
 *
 * A draft is yours to change or delete. Once it has gone out it is a record:
 * its billing is locked and it can't be deleted. A mistake is fixed by voiding
 * it and issuing a corrected invoice, so the numbering has no gaps.
 */
export const INVOICE_STATUS_VALUES = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUS_VALUES)[number];

export const isBillingLocked = (status: string) => status !== "draft";

export const canDeleteInvoice = (status: string) => status === "draft";

/** Issued invoices can be replaced, including one already voided */
export const canCorrectInvoice = (status: string) => status !== "draft";

/**
 * A voided invoice stays voided. Sent or overdue can go back to draft, for one
 * marked by mistake (the app's Undo after sharing); paid can't, because money
 * has come in against it.
 */
export const canChangeStatus = (from: string, to: string) => {
  if (from === to) return true;
  if (from === "void") return false;
  if (to === "void") return from !== "draft";
  if (to === "draft") return from !== "paid";
  return true;
};

/** The statuses a bulk change may move an invoice out of */
export const statusesThatCanBecome = (to: InvoiceStatus) =>
  INVOICE_STATUS_VALUES.filter((from) => canChangeStatus(from, to));

export const statusChangeRefusal = (from: string, to: string) => {
  if (from === "void") return "This invoice is void, so its status can't change.";
  if (to === "void") return "Only an invoice that has gone out can be voided. Delete a draft instead.";
  return "This invoice has been paid, so it can't go back to draft. Issue a corrected invoice instead.";
};

export const LOCKED_BILLING_MESSAGE =
  "This invoice has gone out, so its billing can't be changed. Issue a corrected invoice instead.";

export const DELETE_REFUSED_MESSAGE =
  "This invoice has gone out, so it can't be deleted. Void it instead.";
