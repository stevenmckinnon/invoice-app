"use client";
import { useState } from "react";

import { ArrowLeft01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import {
  InvoiceEditor,
  InvoiceEditorSkeleton,
} from "@/components/invoice-editor/InvoiceEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type InvoiceWithRelations,
  useInvoice,
  useUpdateInvoiceNotes,
} from "@/hooks/use-invoices";
import { canCorrectInvoice, isBillingLocked } from "@/lib/invoice-lifecycle";

/**
 * Day-based drafts open in the calendar editor. Billing is locked on anything
 * that has gone out, and on count-based invoices made before days were
 * recorded, which are never converted: only their notes change here, and a
 * mistake is fixed with a corrected invoice.
 */
export default function EditInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);

  if (error) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-4xl items-center justify-center px-4">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Invoice not found"}
        </p>
      </div>
    );
  }
  if (isLoading || !invoice) return <InvoiceEditorSkeleton />;
  if (invoice.terms && !isBillingLocked(invoice.status)) {
    return <InvoiceEditor invoice={invoice} />;
  }
  return <LockedInvoice invoice={invoice} />;
}

/** An issued invoice, or one made before days were recorded: notes only */
function LockedInvoice({ invoice }: { invoice: InvoiceWithRelations }) {
  const updateNotes = useUpdateInvoiceNotes();
  const replaced = invoice.corrections?.some((c) => c.status !== "void");
  const correctable = canCorrectInvoice(invoice.status) && !replaced;
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const changed = notes.trim() !== (invoice.notes ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-32 md:px-6 md:pt-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2"
        nativeButton={false}
        render={
          <Link href={`/invoices/${invoice.id}`} transitionTypes={["back"]}>
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            {invoice.showName}
          </Link>
        }
      />
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Edit notes
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        <span className="font-mono">{invoice.invoiceNumber}</span>
        {invoice.clientName ? ` · ${invoice.clientName}` : ""}
      </p>

      <div className="bg-card mt-8 flex gap-3 rounded-2xl p-5 dark:border">
        <HugeiconsIcon
          icon={LockIcon}
          className="text-muted-foreground mt-0.5 size-5 shrink-0"
        />
        <div className="space-y-3">
          <p className="text-pretty">
            {isBillingLocked(invoice.status)
              ? "This invoice has gone out, so its billing can't change."
              : "This invoice was made before days were recorded, so its billing can't change."}{" "}
            {replaced
              ? "It has already been replaced by a corrected invoice."
              : "If something on it is wrong, issue a corrected invoice."}
          </p>
          {(correctable || !isBillingLocked(invoice.status)) && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <Link
                  href={
                    correctable
                      ? `/invoices/new?corrects=${invoice.id}`
                      : "/invoices/new"
                  }
                  transitionTypes={["forward"]}
                >
                  {correctable ? "Issue corrected invoice" : "New invoice"}
                </Link>
              }
            />
          )}
        </div>
      </div>

      <form
        className="bg-card mt-4 space-y-3 rounded-2xl p-5 dark:border"
        onSubmit={(event) => {
          event.preventDefault();
          updateNotes.mutate({ id: invoice.id, notes });
        }}
      >
        <Label htmlFor="invoice-notes">Notes</Label>
        <Textarea
          id="invoice-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Add a note, like a PO number or payment terms"
          className="min-h-28"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!changed || updateNotes.isPending}>
            {updateNotes.isPending ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
