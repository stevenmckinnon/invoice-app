"use client";

import {
  InvoiceEditor,
  InvoiceEditorSkeleton,
} from "@/components/invoice-editor/InvoiceEditor";
import { useInvoice } from "@/hooks/use-invoices";

/**
 * New invoices are built from days in the calendar editor. With `corrects`,
 * the new one starts from the issued invoice it replaces.
 */
export default function NewInvoicePage({ corrects }: { corrects?: string }) {
  const { data: original, isLoading } = useInvoice(corrects);
  // The editor takes its starting values once, so it waits for the original
  if (corrects && isLoading) return <InvoiceEditorSkeleton />;
  return <InvoiceEditor correcting={corrects ? original : undefined} />;
}
