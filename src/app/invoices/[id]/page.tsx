"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteInvoiceButton } from "@/components/DeleteInvoiceButton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/invoices/${id}`);
        if (response.ok) {
          const data = await response.json();
          setInvoice(data);
        }
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [params]);

  if (loading) {
    return <div className="max-w-6xl mx-auto py-8">Loading...</div>;
  }

  if (!invoice) {
    return <div className="max-w-6xl mx-auto py-8">Invoice not found</div>;
  }

  // Calculate overtime costs
  const overtimeEntries = invoice.overtimeEntries || [];
  const customExpenses = invoice.customExpenseEntries || [];

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
      const rate = ot.rateType === "1.5x" ? 78.75 : 105;
      const hours = Number(ot.hours);
      return {
        id: ot.id,
        description: `Overtime (${ot.rateType}) - ${new Date(
          ot.date
        ).toLocaleDateString("en-GB")}`,
        quantity: hours,
        unitPrice: rate,
        cost: hours * rate,
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
    <div className="max-w-6xl mx-auto px-6 py-4">
      <Button asChild className="mb-4" variant="outline">
        <Link href="/">
          <ArrowLeftIcon /> Back
        </Link>
      </Button>
      <div className="grid gap-4">
        <div className="flex gap-2 justify-between items-start md:flex-row flex-col">
          <div>
            <h1 className="text-2xl font-semibold">
              Invoice {invoice.invoiceNumber}
            </h1>
            <div className="text-sm text-muted-foreground">
              Show: {invoice.showName}
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <PencilIcon className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <PdfPreviewDialog
              variant="outline"
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
            />
            <Button asChild variant="outline">
              <Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
                Download PDF
              </Link>
            </Button>
            <DeleteInvoiceButton
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              onDeleted={() => router.push("/")}
            />
          </div>
        </div>
        <div className="mt-4 max-w-[calc(100dvw-3rem)]">
          <Table>
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
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {item.type}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
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
                <TableCell colSpan={4} className="text-right font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  £{Number(invoice.totalAmount).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </div>
  );
}
