"use client";
import { useMemo, useState } from "react";

import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

import { CountryPicker } from "@/components/CountryPicker";
import { CustomExpenseManager } from "@/components/CustomExpenseManager";
import { OvertimeManager } from "@/components/OvertimeManager";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { INVOICE_STATUSES } from "@/lib/invoice-status";
import { deriveOvertimeHourlyRate, overtimeEntryCost } from "@/lib/overtime";
import { cn, formatCurrency } from "@/lib/utils";

const itemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
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

export const invoiceFormSchema = z.object({
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

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

/** The five standard line items every invoice starts with */
export const STANDARD_LINE_ITEMS: InvoiceFormValues["items"] = [
  { description: "Travel Days", quantity: 0, unitPrice: 0 },
  { description: "Work Days", quantity: 0, unitPrice: 0 },
  { description: "Dark days", quantity: 0, unitPrice: 0 },
  { description: "Per Diems Travel Days", quantity: 0, unitPrice: 0 },
  { description: "Per Diems Work Days", quantity: 0, unitPrice: 0 },
];

export const invoiceFormDefaults: InvoiceFormValues = {
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
  items: STANDARD_LINE_ITEMS,
  overtimeEntries: [],
  customExpenseEntries: [],
  status: "draft",
  notes: "",
};

interface InvoiceFormProps {
  form: UseFormReturn<InvoiceFormValues>;
  onSubmit: (values: InvoiceFormValues) => void;
  isPending: boolean;
  submitLabel: string;
  pendingLabel: string;
  title: string;
  subtitle: string;
  /** Rendered between the header and the form cards (e.g. profile warnings) */
  banner?: React.ReactNode;
  /** Rendered at the top of the client section (e.g. saved-client picker) */
  clientSelector?: React.ReactNode;
  /** When set, shows a Cancel button linking back */
  cancelHref?: string;
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-muted-foreground text-sm font-semibold md:col-span-2">
    {children}
  </h3>
);

/**
 * Shared invoice form used by both the new and edit invoice pages so the two
 * flows always expose the same fields, sections and totals behaviour. Personal
 * and banking details are collapsed into an editable summary since they are
 * pre-filled from the user's profile.
 */
export function InvoiceForm({
  form,
  onSubmit,
  isPending,
  submitLabel,
  pendingLabel,
  title,
  subtitle,
  banner,
  clientSelector,
  cancelHref,
}: InvoiceFormProps) {
  const items = useWatch({ control: form.control, name: "items" });
  const overtimeEntries = useWatch({
    control: form.control,
    name: "overtimeEntries",
  });
  const customExpenseEntries = useWatch({
    control: form.control,
    name: "customExpenseEntries",
  });
  const invoiceCurrency =
    useWatch({ control: form.control, name: "currency" }) || "GBP";

  // Your personal + banking details are pre-filled from the profile, so collapse
  // them into an editable summary and keep the form focused on what changes per
  // invoice. Auto-expand if any of those fields fail validation on submit.
  const watchedFullName = useWatch({ control: form.control, name: "fullName" });
  const watchedIban = useWatch({ control: form.control, name: "iban" });
  const watchedAccountNumber = useWatch({
    control: form.control,
    name: "accountNumber",
  });

  const detailsSummaryName = watchedFullName?.trim() || "Add your details";
  const detailsBankHint = watchedIban
    ? `IBAN ···${watchedIban.replace(/\s/g, "").slice(-4)}`
    : watchedAccountNumber
      ? `Acct ···${watchedAccountNumber.slice(-4)}`
      : null;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailFieldNames = [
    "fullName",
    "email",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country",
    "iban",
    "swiftBic",
    "accountNumber",
    "sortCode",
    "bankAddress",
    "dateOfBirth",
  ] as const;
  // Force the section open when it holds a validation error so the message is
  // visible — derived, so no effect/state-sync is needed.
  const hasDetailError = detailFieldNames.some(
    (name) => form.formState.errors[name],
  );
  const detailsSectionOpen = detailsOpen || hasDetailError;

  const regularRate = useMemo(() => deriveOvertimeHourlyRate(items), [items]);

  const totals = useMemo(() => {
    const itemsTotal = items.reduce(
      (sum, i) => sum + (i.cost ?? i.quantity * i.unitPrice),
      0,
    );

    const overtimeTotal = overtimeEntries.reduce(
      (sum, entry) => sum + overtimeEntryCost(entry, regularRate),
      0,
    );

    const customExpensesTotal = customExpenseEntries.reduce(
      (sum, entry) => sum + entry.cost,
      0,
    );

    const totalAmount = itemsTotal + overtimeTotal + customExpensesTotal;
    return { itemsTotal, overtimeTotal, customExpensesTotal, totalAmount };
  }, [items, overtimeEntries, customExpenseEntries, regularRate]);

  const updateItem = (
    idx: number,
    field: "quantity" | "unitPrice",
    value: string,
  ) => {
    const currentItems = form.getValues("items");
    const updatedItems = [...currentItems];
    updatedItems[idx] = { ...updatedItems[idx], [field]: Number(value) };
    form.setValue("items", updatedItems);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mx-auto grid w-full max-w-6xl gap-6 p-6 py-10 md:pb-24"
      >
        <PageHeader title={title} subtitle={subtitle} backHref="/invoices" />

        {banner}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SectionHeading>Invoice Information</SectionHeading>

            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        {INVOICE_STATUSES.map(({ value, label, dotClass }) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "size-2.5 rounded-full",
                                  dotClass,
                                )}
                              />
                              <span>{label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4 md:col-span-2" />

            <Collapsible
              open={detailsSectionOpen}
              onOpenChange={setDetailsOpen}
              className="md:col-span-2"
            >
              <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Your Details & Banking
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {detailsSummaryName}
                    {detailsBankHint ? (
                      <span className="text-muted-foreground font-normal">
                        {" · "}
                        {detailsBankHint}
                      </span>
                    ) : null}
                  </p>
                </div>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform",
                        detailsSectionOpen && "rotate-180",
                      )}
                    />
                    {detailsSectionOpen ? "Hide" : "Edit"}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SectionHeading>Your Information</SectionHeading>

                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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

                  <SectionHeading>Banking Details</SectionHeading>

                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-4 md:col-span-2" />

            <SectionHeading>Client Information</SectionHeading>

            {clientSelector && (
              <div className="md:col-span-2">{clientSelector}</div>
            )}

            <FormField
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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
          </CardContent>
        </Card>

        <Card className="w-full max-w-[calc(100dvw-3rem)]">
          <CardHeader>
            <CardTitle className="text-xl">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Description</TableHead>
                    <TableHead className="w-20">Quantity</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-24 text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={item.description || idx}>
                      <TableCell className="w-40 font-medium">
                        {item.description}
                      </TableCell>
                      <TableCell className="w-20">
                        <Input
                          type="number"
                          aria-label={`${item.description} quantity`}
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
                          aria-label={`${item.description} unit price`}
                          step="0.01"
                          min={0}
                          value={item.unitPrice ?? 0}
                          onChange={(e) =>
                            updateItem(idx, "unitPrice", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="w-24 text-right tabular-nums">
                        {formatCurrency(
                          (item.cost ?? item.quantity * item.unitPrice) || 0,
                          invoiceCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Separator />
            <div className="text-right text-lg font-semibold">
              Items Total: {formatCurrency(totals.itemsTotal, invoiceCurrency)}
            </div>
          </CardContent>
        </Card>

        <OvertimeManager
          entries={overtimeEntries}
          onEntriesChange={(entries) =>
            form.setValue("overtimeEntries", entries)
          }
          regularRate={regularRate}
          currency={invoiceCurrency}
        />

        <CustomExpenseManager
          entries={customExpenseEntries}
          onEntriesChange={(entries) =>
            form.setValue("customExpenseEntries", entries)
          }
          currency={invoiceCurrency}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <div className="font-medium">Items Total</div>
                <div className="text-lg">
                  {formatCurrency(totals.itemsTotal, invoiceCurrency)}
                </div>
              </div>
              <div>
                <div className="font-medium">Overtime Total</div>
                <div className="text-lg">
                  {formatCurrency(totals.overtimeTotal, invoiceCurrency)}
                </div>
              </div>
              <div>
                <div className="font-medium">Expenses Total</div>
                <div className="text-lg">
                  {formatCurrency(totals.customExpensesTotal, invoiceCurrency)}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="font-medium">Grand Total</div>
                <div className="text-xl font-bold">
                  {formatCurrency(totals.totalAmount, invoiceCurrency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end justify-end gap-2">
                {cancelHref && (
                  <Button type="button" variant="outline" asChild>
                    <Link href={cancelHref} transitionTypes={["back"]}>
                      Cancel
                    </Link>
                  </Button>
                )}
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner />}
                  {isPending ? pendingLabel : submitLabel}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
