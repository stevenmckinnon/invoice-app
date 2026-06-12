"use client";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  InvoiceForm,
  invoiceFormDefaults,
  invoiceFormSchema,
  type InvoiceFormValues,
} from "@/components/InvoiceForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateInvoice } from "@/hooks/use-invoices";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const updateInvoiceMutation = useUpdateInvoice();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { ...invoiceFormDefaults, items: [] },
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (!res.ok) throw new Error("Failed to fetch invoice");

        const invoice = await res.json();

        // Transform the data to match form structure
        form.reset({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
          showName: invoice.showName,
          fullName: invoice.fullName,
          email: invoice.email,
          addressLine1: invoice.addressLine1,
          addressLine2: invoice.addressLine2 || "",
          city: invoice.city,
          state: invoice.state || "",
          postalCode: invoice.postalCode,
          country: invoice.country,
          clientName: invoice.clientName || "",
          clientAddress1: invoice.clientAddress1 || "",
          clientAddress2: invoice.clientAddress2 || "",
          clientCity: invoice.clientCity || "",
          clientState: invoice.clientState || "",
          clientPostalCode: invoice.clientPostalCode || "",
          clientCountry: invoice.clientCountry || "",
          attentionTo: invoice.attentionTo || "",
          iban: invoice.iban,
          swiftBic: invoice.swiftBic,
          accountNumber: invoice.accountNumber || "",
          sortCode: invoice.sortCode || "",
          bankAddress: invoice.bankAddress || "",
          dateOfBirth: invoice.dateOfBirth
            ? new Date(invoice.dateOfBirth).toISOString().slice(0, 10)
            : "",
          currency: invoice.currency || "GBP",
          items: invoice.items.map((item: any) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            cost: Number(item.cost),
          })),
          overtimeEntries: invoice.overtimeEntries.map((entry: any) => ({
            id: entry.id,
            date: new Date(entry.date),
            hours: Number(entry.hours),
            rateType: entry.rateType,
          })),
          customExpenseEntries: invoice.customExpenseEntries.map(
            (entry: any) => ({
              id: entry.id,
              description: entry.description,
              quantity: Number(entry.quantity),
              unitPrice: Number(entry.unitPrice),
              cost: Number(entry.cost),
            }),
          ),
          status: invoice.status || "draft",
          notes: invoice.notes || "",
        });

        setIsLoading(false);
      } catch (error) {
        toast.error("Failed to load invoice");
        console.error(error);
        router.push("/invoices");
      }
    };

    fetchInvoice();
  }, [invoiceId, router, form]);

  const onSubmit = (values: InvoiceFormValues) => {
    // Convert Date objects to ISO strings for the API
    const payload = {
      ...values,
      overtimeEntries: values.overtimeEntries.map((entry) => ({
        ...entry,
        date:
          entry.date instanceof Date ? entry.date.toISOString() : entry.date,
      })),
    };

    updateInvoiceMutation.mutate(
      {
        id: invoiceId,
        data: payload,
      },
      {
        onSuccess: (data) => {
          router.push(`/invoices/${data.id}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-6 py-10 md:pb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-9 w-44" />
        </div>
        {[0, 1, 2].map((card) => (
          <Card key={card}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((field) => (
                <div key={field} className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <InvoiceForm
      form={form}
      onSubmit={onSubmit}
      isPending={updateInvoiceMutation.isPending}
      submitLabel="Update Invoice"
      pendingLabel="Updating..."
      title="Edit Invoice"
      subtitle="Update invoice details"
      cancelHref="/invoices"
    />
  );
}
