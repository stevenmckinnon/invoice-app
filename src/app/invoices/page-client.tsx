"use client";
import { useState } from "react";

import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, FileAttachmentIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { ExportMenu } from "@/components/ExportMenu";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkUpdateInvoiceStatus,
  useInvoices,
} from "@/hooks/use-invoices";
import {
  getInvoiceStatusConfig,
  INVOICE_STATUSES,
} from "@/lib/invoice-status";
import { cn, formatCurrency, formatCurrencyTotals, formatDate } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All statuses" },
  ...INVOICE_STATUSES.map(({ value, label }) => ({ value, label })),
];

export default function AllInvoicesPage() {
  const router = useRouter();
  const { data: invoices = [], isLoading, error } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkUpdate = useBulkUpdateInvoiceStatus();

  const clientFilterItems = [
    { value: "all", label: "All clients" },
    ...[...new Set(invoices.map((inv) => inv.clientName).filter(Boolean))]
      .sort((a, b) => a!.localeCompare(b!))
      .map((name) => ({ value: name!, label: name! })),
  ];

  // Filter and search
  const filteredInvoices = invoices
    .filter((invoice) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(query) ||
        invoice.showName.toLowerCase().includes(query) ||
        invoice.clientName?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      const matchesClient =
        clientFilter === "all" || invoice.clientName === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    })
    .sort(
      (a, b) =>
        new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
    );

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // A filter change resets the page, and drops the selection so nothing
  // hidden by the new filter can be acted on by mistake
  const resetView = () => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    resetView();
  };

  const handleStatusFilterChange = (value: string | null) => {
    if (!value) return;
    setStatusFilter(value);
    resetView();
  };

  const handleClientFilterChange = (value: string | null) => {
    if (!value) return;
    setClientFilter(value);
    resetView();
  };

  const isFiltered =
    Boolean(searchQuery) || statusFilter !== "all" || clientFilter !== "all";

  const pageIds = paginatedInvoices.map((inv) => inv.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const markSelectedPaid = () => {
    bulkUpdate.mutate(
      { ids: [...selectedIds], status: "paid" },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  };

  if (error) {
    return (
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">
              Failed to load invoices. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
      <PageHeader
        title="Invoices"
        actions={
          <div className="flex gap-2">
            <ExportMenu invoiceDates={invoices.map((i) => i.invoiceDate)} />
            <Button
              nativeButton={false}
              render={
                <Link href="/invoices/new">
                  <HugeiconsIcon icon={Add01Icon} />
                  Create Invoice
                </Link>
              }
            />
          </div>
        }
      />

      {/* Invoices: one card, with the toolbar on top. The count and total
          sit beside the filters because they're what the filters change. */}
      <Card>
        <CardContent className="px-3 md:px-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            {selectedIds.size > 0 ? (
              <div
                className="flex min-h-9 items-center gap-2"
                role="status"
                aria-live="polite"
              >
                <span className="text-sm font-semibold tabular-nums">
                  {selectedIds.size} selected
                </span>
                <Button
                  size="sm"
                  onClick={markSelectedPaid}
                  disabled={bulkUpdate.isPending}
                >
                  Mark as paid
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <p className="flex min-h-9 items-center gap-1.5 text-sm">
                <span className="font-semibold tabular-nums">
                  {filteredInvoices.length} invoice
                  {filteredInvoices.length !== 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  · {formatCurrencyTotals(filteredInvoices)}
                </span>
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row lg:ml-auto">
              {clientFilterItems.length > 2 && (
                <Select
                  items={clientFilterItems}
                  value={clientFilter}
                  onValueChange={handleClientFilterChange}
                >
                  <SelectTrigger
                    className="w-full sm:w-[190px]"
                    aria-label="Filter by client"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clientFilterItems.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                items={STATUS_FILTER_ITEMS}
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger
                  className="w-full sm:w-[150px]"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_ITEMS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative sm:w-64">
                <HugeiconsIcon
                  icon={Search01Icon}
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  type="search"
                  placeholder="Search invoices"
                  aria-label="Search by invoice number, project or client"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <>
              {/* Desktop skeleton */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="w-full">Show/Project</TableHead>
                      <TableHead className="hidden xl:table-cell">Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="size-4 rounded-[5px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile skeleton — mirrors the row shape below */}
              <div className="flex flex-col gap-2 md:hidden">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-3">
                    <Skeleton className="size-11 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : paginatedInvoices.length === 0 ? (
            <EmptyState
              icon={FileAttachmentIcon}
              title={
                isFiltered
                  ? "No invoices match your filters"
                  : "No invoices yet"
              }
              description={
                isFiltered
                  ? "Try adjusting your search or filter."
                  : "Get started by creating your first invoice."
              }
              action={
                !isFiltered && (
                  <Button
                    nativeButton={false}
                    render={
                      <Link href="/invoices/new">
                        <HugeiconsIcon icon={Add01Icon} />
                        Create Invoice
                      </Link>
                    }
                  />
                )
              }
            />
          ) : (
            <>
              {/* Desktop table — whole row navigates to the invoice */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Select all invoices on this page"
                          checked={
                            pageIds.length > 0 &&
                            selectedOnPage === pageIds.length
                          }
                          indeterminate={
                            selectedOnPage > 0 &&
                            selectedOnPage < pageIds.length
                          }
                          onCheckedChange={togglePage}
                        />
                      </TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="w-full">Show/Project</TableHead>
                      <TableHead className="hidden xl:table-cell">Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        onClick={() => router.push(`/invoices/${invoice.id}`)}
                        className="cursor-pointer active:bg-muted/60"
                        data-state={
                          selectedIds.has(invoice.id) ? "selected" : undefined
                        }
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${invoice.invoiceNumber}`}
                            checked={selectedIds.has(invoice.id)}
                            onCheckedChange={(checked) =>
                              toggleRow(invoice.id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            transitionTypes={["forward"]}
                            onClick={(e) => e.stopPropagation()}
                            className="focus-visible:ring-ring rounded-sm font-mono text-[0.8125rem] tracking-tight outline-none hover:underline focus-visible:ring-2"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-0 truncate" title={invoice.showName}>
                          {invoice.showName}
                        </TableCell>
                        <TableCell
                          className="hidden max-w-[14rem] truncate xl:table-cell"
                          title={invoice.clientName || undefined}
                        >
                          {invoice.clientName || "—"}
                        </TableCell>
                        <TableCell suppressHydrationWarning>
                          {formatDate(invoice.invoiceDate)}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            Number(invoice.totalAmount),
                            invoice.currency,
                          )}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PdfPreviewDialog
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            size="sm"
                            variant="outline"
                            showText={false}
                            invoiceDate={
                              typeof invoice.invoiceDate === "string"
                                ? new Date(invoice.invoiceDate)
                                : invoice.invoiceDate
                            }
                            showName={invoice.showName}
                            fullName={invoice.fullName}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile rows */}
              <div className="flex flex-col gap-2 md:hidden">
                {paginatedInvoices.map((invoice) => {
                  const status = getInvoiceStatusConfig(invoice.status);

                  return (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      transitionTypes={["forward"]}
                      className="hover:bg-muted/60 active:bg-muted -mx-2 flex items-center gap-3 rounded-3xl px-2 py-3 transition-colors"
                    >
                      <div
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-xl",
                          status.tileClass,
                        )}
                        aria-hidden="true"
                      >
                        <HugeiconsIcon icon={status.icon} className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {invoice.showName}
                          <span className="sr-only"> — {status.label}</span>
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                          <span className="font-mono text-[0.8125rem] tracking-tight">
                            {invoice.invoiceNumber}
                          </span>
                          {invoice.clientName ? ` · ${invoice.clientName}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(
                            Number(invoice.totalAmount),
                            invoice.currency,
                          )}
                        </span>
                        <span
                          className="text-muted-foreground text-xs"
                          suppressHydrationWarning
                        >
                          {formatDate(invoice.invoiceDate)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">
                    Showing {startIndex + 1}-
                    {Math.min(endIndex, filteredInvoices.length)} of{" "}
                    {filteredInvoices.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          // Show first page, last page, current page, and pages around current
                          const showPage =
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 &&
                              page <= currentPage + 1);

                          if (!showPage) {
                            // Show ellipsis
                            if (
                              page === currentPage - 2 ||
                              page === currentPage + 2
                            ) {
                              return (
                                <span
                                  key={page}
                                  className="text-muted-foreground px-2"
                                >
                                  ...
                                </span>
                              );
                            }
                            return null;
                          }

                          return (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          );
                        },
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
