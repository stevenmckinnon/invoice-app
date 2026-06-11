"use client";
import { useEffect, useState } from "react";

import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { PageHeader } from "@/components/PageHeader";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { formatCurrency, formatDate } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default function InvoiceDetailPage({ params }: Props) {
  const router = useRouter();
  const updateInvoiceStatusMutation = useUpdateInvoiceStatus();
  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const { data: invoice, isLoading: loading, error } = useInvoice(invoiceId);

  // Extract invoice ID from params
  useEffect(() => {
    params.then((p) => setInvoiceId(p.id));
  }, [params]);

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    updateInvoiceStatusMutation.mutate({
      id: invoice.id,
      status: newStatus as "draft" | "sent" | "paid" | "overdue",
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-4">
        <Skeleton className="mb-4 h-10 w-24" />
        <div className="grid gap-4">
          <div className="flex flex-col items-start justify-between gap-2 md:flex-row">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-40" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-6xl items-center justify-center py-8">
        <div className="space-y-4 text-center">
          <p className="text-2xl font-semibold">Invoice not found</p>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "The invoice you're looking for doesn't exist or you don't have permission to view it."}
          </p>
          <Button asChild>
            <Link href="/invoices" transitionTypes={["back"]}>
              Back to Invoices
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Calculate overtime costs
  const overtimeEntries = invoice.overtimeEntries || [];
  const customExpenses = invoice.customExpenseEntries || [];

  // Calculate regular rate dynamically from Work Days unit price (10% since a day is 10 hours)
  const workDaysItem = invoice.items.find(
    (item) => item.description === "Work Days",
  );
  const regularRate =
    workDaysItem && Number(workDaysItem.unitPrice) > 0
      ? Number(workDaysItem.unitPrice) * 0.1
      : 0; // No default

  // Combine all items into one array
  type CombinedItem = {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    cost: number;
    type: "item" | "overtime" | "expense";
  };

  const allItems: CombinedItem[] = [
    ...invoice.items
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        cost: Number(item.cost),
        type: "item" as const,
      })),
    ...overtimeEntries.map((ot) => {
      const multiplier = ot.rateType === "1.5x" ? 1.5 : 2;
      const hourlyRate = regularRate * multiplier;
      const hours = Number(ot.hours);
      return {
        id: ot.id,
        description: `Overtime (${ot.rateType}) - ${formatDate(ot.date)}`,
        quantity: hours,
        unitPrice: hourlyRate,
        cost: hours * hourlyRate,
        type: "overtime" as const,
      };
    }),
    ...customExpenses.map((exp) => ({
      id: exp.id,
      description: exp.description,
      quantity: exp.quantity,
      unitPrice: Number(exp.unitPrice),
      cost: Number(exp.cost),
      type: "expense" as const,
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden p-6 py-10 md:px-6 md:pb-8">
      <div className="grid gap-6">
        <PageHeader
          title={`Invoice ${invoice.invoiceNumber}`}
          subtitle={invoice.showName}
          backHref="/invoices"
          actions={
            <>
              <Select
                value={invoice.status}
                onValueChange={handleStatusChange}
                disabled={updateInvoiceStatusMutation.isPending}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map(({ value, label, dotClass }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${dotClass}`}
                        />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button asChild variant="outline">
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  transitionTypes={["forward"]}
                >
                  <PencilIcon /> Edit
                </Link>
              </Button>
              <PdfPreviewDialog
                variant="outline"
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                invoiceDate={
                  typeof invoice.invoiceDate === "string"
                    ? new Date(invoice.invoiceDate)
                    : invoice.invoiceDate
                }
                showName={invoice.showName}
                fullName={invoice.fullName}
              />
              <DeleteInvoiceButton
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                onDeleted={() => router.push("/invoices")}
              />
            </>
          }
        />
        <Card className="overflow-hidden">
          <CardContent className="overflow-x-auto pt-6">
            <div className="min-w-full">
              <Table className="w-full min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-[200px]">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {item.type}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.cost, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-right text-base font-semibold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="text-right text-base font-semibold">
                      {formatCurrency(
                        Number(invoice.totalAmount),
                        invoice.currency,
                      )}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
