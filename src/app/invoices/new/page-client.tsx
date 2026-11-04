"use client";

import {
  InvoiceEditor,
  InvoiceEditorSkeleton,
} from "@/components/invoice-editor/InvoiceEditor";
import { useHolds } from "@/hooks/use-holds";
import { useInvoice } from "@/hooks/use-invoices";

/**
 * New invoices are built from days in the calendar editor. With `corrects`,
 * the new one starts from the issued invoice it replaces; with `hold`, from
 * the pencil it confirms.
 */
export default function NewInvoicePage({
  corrects,
  hold,
}: {
  corrects?: string;
  hold?: string;
}) {
  const { data: original, isLoading } = useInvoice(corrects);
  const { data: holds, isLoading: holdsLoading } = useHolds();
  // The editor takes its starting values once, so it waits for them
  if ((corrects && isLoading) || (hold && holdsLoading)) return <InvoiceEditorSkeleton />;
  // A pencil already confirmed starts a blank invoice rather than a second one
  const fromHold = holds?.find((h) => h.id === hold && h.invoiceId === null);
  return (
    <InvoiceEditor
      correcting={corrects ? original : undefined}
      fromHold={corrects ? undefined : fromHold}
    />
  );
}
