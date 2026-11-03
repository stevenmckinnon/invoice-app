"use client";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft01Icon,
  CancelCircleIcon,
  Delete02Icon,
  FileEditIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ConfirmStatusDialog } from "@/components/ConfirmStatusDialog";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { DayStrip } from "@/components/invoice/DayStrip";
import { InvoicePaper } from "@/components/invoice/InvoicePaper";
import { overtimeByDate } from "@/components/invoice/OvertimeCap";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { toStripDays } from "@/lib/day-strip";
import {
  canChangeStatus,
  canCorrectInvoice,
  canDeleteInvoice,
  isBillingLocked,
} from "@/lib/invoice-lifecycle";
import { INVOICE_STATUSES, VOID_STATUS } from "@/lib/invoice-status";
import { summariseInvoice } from "@/lib/invoice-summary";

type Props = { params: Promise<{ id: string }> };

/*
 * One column at the paper's width, in reading order: what the job was, then
 * the invoice itself. Header, strip and paper share both edges. Invoices
 * made before days were recorded have no strip, since there are no dates to
 * draw, and their paper reads from the same stored lines as every other.
 */
const COLUMN = "mx-auto w-full max-w-4xl px-4 pt-6 pb-32 md:px-6 md:pt-10";

export default function InvoiceDetailPage({ params }: Props) {
  const router = useRouter();
  const updateInvoiceStatusMutation = useUpdateInvoiceStatus();
  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirming, setConfirming] = useState<"void" | "draft" | null>(null);
  const { data: invoice, isLoading: loading, error } = useInvoice(invoiceId);

  useEffect(() => {
    params.then((p) => setInvoiceId(p.id));
  }, [params]);

  const view = useMemo(() => {
    if (!invoice) return null;
    return {
      days: toStripDays(invoice.days),
      overtime: overtimeByDate(invoice.overtimeEntries),
      summary: summariseInvoice(invoice),
    };
  }, [invoice]);

  const handleStatusChange = (newStatus: string | null) => {
    if (!invoice || !newStatus) return;
    // Back to draft unlocks the billing, so it takes a deliberate yes
    if (newStatus === "draft") {
      setConfirming("draft");
      return;
    }
    updateInvoiceStatusMutation.mutate({
      id: invoice.id,
      status: newStatus as "sent" | "paid" | "overdue",
    });
  };

  if (loading || (!error && !invoice)) {
    // Shaped like the page: header, then the paper
    return (
      <div className={COLUMN} aria-busy="true">
        <Skeleton className="mb-3 h-8 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="mt-2 h-4 w-56" />
        <div className="bg-card mt-8 space-y-6 rounded-md p-8 shadow-sm dark:border">
          <div className="flex justify-between">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-16 w-32" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice || !view) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-4xl items-center justify-center px-4 py-8">
        <div className="space-y-4 text-center">
          <p className="text-2xl font-semibold">Invoice not found</p>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The invoice you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <Button
            nativeButton={false}
            render={
              <Link href="/invoices" transitionTypes={["back"]}>
                Back to Invoices
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const isVoid = invoice.status === "void";
  const statusOptions = isVoid
    ? [VOID_STATUS]
    : INVOICE_STATUSES.filter(({ value }) =>
        canChangeStatus(invoice.status, value),
      );
  const replacement = invoice.corrections?.find((c) => c.status !== "void");
  const correctable = canCorrectInvoice(invoice.status) && !replacement;

  return (
    <div className={COLUMN}>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2"
        nativeButton={false}
        render={
          <Link href="/invoices" transitionTypes={["back"]}>
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            Invoices
          </Link>
        }
      />

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        {/* The job is the title; the number, which the paper shows large,
            is the subtitle rather than a second headline */}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
            {invoice.showName}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="font-mono">{invoice.invoiceNumber}</span>
            {invoice.clientName ? ` · ${invoice.clientName}` : ""}
          </p>
        </div>

        {/* Phones get two deliberate rows (status and the menu, then Edit
            and PDF side by side) rather than four buttons wrapping into an
            orphan. From md the wrappers dissolve (md:contents) into one row,
            the menu moved last with md:order-last. */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex gap-2 md:contents">
            <Select
              items={statusOptions}
              value={invoice.status}
              onValueChange={handleStatusChange}
              disabled={updateInvoiceStatusMutation.isPending || isVoid}
            >
              <SelectTrigger
                className="h-9 flex-1 md:w-[130px] md:flex-none"
                aria-label="Status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(({ value, label, dotClass }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Delete, void and correct are rare, so they sit behind a menu
                rather than beside the everyday actions */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="More actions"
                    className="md:order-last"
                  />
                }
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {correctable && (
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/invoices/new?corrects=${invoice.id}`)
                    }
                  >
                    <HugeiconsIcon icon={FileEditIcon} />
                    Issue corrected invoice
                  </DropdownMenuItem>
                )}
                {canChangeStatus(invoice.status, "void") && !isVoid && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setConfirming("void")}
                  >
                    <HugeiconsIcon icon={CancelCircleIcon} />
                    Void invoice
                  </DropdownMenuItem>
                )}
                {canDeleteInvoice(invoice.status) && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <HugeiconsIcon icon={Delete02Icon} />
                    Delete invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid grid-cols-2 gap-2 md:contents">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  transitionTypes={["forward"]}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} />
                  {/* Billing is locked once an invoice has gone out, and on
                      invoices made before days */}
                  {invoice.terms && !isBillingLocked(invoice.status)
                    ? "Edit"
                    : "Edit notes"}
                </Link>
              }
            />
            {!isVoid && (
              <PdfPreviewDialog
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                invoiceDate={
                  typeof invoice.invoiceDate === "string"
                    ? new Date(invoice.invoiceDate)
                    : invoice.invoiceDate
                }
                showName={invoice.showName}
                fullName={invoice.fullName}
                status={invoice.status}
              />
            )}
          </div>
          <DeleteInvoiceButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDeleted={() => router.push("/invoices")}
          />
          <ConfirmStatusDialog
            status={confirming}
            invoiceNumber={invoice.invoiceNumber}
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              if (confirming) {
                updateInvoiceStatusMutation.mutate({
                  id: invoice.id,
                  status: confirming,
                });
              }
              setConfirming(null);
            }}
          />
        </div>
      </div>

      {isVoid && (
        <Alert className="mb-8">
          <AlertTitle>This invoice is void</AlertTitle>
          <AlertDescription>
            {replacement ? (
              <span>
                Replaced by{" "}
                <Link
                  href={`/invoices/${replacement.id}`}
                  className="font-mono underline underline-offset-2"
                >
                  {replacement.invoiceNumber}
                </Link>
                . It stays on record and doesn&apos;t count towards your totals.
              </span>
            ) : (
              "It stays on record and doesn't count towards your totals."
            )}
          </AlertDescription>
        </Alert>
      )}
      {invoice.corrects && (
        <p className="text-muted-foreground mb-8 text-sm">
          Replaces{" "}
          <Link
            href={`/invoices/${invoice.corrects.id}`}
            className="font-mono underline underline-offset-2"
          >
            {invoice.corrects.invoiceNumber}
          </Link>
        </p>
      )}

      {view.days.length > 0 && (
        <div className="mb-10">
          <DayStrip
            days={view.days}
            overtime={view.overtime}
            summary={view.summary}
            terms={invoice.terms}
            currency={invoice.currency}
          />
        </div>
      )}

      <InvoicePaper
        invoice={invoice}
        summary={view.summary}
        days={view.days}
        overtime={view.overtime}
      />
    </div>
  );
}
