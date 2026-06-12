"use client";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { ClientSelector, type Client } from "@/components/ClientSelector";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import {
  InvoiceForm,
  invoiceFormDefaults,
  invoiceFormSchema,
  type InvoiceFormValues,
} from "@/components/InvoiceForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useProfile } from "@/hooks/use-profile";

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoiceMutation = useCreateInvoice();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoiceFormDefaults,
  });

  // Fetch the next invoice number on mount
  useEffect(() => {
    const fetchNextInvoiceNumber = async () => {
      try {
        const res = await fetch("/api/invoices/next-number");
        if (res.ok) {
          const data = await res.json();
          form.setValue("invoiceNumber", data.invoiceNumber);
        }
      } catch (error) {
        console.error("Failed to fetch next invoice number:", error);
      }
    };

    fetchNextInvoiceNumber();
  }, [form]);

  // Pre-fill personal and banking details from the cached profile
  const { data: profile } = useProfile();

  const profileFullName = profile
    ? profile.fullName ||
      (profile.firstName || profile.lastName
        ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
        : "")
    : "";

  // Derived, not state: banner shows when essential profile fields are missing
  const profileIncomplete =
    !!profile &&
    (!profileFullName ||
      !profile.iban ||
      !profile.swiftBic ||
      !profile.addressLine1);

  useEffect(() => {
    if (!profile) return;

    const fullName =
      profile.fullName ||
      (profile.firstName || profile.lastName
        ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
        : "");

    // Only update fields if they have values in the profile
    if (fullName) form.setValue("fullName", fullName);
    if (profile.email) form.setValue("email", profile.email);
    if (profile.addressLine1)
      form.setValue("addressLine1", profile.addressLine1);
    if (profile.addressLine2)
      form.setValue("addressLine2", profile.addressLine2);
    if (profile.city) form.setValue("city", profile.city);
    if (profile.state) form.setValue("state", profile.state);
    if (profile.postalCode) form.setValue("postalCode", profile.postalCode);
    if (profile.country) form.setValue("country", profile.country);
    if (profile.dateOfBirth)
      form.setValue(
        "dateOfBirth",
        new Date(profile.dateOfBirth).toISOString().slice(0, 10),
      );
    if (profile.iban) form.setValue("iban", profile.iban);
    if (profile.swiftBic) form.setValue("swiftBic", profile.swiftBic);
    if (profile.accountNumber)
      form.setValue("accountNumber", profile.accountNumber);
    if (profile.sortCode) form.setValue("sortCode", profile.sortCode);
    if (profile.bankAddress) form.setValue("bankAddress", profile.bankAddress);
    if (profile.currency) form.setValue("currency", profile.currency);
  }, [profile, form]);

  const handleClientSelect = (client: Client | null) => {
    if (client) {
      form.setValue("clientName", client.name || "");
      form.setValue("clientAddress1", client.addressLine1 || "");
      form.setValue("clientAddress2", client.addressLine2 || "");
      form.setValue("clientCity", client.city || "");
      form.setValue("clientState", client.state || "");
      form.setValue("clientPostalCode", client.postalCode || "");
      form.setValue("clientCountry", client.country || "");
      form.setValue("attentionTo", client.attentionTo || "");

      // Update line items with client rates - always include all 5 items
      const updatedItems = [
        {
          description: "Travel Days",
          quantity: 1,
          unitPrice: client.dayRate ? Number(client.dayRate) : 0,
        },
        {
          description: "Work Days",
          quantity: 1,
          unitPrice: client.dayRate ? Number(client.dayRate) : 0,
        },
        {
          description: "Dark days",
          quantity: 1,
          unitPrice: client.dayRate ? Number(client.dayRate) : 0,
        },
        {
          description: "Per Diems Travel Days",
          quantity: 1,
          unitPrice: client.perDiemTravel ? Number(client.perDiemTravel) : 0,
        },
        {
          description: "Per Diems Work Days",
          quantity: 1,
          unitPrice: client.perDiemWork ? Number(client.perDiemWork) : 0,
        },
      ];
      form.setValue("items", updatedItems);
    }
  };

  const onSubmit = (values: InvoiceFormValues) => {
    // Convert Date objects to ISO strings for the API
    const payload = {
      ...values,
      overtimeEntries: values.overtimeEntries.map((entry) => ({
        ...entry,
        date:
          entry.date instanceof Date ? entry.date.toISOString() : entry.date,
      })),
      clientId: selectedClientId || undefined,
    };

    createInvoiceMutation.mutate(payload, {
      onSuccess: (data) => {
        router.push(`/invoices/${data.id}`);
      },
    });
  };

  return (
    <>
      <InvoiceForm
        form={form}
        onSubmit={onSubmit}
        isPending={createInvoiceMutation.isPending}
        submitLabel="Create Invoice"
        pendingLabel="Creating..."
        title="New Invoice"
        subtitle="Create a new invoice for your client"
        banner={
          profileIncomplete && (
            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Profile Setup Required</AlertTitle>
              <AlertDescription>
                Complete your profile with your personal information and
                banking details — it pre-fills every invoice you create.
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  asChild
                >
                  <Link href="/profile">Complete Profile</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )
        }
        clientSelector={
          <ClientSelector
            value={selectedClientId || undefined}
            onSelect={setSelectedClientId}
            onClientData={handleClientSelect}
            onCreateNew={() => setShowCreateClientDialog(true)}
          />
        }
      />

      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        onClientCreated={(client) => {
          setSelectedClientId(client.id);
          handleClientSelect(client);
        }}
      />
    </>
  );
}
