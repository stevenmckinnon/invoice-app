"use client";

import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice } from "@/hooks/use-invoices";
import { deriveOvertimeHourlyRate, overtimeEntryCost } from "@/lib/overtime";
import { formatCurrency } from "@/lib/utils";

interface DraftInvoicePreviewProps {
  invoiceId: string;
  /** Refetch when the assistant stops writing — the draft has just changed */
  isGenerating: boolean;
  onNavigate?: () => void;
}

/**
 * Live view of the draft the assistant is building. Sits beside the
 * conversation so the invoice can be watched taking shape rather than
 * being opened in a separate editor to find out what happened.
 */
export const DraftInvoicePreview = ({
  invoiceId,
  isGenerating,
  onNavigate,
}: DraftInvoicePreviewProps) => {
  const queryClient = useQueryClient();
  const { data: invoice, isLoading, isError } = useInvoice(invoiceId);

  // Tool calls write straight to the DB, so the cached copy goes stale the
  // moment a turn finishes. Refetch on the generating -> idle edge.
  useEffect(() => {
    if (isGenerating) return;
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }, [isGenerating, invoiceId, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // The conversation outlives the invoice — a draft deleted from the invoices
  // page leaves this panel pointing at a 404, which must not spin forever
  if (isError || !invoice) {
    return (
      <p className="text-muted-foreground p-4 text-xs">
        This draft is no longer available — it may have been deleted.
      </p>
    );
  }

  const currency = invoice.currency;
  const overtimeHourlyRate = deriveOvertimeHourlyRate(invoice.items);
  const rows: Array<{ label: string; detail?: string; amount: number }> = [
    ...invoice.items
      .map((item) => ({
        label: item.description,
        detail:
          item.quantity > 1
            ? `${item.quantity} × ${formatCurrency(item.unitPrice, currency)}`
            : undefined,
        amount: item.cost,
      }))
      // Every invoice carries the same fixed set of line items, most of them
      // zero on any given job — empty rows bury the two that matter
      .filter((row) => row.amount !== 0),
    ...invoice.overtimeEntries.map((entry) => ({
      label: "Overtime",
      detail: `${entry.hours}h at ${entry.rateType}`,
      amount: overtimeEntryCost(entry, overtimeHourlyRate),
    })),
    ...invoice.customExpenseEntries.map((entry) => ({
      label: entry.description,
      amount: entry.cost,
    })),
  ];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-semibold">
            {invoice.invoiceNumber}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {invoice.showName}
            {invoice.clientName ? ` · ${invoice.clientName}` : ""}
          </p>
        </div>
        <InvoiceStatusBadge status={invoice.status} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-4 text-xs">
            No line items yet.
          </p>
        ) : (
          <dl className="divide-border/60 divide-y">
            {rows.map((row, i) => (
              <div
                key={`${row.label}-${i}`}
                className="flex items-baseline justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <dt className="truncate text-xs font-medium">{row.label}</dt>
                  {row.detail && (
                    <dd className="text-muted-foreground font-mono text-[11px]">
                      {row.detail}
                    </dd>
                  )}
                </div>
                <dd className="shrink-0 font-mono text-xs">
                  {formatCurrency(row.amount, currency)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="shrink-0 border-t">
        <div className="bg-muted/30 flex items-baseline justify-between px-4 py-3">
          <span className="text-xs font-semibold tracking-wide uppercase">
            Total
          </span>
          <span className="text-primary font-mono text-sm font-bold">
            {formatCurrency(invoice.totalAmount, currency)}
          </span>
        </div>
        <div className="p-3">
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href={`/invoices/${invoiceId}/edit`} onClick={onNavigate}>
              <ExternalLinkIcon className="size-3.5" />
              Open in editor
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
