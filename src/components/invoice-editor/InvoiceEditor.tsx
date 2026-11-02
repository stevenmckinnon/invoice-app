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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  describeGaps,
  profileGaps,
  profileName,
} from "@/lib/profile-readiness";
import { formatCurrency } from "@/lib/utils";

import { DayCalendar } from "./DayCalendar";
import { DayDetails } from "./DayDetails";
import {
  type EditableExpense,
  ExpensesEditor,
  newExpenseKey,
} from "./ExpensesEditor";

/** A star that says so out loud, for the fields Create invoice insists on */
const RequiredMark = () => (
  <>
    <span aria-hidden="true" className="text-muted-foreground">
      *
    </span>
    <span className="sr-only">(required)</span>
  </>
);

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
export const InvoiceEditorSkeleton = () => (
  <div
    className="mx-auto w-full max-w-4xl px-4 pt-6 md:px-6 md:pt-10"
    aria-busy="true"
  >
    <Skeleton className="mb-3 h-8 w-24" />
    <Skeleton className="h-10 w-56" />
    <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
    <Skeleton className="mt-4 h-80 w-full rounded-2xl" />
  </div>
);

export const InvoiceEditor = ({
  invoice,
  correcting,
}: {
  /** The invoice being edited; omitted for a new one */
  invoice?: InvoiceWithRelations;
  /** The issued invoice a new one replaces: its job, days and rates carry over */
  correcting?: InvoiceWithRelations;
}) => {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const { data: clients = [] } = useClients();
  const { data: profile } = useProfile({ fresh: true });
  const source = invoice ?? correcting;

  const [clientId, setClientId] = useState<string | null>(
    source?.clientId ?? null,
  );
  const [showName, setShowName] = useState(source?.showName ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState(
    invoice?.invoiceNumber ?? "",
  );
  const [invoiceDate, setInvoiceDate] = useState(
    // A correction keeps the original's date, so it stays in the same tax year
    source ? String(source.invoiceDate).slice(0, 10) : today(),
  );
  // Undefined until edited on the paper: then it follows the client
  const [attentionTo, setAttentionTo] = useState<string | undefined>(
    source?.attentionTo ?? undefined,
  );
  const [notes, setNotes] = useState(
    correcting
      ? [
          `Replaces invoice ${correcting.invoiceNumber}.`,
          // Correcting a correction: the client only needs the latest
          correcting.notes?.replace(/^Replaces invoice \S+\.\s*/, ""),
        ]
          .filter(Boolean)
          .join("\n\n")
      : (invoice?.notes ?? ""),
  );
  const [painted, setPainted] = useState<Painted>(() =>
    source ? fromStoredDays(source.days) : new Map(),
  );
  const [expenses, setExpenses] = useState<EditableExpense[]>(() =>
    (source?.customExpenseEntries ?? []).map((e) => ({
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
  const sameClient = source != null && clientId === source.clientId;

  // An existing invoice keeps the terms it was priced under, and a correction
  // takes the terms of the one it replaces; only a change of client re-prices
  // it. The server applies the same rule.
  const terms: InvoiceTerms | null =
    sameClient && source?.terms
      ? source.terms
      : client
        ? termsFromClient(client)
        : null;

  const currency = source?.currency ?? profile?.currency ?? "GBP";
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

  const youName = profileName(profile);
  // What a new invoice still needs from your profile, said up front
  const profileGap = !invoice && profile ? describeGaps(profileGaps(profile)) : "";

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
        fullName: youName,
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
    invoice && sameClient
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

  // Each check, in the order a person would fix them. `short` is what's still
  // to do, said before the first click; `message` is what the click answers
  const profileProblem = profileGap ? `Add ${profileGap} to your profile.` : "";
  const checks = [
    {
      failed: !clientId,
      message: "Pick a client: their rates price the invoice.",
      short: "pick a client",
    },
    {
      failed: Boolean(client && !terms),
      message: "This client has no day rate yet.",
      short: "give the client a day rate",
    },
    { failed: !showName.trim(), message: "Name the job.", short: "name the job" },
    {
      failed: !invoiceNumber.trim(),
      message: "Give it an invoice number.",
      short: "give it an invoice number",
    },
    {
      failed: billable.length === 0 && parsedExpenses.length === 0,
      message: "Paint at least one day.",
      short: "paint a day",
    },
    {
      failed: Boolean(billingError),
      message: billingError ?? "",
      short: "",
    },
    {
      failed: Boolean(profileProblem),
      message: profileProblem,
      short: `add ${profileGap} to your profile`,
    },
  ].filter((c) => c.failed);
  const problems = checks.map((c) => c.message);
  const stillToDo = checks.map((c) => c.short).filter(Boolean);

  const saving = createInvoice.isPending || updateInvoice.isPending;

  /** Take the person to the first thing that needs doing, not just say so */
  const focusFirstProblem = () => {
    if (!clientId) {
      document
        .querySelector<HTMLElement>("#client-field button, #client-field input")
        ?.focus();
    } else if (!showName.trim()) {
      document.getElementById("job-name")?.focus();
    } else {
      document
        .getElementById("invoice-problems")
        ?.scrollIntoView({ block: "center" });
    }
  };

  const save = () => {
    setAttempted(true);
    if (problems.length || !bill) {
      focusFirstProblem();
      return;
    }
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
      correctsId: correcting?.id,
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
            href={source ? `/invoices/${source.id}` : "/invoices"}
            transitionTypes={["back"]}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            {source ? source.showName : "Invoices"}
          </Link>
        }
      />
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {invoice
          ? "Edit invoice"
          : correcting
            ? `Correct ${correcting.invoiceNumber}`
            : "New invoice"}
      </h1>

      {/* Said before any work is done, and without a way to lose it: the
          profile opens in its own tab, and this one notices when you're back */}
      {correcting && (
        <Alert className="mt-6">
          <AlertTitle>
            This replaces {correcting.invoiceNumber}, which will be voided
          </AlertTitle>
          <AlertDescription>
            The new invoice starts as a draft. {correcting.invoiceNumber} stays
            on record but stops counting, and can&apos;t be un-voided.
          </AlertDescription>
        </Alert>
      )}

      {profileGap && (
        <Alert className="mt-4">
          <AlertTitle>Add {profileGap} before you create an invoice</AlertTitle>
          <AlertDescription>
            <p>
              Every invoice carries them.{" "}
              <a
                href="/profile"
                target="_blank"
                rel="noopener"
                className="text-foreground underline underline-offset-2"
              >
                Open your profile
              </a>{" "}
              in a new tab: this invoice stays as it is, and this notice clears
              when you come back.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* One column in working order: client and job, days, expenses, then
          the invoice itself as the review step */}
      <div className="mt-8 space-y-4">
        <section
          className="bg-card rounded-2xl p-4 shadow-sm md:p-6 dark:border"
          aria-label="Client and job"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div id="client-field">
              <p className="mb-1.5 text-xs font-medium">
                Client <RequiredMark />
              </p>
              <ClientSelector
                value={clientId ?? undefined}
                onSelect={(id) => {
                  setClientId(id);
                  // A new client brings its own attention line
                  setAttentionTo(undefined);
                }}
                onCreateNew={() => setShowCreateClient(true)}
              />
              {attempted && !clientId && (
                <p className="text-destructive mt-1.5 text-xs">
                  Pick a client.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="job-name"
                className="mb-1.5 block text-xs font-medium"
              >
                Job <RequiredMark />
              </label>
              <Input
                id="job-name"
                value={showName}
                placeholder="e.g. Triplemania 34"
                aria-required="true"
                aria-invalid={attempted && !showName.trim() ? true : undefined}
                aria-describedby={
                  attempted && !showName.trim() ? "job-name-error" : undefined
                }
                onChange={(e) => setShowName(e.target.value)}
              />
              {attempted && !showName.trim() && (
                <p id="job-name-error" className="text-destructive mt-1.5 text-xs">
                  Name the job.
                </p>
              )}
            </div>
          </div>
          {/* The client's terms, read-only: they never change per job */}
          {client && (
            <p className="text-muted-foreground mt-3 text-xs">
              {terms ? ruleLine(terms, currency) : "No day rate set."}
              {sameClient && source?.terms
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
            <ul
              id="invoice-problems"
              className="text-destructive space-y-1 text-sm"
            >
              {problems.map((problem) => (
                <li key={problem}>
                  {problem}
                  {problem === profileProblem && (
                    <>
                      {" "}
                      <a
                        href="/profile"
                        target="_blank"
                        rel="noopener"
                        className="underline underline-offset-2"
                      >
                        Open your profile in a new tab
                      </a>
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
            <div className="text-muted-foreground text-sm">
              <p>
                Total{" "}
                <span className="text-foreground font-mono font-semibold">
                  {total}
                </span>
              </p>
              {/* Once there are days to bill, what stands between here and
                  Create invoice, before the click rather than after it */}
              {billable.length > 0 && stillToDo.length > 0 && (
                <p className="mt-0.5 text-xs">
                  Before you can create it: {stillToDo.join(", ")}.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={source ? `/invoices/${source.id}` : "/invoices"}>
                Cancel
              </Link>
            }
          />
          <Button type="button" onClick={save} disabled={saving}>
            {saving
              ? "Saving…"
              : invoice
                ? "Save changes"
                : correcting
                  ? "Create and void original"
                  : "Create invoice"}
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
