"use client";
import { useMemo, useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ClientSelector, type Client } from "@/components/ClientSelector";
import { CountryPicker } from "@/components/CountryPicker";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import { CustomExpenseManager } from "@/components/CustomExpenseManager";
import { OvertimeManager } from "@/components/OvertimeManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().nonnegative(),
  unitPrice: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative().optional(),
});

const overtimeEntrySchema = z.object({
  id: z.string(),
  date: z.date(),
  hours: z.number().positive(),
  rateType: z.enum(["1.5x", "2x"]),
});

const customExpenseEntrySchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative(),
});

const formSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  showName: z.string().min(1, "Show/Project name is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.email(),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  clientName: z.string().optional(),
  clientAddress1: z.string().optional(),
  clientAddress2: z.string().optional(),
  clientCity: z.string().optional(),
  clientState: z.string().optional(),
  clientPostalCode: z.string().optional(),
  clientCountry: z.string().optional(),
  attentionTo: z.string().optional(),
  iban: z.string().min(1, "IBAN is required"),
  swiftBic: z.string().min(1, "SWIFT/BIC is required"),
  accountNumber: z.string().optional(),
  sortCode: z.string().optional(),
  bankAddress: z.string().optional(),
  dateOfBirth: z.string().optional(),
  currency: z.string().optional(),
  items: z.array(itemSchema).min(1, "At least one item is required"),
  overtimeEntries: z.array(overtimeEntrySchema),
  customExpenseEntries: z.array(customExpenseEntrySchema),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewInvoicePage() {
  const router = useRouter();
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);

  const form = useForm<FormValues>({
    // @ts-ignore - React Hook Form type inference issues with complex nested schemas
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().slice(0, 10),
      showName: "",
      fullName: "",
      email: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      clientName: "",
      clientAddress1: "",
      clientAddress2: "",
      clientCity: "",
      clientState: "",
      clientPostalCode: "",
      clientCountry: "",
      attentionTo: "",
      iban: "",
      swiftBic: "",
      accountNumber: "",
      sortCode: "",
      bankAddress: "",
      dateOfBirth: "",
      currency: "GBP",
      items: [
        { description: "Travel Days", quantity: 1, unitPrice: 0 },
        { description: "Work Days", quantity: 1, unitPrice: 0 },
        { description: "Dark days", quantity: 1, unitPrice: 0 },
        { description: "Per Diems Travel Days", quantity: 1, unitPrice: 0 },
        { description: "Per Diems Work Days", quantity: 1, unitPrice: 0 },
      ],
      overtimeEntries: [],
      customExpenseEntries: [],
      status: "draft",
      notes: "",
    },
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

  // Fetch user profile to pre-fill personal and banking details
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();

          // Combine firstName and lastName for the invoice
          const fullName =
            profile.fullName ||
            (profile.firstName || profile.lastName
              ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
              : "");

          // Check if essential profile fields are missing
          const isIncomplete =
            !fullName ||
            !profile.iban ||
            !profile.swiftBic ||
            !profile.addressLine1;
          setProfileIncomplete(isIncomplete);

          // Only update fields if they have values in the profile
          if (fullName) form.setValue("fullName", fullName);
          if (profile.email) form.setValue("email", profile.email);
          if (profile.addressLine1)
            form.setValue("addressLine1", profile.addressLine1);
          if (profile.addressLine2)
            form.setValue("addressLine2", profile.addressLine2);
          if (profile.city) form.setValue("city", profile.city);
          if (profile.state) form.setValue("state", profile.state);
          if (profile.postalCode)
            form.setValue("postalCode", profile.postalCode);
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
          if (profile.bankAddress)
            form.setValue("bankAddress", profile.bankAddress);
          if (profile.currency) form.setValue("currency", profile.currency);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    };

    fetchUserProfile();
  }, [form]);

  const items = useWatch({ control: form.control, name: "items" });
  const overtimeEntries = useWatch({
    control: form.control,
    name: "overtimeEntries",
  });
  const customExpenseEntries = useWatch({
    control: form.control,
    name: "customExpenseEntries",
  });

  // Calculate regular rate dynamically from Work Days unit price (10% since a day is 10 hours)
  const regularRate = useMemo(() => {
    const workDaysItem = items.find((item) => item.description === "Work Days");
    if (workDaysItem && workDaysItem.unitPrice > 0) {
      return Number(workDaysItem.unitPrice) * 0.1;
    }
    return 0; // No default - user must set Work Days rate
  }, [items]);

  const totals = useMemo(() => {
    const itemsTotal = items.reduce(
      (sum, i) => sum + (i.cost ?? i.quantity * i.unitPrice),
      0,
    );

    const overtimeTotal = overtimeEntries.reduce((sum, entry) => {
      const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
      const hourlyRate = regularRate * multiplier;
      return sum + entry.hours * hourlyRate;
    }, 0);

    const customExpensesTotal = customExpenseEntries.reduce(
      (sum, entry) => sum + entry.cost,
      0,
    );

    const totalAmount = itemsTotal + overtimeTotal + customExpensesTotal;
    return { itemsTotal, overtimeTotal, customExpensesTotal, totalAmount };
  }, [items, overtimeEntries, customExpenseEntries, regularRate]);

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

  const updateItem = (
    idx: number,
    field: keyof FormValues["items"][number],
    value: string | number,
  ) => {
    const currentItems = form.getValues("items");
    const updatedItems = [...currentItems];
    // @ts-expect-error simplified typing for controlled inputs
    updatedItems[idx][field] = field === "description" ? value : Number(value);
    form.setValue("items", updatedItems);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          clientId: selectedClientId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        alert(err.error ?? "Failed to create invoice");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      router.push(`/invoices/${data.id}`);
    } catch {
      alert("Failed to create invoice");
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        // @ts-expect-error - React Hook Form type inference issues
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto grid w-full max-w-6xl gap-6 p-6 py-10 md:pb-8"
      >
        <div className="space-y-1">
          <h1 className="font-oswald text-4xl font-bold tracking-tight">New Invoice</h1>
          <p className="text-muted-foreground text-sm font-medium">Create a new invoice for your client</p>
        </div>

        {profileIncomplete && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <svg
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Profile Setup Required
                </h3>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  Please complete your profile with your personal information
                  and banking details before creating invoices. This information
                  will be automatically pre-filled in all your invoices.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/profile")}
                >
                  Complete Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold">
                Invoice Information
              </h3>
            </div>

            <FormField
              control={form.control as any}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="invoiceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="showName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Show/Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="status"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4 md:col-span-2" />

            <div className="md:col-span-2">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold">
                Your Information
              </h3>
            </div>

            <FormField
              control={form.control as any}
              name="fullName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="addressLine1"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="addressLine2"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal/Zip Code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountryPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4 md:col-span-2" />

            <div className="md:col-span-2">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold">
                Banking Details
              </h3>
            </div>

            <FormField
              control={form.control as any}
              name="iban"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="swiftBic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SWIFT/BIC</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="sortCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00-00-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="bankAddress"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bank Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4 md:col-span-2" />

            <div className="md:col-span-2">
              <h3 className="text-muted-foreground mb-4 text-sm font-semibold">
                Client Information
              </h3>
            </div>

            <div className="md:col-span-2">
              <ClientSelector
                value={selectedClientId || undefined}
                onSelect={setSelectedClientId}
                onClientData={handleClientSelect}
                onCreateNew={() => setShowCreateClientDialog(true)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control as any}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="attentionTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attention To</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientAddress1"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Client Address 1</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientAddress2"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Client Address 2</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientPostalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal/Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="clientCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <CountryPicker
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full max-w-[calc(100dvw-3rem)]">
          <CardHeader>
            <CardTitle className="text-xl">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Description</TableHead>
                    <TableHead className="w-20">Quantity</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-24">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="w-40">
                        <Input
                          value={item.description || ""}
                          readOnly
                          onChange={(e) =>
                            updateItem(idx, "description", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="w-20">
                        <Input
                          type="number"
                          value={item.quantity ?? 0}
                          min={0}
                          onChange={(e) =>
                            updateItem(idx, "quantity", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="w-28">
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unitPrice ?? 0}
                          onChange={(e) =>
                            updateItem(idx, "unitPrice", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="w-24">
                        <Input
                          type="number"
                          step="0.01"
                          readOnly
                          value={
                            (item.cost ?? item.quantity * item.unitPrice) || 0
                          }
                          onChange={(e) =>
                            updateItem(idx, "cost", e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t pt-2 text-right text-lg font-semibold">
              Items Total: £{totals.itemsTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <OvertimeManager
          entries={overtimeEntries}
          onEntriesChange={(entries) =>
            form.setValue("overtimeEntries", entries)
          }
          regularRate={regularRate}
        />

        <CustomExpenseManager
          entries={customExpenseEntries}
          onEntriesChange={(entries) =>
            form.setValue("customExpenseEntries", entries)
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="font-medium">Items Total</div>
                <div className="text-lg">£{totals.itemsTotal.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Overtime Total</div>
                <div className="text-lg">
                  £{totals.overtimeTotal.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="font-medium">Expenses Total</div>
                <div className="text-lg">
                  £{totals.customExpensesTotal.toFixed(2)}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="font-medium">Grand Total</div>
                <div className="text-xl font-bold">
                  £{totals.totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control as any}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end justify-end">
                <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-shadow" size="lg">
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      <CreateClientDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        onClientCreated={(client) => {
          setSelectedClientId(client.id);
          handleClientSelect(client);
        }}
      />
    </Form>
  );
}
