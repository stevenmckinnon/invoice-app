"use client";

import { useEffect, useMemo, useState } from "react";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { type Client, ClientSelector } from "@/components/ClientSelector";
import { CreateClientDialog } from "@/components/CreateClientDialog";
import {
  InvoicePaper,
  type PaperInvoice,
} from "@/components/invoice/InvoicePaper";
import { overtimeByDate } from "@/components/invoice/OvertimeCap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/use-clients";
import {
  type InvoiceWithRelations,
  useCreateInvoice,
  useUpdateInvoice,
} from "@/hooks/use-invoices";
import { useProfile } from "@/hooks/use-profile";
import {
  BillingError,
  type InvoiceTerms,
  billDays,
  termsFromClient,
} from "@/lib/billing";
import { type Painted, fromStoredDays, toBillableDays } from "@/lib/day-editor";
import { toStripDays } from "@/lib/day-strip";
import { summariseInvoice } from "@/lib/invoice-summary";
import { formatCurrency } from "@/lib/utils";

import { DayCalendar } from "./DayCalendar";
import { DayDetails } from "./DayDetails";
import {
  type EditableExpense,
  ExpensesEditor,
  newExpenseKey,
} from "./ExpensesEditor";

const today = () => new Date().toISOString().slice(0, 10);

const ruleLine = (terms: InvoiceTerms, currency: string) => {
  const money = (n: number) => formatCurrency(n, currency);
  const tier = terms.overtimeTier
    ? `${terms.overtimeTier.afterRate.replace("x", "×")} after ${terms.overtimeTier.tierHours}h overtime`
    : "overtime at 1.5×";
  const { bill, perDiem } = terms.travelWork;
  return [
    `${money(terms.dayRate)} a day`,
    `per diems ${money(terms.perDiem.travel)} travel, ${money(terms.perDiem.work)} work`,
    tier,
    `travel + work days bill as ${bill === "both" ? "both" : `a ${bill} day`}, ${perDiem} per diem`,
  ].join(" · ");
};

/**
 * The invoice form, built around what changes per job: the client (which
 * brings the rates), the job's name, its days and its expenses. Everything
 * else comes from the client and your profile, and the job-specific text is
 * edited in place on the live paper at the end.
 */
export const InvoiceEditor = ({
  invoice,
}: {
  /** The invoice being edited; omitted for a new one */
  invoice?: InvoiceWithRelations;
}) => {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile();

  const [clientId, setClientId] = useState<string | null>(
    invoice?.clientId ?? null,
  );
  const [showName, setShowName] = useState(invoice?.showName ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    invoice?.invoiceNumber ?? "",
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoice ? String(invoice.invoiceDate).slice(0, 10) : today(),
  );
  // Undefined until edited on the paper: then it follows the client
  const [attentionTo, setAttentionTo] = useState<string | undefined>(
    invoice?.attentionTo ?? undefined,
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [painted, setPainted] = useState<Painted>(() =>
    invoice ? fromStoredDays(invoice.days) : new Map(),
  );
  const [expenses, setExpenses] = useState<EditableExpense[]>(() =>
    (invoice?.customExpenseEntries ?? []).map((e) => ({
      key: newExpenseKey(),
      description: e.description,
      quantity: e.quantity,
      unitPrice: String(e.unitPrice),
    })),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // A new invoice takes the next number in your sequence
  useEffect(() => {
    if (invoice) return;
    let cancelled = false;
    fetch("/api/invoices/next-number")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.invoiceNumber) {
          setInvoiceNumber((current) => current || data.invoiceNumber);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [invoice]);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const sameClient = invoice != null && clientId === invoice.clientId;

  // An existing invoice keeps the terms it was priced under; only a change of
  // client re-prices it. The server applies the same rule.
  const terms: InvoiceTerms | null =
    sameClient && invoice?.terms
      ? invoice.terms
      : client
        ? termsFromClient(client)
        : null;

  const currency = invoice?.currency ?? profile?.currency ?? "GBP";
  const currencySymbol = formatCurrency(0, currency).replace(/[\d.,\s]/g, "");

  const billable = useMemo(() => toBillableDays(painted), [painted]);
  const stripDays = useMemo(() => toStripDays(billable), [billable]);
  const parsedExpenses = expenses
    .filter((e) => e.description.trim() || Number(e.unitPrice))
    .map((e) => ({
      description: e.description.trim() || "Expense",
      quantity: e.quantity,
      unitPrice: Number.parseFloat(e.unitPrice) || 0,
    }));

  // The same billing the server runs, so the preview is what gets stored
  let bill: ReturnType<typeof billDays> | null = null;
  let billingError: string | null = null;
  if (terms) {
    try {
      bill = billDays({ days: billable, terms, expenses: parsedExpenses });
    } catch (error) {
      if (!(error instanceof BillingError)) throw error;
      billingError = error.message;
    }
  }

  const profileName = profile
    ? profile.fullName ||
      `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim()
    : "";

  // Your details: a saved invoice keeps its own copy; a new one takes your
  // profile. The client's details likewise, unless the client changes.
  const you = invoice
    ? {
        fullName: invoice.fullName,
        email: invoice.email,
        addressLine1: invoice.addressLine1,
        addressLine2: invoice.addressLine2,
        city: invoice.city,
        state: invoice.state,
        postalCode: invoice.postalCode,
        country: invoice.country,
        iban: invoice.iban,
        swiftBic: invoice.swiftBic,
        accountNumber: invoice.accountNumber,
        sortCode: invoice.sortCode,
        bankAddress: invoice.bankAddress,
        dateOfBirth: invoice.dateOfBirth
          ? String(invoice.dateOfBirth).slice(0, 10)
          : null,
      }
    : {
        fullName: profileName,
        email: profile?.email ?? "",
        addressLine1: profile?.addressLine1 ?? "",
        addressLine2: profile?.addressLine2 ?? null,
        city: profile?.city ?? "",
        state: profile?.state ?? null,
        postalCode: profile?.postalCode ?? "",
        country: profile?.country ?? "",
        iban: profile?.iban ?? "",
        swiftBic: profile?.swiftBic ?? "",
        accountNumber: profile?.accountNumber ?? null,
        sortCode: profile?.sortCode ?? null,
        bankAddress: profile?.bankAddress ?? null,
        dateOfBirth: profile?.dateOfBirth
          ? String(profile.dateOfBirth).slice(0, 10)
          : null,
      };

  const billedTo =
    sameClient && invoice
      ? {
          clientName: invoice.clientName,
          clientAddress1: invoice.clientAddress1,
          clientAddress2: invoice.clientAddress2,
          clientCity: invoice.clientCity,
          clientState: invoice.clientState,
          clientPostalCode: invoice.clientPostalCode,
          clientCountry: invoice.clientCountry,
          defaultAttention: invoice.attentionTo,
        }
      : {
          clientName: client?.name ?? null,
          clientAddress1: client?.addressLine1 ?? null,
          clientAddress2: client?.addressLine2 ?? null,
          clientCity: client?.city ?? null,
          clientState: client?.state ?? null,
          clientPostalCode: client?.postalCode ?? null,
          clientCountry: client?.country ?? null,
          defaultAttention: client?.attentionTo ?? null,
        };
  const attention = attentionTo ?? billedTo.defaultAttention ?? "";

  const paper: PaperInvoice = {
    ...you,
    invoiceNumber: invoiceNumber || "—",
    invoiceDate,
    showName: showName || "Untitled job",
    status: invoice?.status ?? "draft",
    currency,
    totalAmount: bill?.totalAmount ?? 0,
    notes,
    ...billedTo,
    attentionTo: attention,
  };
  const summary = summariseInvoice({
    items: bill?.items ?? [],
    overtimeEntries: bill?.overtimeEntries ?? [],
    customExpenseEntries: bill?.customExpenseEntries ?? [],
    days: billable,
    terms,
  });
  const overtime = overtimeByDate(bill?.overtimeEntries ?? []);

  const problems = [
    !clientId && "Pick a client: their rates price the invoice.",
    client && !terms && "This client has no day rate yet.",
    !showName.trim() && "Name the job.",
    !invoiceNumber.trim() && "Give it an invoice number.",
    billable.length === 0 &&
      parsedExpenses.length === 0 &&
      "Paint at least one day.",
    billingError,
    !invoice &&
      profile &&
      (!profileName ||
        !profile.addressLine1 ||
        !profile.iban ||
        !profile.swiftBic) &&
      "Your profile is missing your address or bank details.",
  ].filter((p): p is string => Boolean(p));

  const saving = createInvoice.isPending || updateInvoice.isPending;

  const save = () => {
    setAttempted(true);
    if (problems.length || !bill) return;
    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      showName: showName.trim(),
      fullName: you.fullName,
      email: you.email,
      addressLine1: you.addressLine1,
      addressLine2: you.addressLine2 ?? undefined,
      city: you.city,
      state: you.state ?? undefined,
      postalCode: you.postalCode,
      country: you.country,
      iban: you.iban,
      swiftBic: you.swiftBic,
      accountNumber: you.accountNumber ?? undefined,
      sortCode: you.sortCode ?? undefined,
      bankAddress: you.bankAddress ?? undefined,
      dateOfBirth: you.dateOfBirth ?? undefined,
      currency,
      clientId: clientId ?? undefined,
      clientName: billedTo.clientName ?? undefined,
      clientAddress1: billedTo.clientAddress1 ?? undefined,
      clientAddress2: billedTo.clientAddress2 ?? undefined,
      clientCity: billedTo.clientCity ?? undefined,
      clientState: billedTo.clientState ?? undefined,
      clientPostalCode: billedTo.clientPostalCode ?? undefined,
      clientCountry: billedTo.clientCountry ?? undefined,
      attentionTo: attention || undefined,
      notes: notes || undefined,
      // The API defaults a missing status to draft; keep what it was
      status: (invoice?.status ?? "draft") as
        "draft" | "sent" | "paid" | "overdue",
      days: billable,
      customExpenseEntries: parsedExpenses.map((e, i) => ({
        // The schema wants an id; the server never stores it
        id: `new-${i}`,
        ...e,
        cost: Math.round(e.quantity * e.unitPrice * 100) / 100,
      })),
    };
    const done = (id: string) => router.push(`/invoices/${id}`);
    if (invoice) {
      updateInvoice.mutate(
        { id: invoice.id, data: payload },
        { onSuccess: () => done(invoice.id) },
      );
    } else {
      createInvoice.mutate(payload, { onSuccess: (data) => done(data.id) });
    }
  };

  const total = formatCurrency(bill?.totalAmount ?? 0, currency);
  const initialMonth = billable[0]?.date ?? invoiceDate;
  const selectedDay = selected
    ? stripDays.find((d) => d.date === selected)
    : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-32 md:px-6 md:pt-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2"
        nativeButton={false}
        render={
          <Link
            href={invoice ? `/invoices/${invoice.id}` : "/invoices"}
            transitionTypes={["back"]}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            {invoice ? invoice.showName : "Invoices"}
          </Link>
        }
      />
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {invoice ? "Edit invoice" : "New invoice"}
      </h1>

      {/* One column in working order: client and job, days, expenses, then
          the invoice itself as the review step */}
      <div className="mt-8 space-y-4">
        <section
          className="bg-card rounded-2xl p-4 shadow-sm md:p-6 dark:border"
          aria-label="Client and job"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium">Client</p>
              <ClientSelector
                value={clientId ?? undefined}
                onSelect={(id) => {
                  setClientId(id);
                  // A new client brings its own attention line
                  setAttentionTo(undefined);
                }}
                onCreateNew={() => setShowCreateClient(true)}
              />
            </div>
            <div>
              <label
                htmlFor="job-name"
                className="mb-1.5 block text-xs font-medium"
              >
                Job
              </label>
              <Input
                id="job-name"
                value={showName}
                placeholder="e.g. Triplemania 34"
                onChange={(e) => setShowName(e.target.value)}
              />
            </div>
          </div>
          {/* The client's terms, read-only: they never change per job */}
          {client && (
            <p className="text-muted-foreground mt-3 text-xs">
              {terms ? ruleLine(terms, currency) : "No day rate set."}
              {sameClient && invoice?.terms
                ? " · as when this invoice was made"
                : ""}
              {" · "}
              <Link
                href={`/clients/${client.id}/edit`}
                className="text-foreground underline underline-offset-2"
              >
                Edit client
              </Link>
            </p>
          )}
        </section>

        <DayCalendar
          painted={painted}
          setPainted={setPainted}
          days={stripDays}
          selected={selected}
          onSelect={setSelected}
          total={total}
          initialMonth={initialMonth}
        />

        {selected && (
          <DayDetails
            date={selected}
            painted={painted}
            setPainted={setPainted}
            day={selectedDay}
            terms={terms}
          />
        )}

        <ExpensesEditor
          expenses={expenses}
          setExpenses={setExpenses}
          currencySymbol={currencySymbol}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-[0.16em] uppercase">
          The invoice · tap underlined text to edit
        </h2>
        <InvoicePaper
          invoice={paper}
          summary={summary}
          days={stripDays}
          overtime={overtime}
          edit={{
            set: (patch) => {
              if (patch.invoiceNumber !== undefined)
                setInvoiceNumber(patch.invoiceNumber);
              if (patch.showName !== undefined) setShowName(patch.showName);
              if (patch.attentionTo !== undefined)
                setAttentionTo(patch.attentionTo ?? "");
              if (patch.notes !== undefined) setNotes(patch.notes ?? "");
            },
            invoiceDate,
            setInvoiceDate,
          }}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-w-0">
          {attempted && problems.length > 0 ? (
            <ul className="text-destructive space-y-1 text-sm">
              {problems.map((problem) => (
                <li key={problem}>
                  {problem}
                  {problem.startsWith("Your profile") && (
                    <>
                      {" "}
                      <Link
                        href="/profile"
                        className="underline underline-offset-2"
                      >
                        Complete your profile
                      </Link>
                    </>
                  )}
                  {problem.startsWith("This client") && client && (
                    <>
                      {" "}
                      <Link
                        href={`/clients/${client.id}/edit`}
                        className="underline underline-offset-2"
                      >
                        Add one
                      </Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Total{" "}
              <span className="text-foreground font-mono font-semibold">
                {total}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={invoice ? `/invoices/${invoice.id}` : "/invoices"}>
                Cancel
              </Link>
            }
          />
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving…" : invoice ? "Save changes" : "Create invoice"}
          </Button>
        </div>
      </div>

      <CreateClientDialog
        open={showCreateClient}
        onOpenChange={setShowCreateClient}
        onClientCreated={(created: Client) => {
          setClientId(created.id);
          setAttentionTo(undefined);
        }}
      />
    </div>
  );
};
