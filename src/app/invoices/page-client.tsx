"use client";
import { useState } from "react";

import {
  PlusIcon,
  SearchIcon,
  EyeIcon,
  ChevronLeft,
  ChevronRight,
  FileTextIcon,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoices } from "@/hooks/use-invoices";
import { formatCurrency, formatDate } from "@/lib/utils";

const ITEMS_PER_PAGE = 10;

export default function AllInvoicesPage() {
  const { data: invoices = [], isLoading, error } = useInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

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

      return matchesSearch && matchesStatus;
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

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const totalRevenue = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0,
  );

  // Aggregate total needs one display currency — use the list's most common
  const currencyCounts = new Map<string, number>();
  for (const inv of filteredInvoices) {
    currencyCounts.set(
      inv.currency,
      (currencyCounts.get(inv.currency) ?? 0) + 1,
    );
  }
  const displayCurrency =
    [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "GBP";

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
        subtitle={
          <>
            {filteredInvoices.length} invoice
            {filteredInvoices.length !== 1 ? "s" : ""} • Total:{" "}
            {formatCurrency(totalRevenue, displayCurrency)}
          </>
        }
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <PlusIcon />
              Create Invoice
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Search by invoice number, show name, or client..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Show/Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
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
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : paginatedInvoices.length === 0 ? (
            <EmptyState
              icon={FileTextIcon}
              title={
                searchQuery || statusFilter !== "all"
                  ? "No invoices match your filters"
                  : "No invoices yet"
              }
              description={
                searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Get started by creating your first invoice."
              }
              action={
                !searchQuery &&
                statusFilter === "all" && (
                  <Button asChild>
                    <Link href="/invoices/new">
                      <PlusIcon />
                      Create Invoice
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Show/Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.showName}</TableCell>
                      <TableCell>{invoice.clientName || "—"}</TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="outline" size="sm">
                                <Link
                                  href={`/invoices/${invoice.id}`}
                                  transitionTypes={["forward"]}
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View invoice</TooltipContent>
                          </Tooltip>
                          <PdfPreviewDialog
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            size="sm"
                            variant="outline"
                            invoiceDate={
                              typeof invoice.invoiceDate === "string"
                                ? new Date(invoice.invoiceDate)
                                : invoice.invoiceDate
                            }
                            showName={invoice.showName}
                            fullName={invoice.fullName}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                      <ChevronLeft className="h-4 w-4" />
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
                      <ChevronRight className="h-4 w-4" />
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
