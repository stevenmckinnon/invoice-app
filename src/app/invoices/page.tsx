"use client";
import { useEffect, useState } from "react";

import {
  PlusIcon,
  SearchIcon,
  EyeIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Helper to format date without timezone shift
const formatDate = (dateStr: Date | string) => {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  showName: string;
  fullName: string;
  clientName: string | null;
  totalAmount: number;
  status: string;
};

const ITEMS_PER_PAGE = 10;

export default function AllInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

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
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalRevenue = filteredInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0,
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="font-oswald text-4xl font-bold tracking-tight">
            All Invoices
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            {filteredInvoices.length} invoice
            {filteredInvoices.length !== 1 ? "s" : ""} • Total: £
            {totalRevenue.toFixed(2)}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shadow-md transition-shadow hover:shadow-lg"
        >
          <Link href="/invoices/new">
            <PlusIcon className="h-5 w-5" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Search by invoice number, show name, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <CardHeader>
          <CardTitle className="text-xl">
            {statusFilter === "all"
              ? "All Invoices"
              : `${
                  statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                } Invoices`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Show/Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
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
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
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
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-sm font-medium">
                {searchQuery || statusFilter !== "all"
                  ? "No invoices match your filters"
                  : "No invoices yet"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  asChild
                  className="mt-6 shadow-md transition-shadow hover:shadow-lg"
                >
                  <Link href="/invoices/new">
                    <PlusIcon className="h-4 w-4" />
                    Create Invoice
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Show/Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
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
                        £{Number(invoice.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/invoices/${invoice.id}`}>
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
                            invoiceDate={invoice.invoiceDate}
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
