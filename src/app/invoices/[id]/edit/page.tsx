/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { OvertimeManager } from "@/components/OvertimeManager";
import { CustomExpenseManager } from "@/components/CustomExpenseManager";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { CountryPicker } from "@/components/CountryPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - React Hook Form type inference issues with complex nested schemas
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
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
      items: [],
      overtimeEntries: [],
      customExpenseEntries: [],
      status: "draft",
      notes: "",
    },
  });

  const regularRate = 52.5;

  const items = form.watch("items");
  const overtimeEntries = form.watch("overtimeEntries");
  const customExpenseEntries = form.watch("customExpenseEntries");

  const totals = useMemo(() => {
    const itemsTotal = items.reduce(
      (sum, i) => sum + (i.cost ?? i.quantity * i.unitPrice),
      0
    );

    const overtimeTotal = overtimeEntries.reduce((sum, entry) => {
      const multiplier = entry.rateType === "1.5x" ? 1.5 : 2;
      const hourlyRate = regularRate * multiplier;
      return sum + entry.hours * hourlyRate;
    }, 0);

    const customExpensesTotal = customExpenseEntries.reduce(
      (sum, entry) => sum + entry.cost,
      0
    );

    const totalAmount = itemsTotal + overtimeTotal + customExpensesTotal;
    return { itemsTotal, overtimeTotal, customExpensesTotal, totalAmount };
  }, [items, overtimeEntries, customExpenseEntries]);

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
            })
          ),
          status: invoice.status || "draft",
          notes: invoice.notes || "",
        });

        setIsLoading(false);
      } catch (error) {
        alert("Failed to load invoice");
        console.error(error);
        router.push("/");
      }
    };

    fetchInvoice();
  }, [invoiceId, router, form]);

  const updateItem = (
    idx: number,
    field: keyof FormValues["items"][number],
    value: string | number
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
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        alert(err.error ?? "Failed to update invoice");
        setIsSubmitting(false);
        return;
      }

      const data = await res.json();
      router.push(`/invoices/${data.id}`);
    } catch {
      alert("Failed to update invoice");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 grid gap-6 items-center justify-center h-full">
        <h1 className="text-2xl font-semibold">Loading...</h1>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        // @ts-expect-error - React Hook Form type inference issues
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-6xl mx-auto p-6 grid gap-6"
      >
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Edit Invoice</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="md:col-span-2">
              <h3 className="font-medium mb-4">Bill To</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <CardTitle>Line Items</CardTitle>
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
                          value={item.description}
                          readOnly
                          onChange={(e) =>
                            updateItem(idx, "description", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="w-20">
                        <Input
                          type="number"
                          value={item.quantity}
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
                          value={item.unitPrice}
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
                          value={item.cost ?? item.quantity * item.unitPrice}
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
            <div className="text-right font-semibold text-lg pt-2 border-t">
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
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-end justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Invoice"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
