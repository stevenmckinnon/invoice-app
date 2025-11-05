"use client";
import { useCallback, useEffect, useState } from "react";

import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
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
import { Prisma } from "@/generated/prisma";

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    items: true;
    overtimeEntries: true;
    customExpenseEntries: true;
  };
}>;

type Props = { params: Promise<{ id: string }> };

export default function InvoiceDetailPage({ params }: Props) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/invoices/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch invoice:", response.status, errorData);
      }
    } catch (error) {
      console.error("Failed to fetch invoice:", error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success("Status updated", {
          description: `Invoice status changed to ${newStatus}`,
        });
        // Refresh invoice data
        await fetchInvoice();
      } else {
        toast.error("Failed to update status", {
          description: "Please try again later.",
        });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setUpdatingStatus(false);
    }
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
              <Skeleton className="h-10 w-36" />
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

  if (!invoice) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-6xl items-center justify-center py-8">
        <div className="space-y-4 text-center">
          <p className="text-2xl font-semibold">Invoice not found</p>
          <p className="text-muted-foreground">
            The invoice you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild>
            <Link href="/invoices">Back to Invoices</Link>
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
        description: `Overtime (${ot.rateType}) - ${new Date(
          ot.date,
        ).toLocaleDateString("en-GB")}`,
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

  const downloadInvoicePdf = async () => {
    const response = await fetch(`/api/invoices/${invoice.id}/pdf`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const invoiceDate = new Date(invoice.invoiceDate)
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");
    a.download = `${invoiceDate} ${invoice.showName} ${invoice.fullName} ${invoice.invoiceNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden p-6 pb-28 md:px-6 md:pb-8">
      <Button
        onClick={() => router.back()}
        className="mb-6 shadow-sm transition-shadow hover:shadow-md"
        variant="outline"
      >
        <ArrowLeftIcon /> Back
      </Button>
      <div className="grid gap-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="font-oswald text-3xl font-bold tracking-tight break-words md:text-4xl">
              Invoice {invoice.invoiceNumber}
            </h1>
            <div className="text-muted-foreground text-sm font-medium break-words">
              Show: {invoice.showName}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Status:</span>
              <Select
                value={invoice.status}
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue>
                    <span className="capitalize">{invoice.status}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-500 shadow-sm" />
                      <span>Draft</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sent">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" />
                      <span>Sent</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm" />
                      <span>Paid</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
                      <span>Overdue</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            <Button
              asChild
              variant="secondary"
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              <Link href={`/invoices/${invoice.id}/edit`}>
                <PencilIcon className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <PdfPreviewDialog
              variant="outline"
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
            />
            <Button
              variant="outline"
              onClick={downloadInvoicePdf}
              className="shadow-sm transition-shadow hover:shadow-md"
            >
              Download PDF
            </Button>
            <DeleteInvoiceButton
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              onDeleted={() => router.push("/")}
            />
          </div>
        </div>
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
                        £{item.unitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        £{item.cost.toFixed(2)}
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
                      £{Number(invoice.totalAmount).toFixed(2)}
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
