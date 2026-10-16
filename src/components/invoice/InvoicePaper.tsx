import { InvoiceStatusBadge } from "@/components/InvoiceStatusBadge";
import type { InvoiceWithRelations } from "@/hooks/use-invoices";
import { type StripDay, dayOfMonth, shortDateList } from "@/lib/day-strip";
import type { SummaryLine, summariseInvoice } from "@/lib/invoice-summary";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { DARK_FILL, TRAVEL_FILL } from "./day-fills";
import { OvertimeCap } from "./OvertimeCap";

type Summary = ReturnType<typeof summariseInvoice>;

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
    {children}
  </p>
);

/** Address parts, skipping blanks; "City, State" shares a line */
const AddressLines = ({
  lines,
}: {
  lines: Array<string | null | undefined>;
}) => (
  <>
    {lines
      .map((line) => line?.trim())
      .filter(Boolean)
      .map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
  </>
);

const LineGroup = ({
  title,
  lines,
  currency,
}: {
  title: string;
  lines: SummaryLine[];
  currency: string;
}) =>
  lines.length ? (
    <tbody>
      <tr>
        <th
          colSpan={4}
          scope="colgroup"
          className="text-muted-foreground pt-6 pb-2 text-left text-[10px] font-semibold tracking-[0.16em] uppercase"
        >
          {title}
        </th>
      </tr>
      {lines.map((line, i) => (
        <tr key={i} className="border-border/50 border-t">
          <td className="py-2.5 pr-4">
            {line.description}
            {line.dates?.length ? (
              <span className="text-muted-foreground">
                {" "}
                · {shortDateList(line.dates)}
              </span>
            ) : null}
          </td>
          <td className="py-2.5 text-right font-mono tabular-nums">
            {line.qty}
            {line.unit ?? ""}
          </td>
          <td className="text-muted-foreground hidden py-2.5 text-right font-mono tabular-nums @md:table-cell">
            {formatCurrency(line.rate, currency)}
          </td>
          <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
            {formatCurrency(line.amount, currency)}
          </td>
        </tr>
      ))}
    </tbody>
  ) : null;

/** The job's days at a glance, on the paper itself */
const MiniSchedule = ({
  days,
  overtime,
}: {
  days: StripDay[];
  overtime: Map<string, { at15: number; at2: number }>;
}) => {
  const many = days.length > 7;
  return (
    <div aria-hidden="true">
      <Eyebrow>Schedule</Eyebrow>
      <div className={cn("flex", many ? "gap-0.5" : "gap-1")}>
        {days.map((day, i) => {
          // A long job can't label every day at this size; the ends anchor it
          const showDate = !many || i === 0 || i === days.length - 1;
          const ot = overtime.get(day.date);
          return (
            <div
              key={day.date}
              className={cn("min-w-0 text-center", many ? "flex-1" : "w-7")}
            >
              <div className="flex h-5 flex-col justify-end">
                {ot ? (
                  <OvertimeCap
                    at15={ot.at15}
                    at2={ot.at2}
                    showLabel={false}
                    // A third of the strip's scale: long days still stand taller
                    className="rounded-t-[2px] [&>div]:max-h-1.5"
                  />
                ) : null}
                <div
                  className={cn(
                    "h-3",
                    ot ? "rounded-b-[2px]" : "rounded-[2px]",
                    day.type === "work" && "bg-primary",
                    day.type === "travel" && TRAVEL_FILL,
                    day.type === "dark" && DARK_FILL,
                    day.type === "off" &&
                      "border-border border-b border-dashed",
                    day.alsoTravel && "relative overflow-hidden",
                  )}
                >
                  {day.alsoTravel && (
                    <div
                      className={cn(
                        "bg-card absolute inset-y-0 w-[40%]",
                        day.alsoTravel === "out" ? "left-0" : "right-0",
                      )}
                    >
                      <div className={cn("size-full", TRAVEL_FILL)} />
                    </div>
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "mt-1 font-mono text-[10px] tabular-nums",
                  !showDate && "invisible",
                )}
              >
                {dayOfMonth(day.date)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * The invoice as the document itself: paper on the warm canvas rather than a
 * dashboard of cards about it. Everything is read from the stored invoice,
 * so it shows exactly what the PDF does. Sized by its own width (container
 * queries), since it sits in the page column at every breakpoint.
 */
export const InvoicePaper = ({
  invoice,
  summary,
  days,
  overtime,
}: {
  invoice: InvoiceWithRelations;
  summary: Summary;
  days: StripDay[];
  overtime: Map<string, { at15: number; at2: number }>;
}) => {
  const currency = invoice.currency;
  const payment = [
    { label: "IBAN", value: invoice.iban },
    { label: "SWIFT / BIC", value: invoice.swiftBic },
    { label: "Account no.", value: invoice.accountNumber },
    { label: "Sort code", value: invoice.sortCode },
    { label: "Bank address", value: invoice.bankAddress },
  ].filter((field) => field.value);

  return (
    <div className="@container">
      <article
        aria-label={`Invoice ${invoice.invoiceNumber}`}
        className={cn(
          "bg-card w-full rounded-md px-6 py-8 text-sm @2xl:px-14 @2xl:py-14",
          // Paper, not a card: tight contact shadow plus a long soft lift
          "shadow-[0_1px_2px_oklch(0.3_0.03_83/0.08),0_12px_32px_-8px_oklch(0.3_0.03_83/0.16),0_32px_64px_-24px_oklch(0.3_0.03_83/0.14)]",
          "dark:border dark:shadow-none",
        )}
      >
        <header className="flex flex-col justify-between gap-8 @md:flex-row">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.2em] uppercase">
              Invoice
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </p>
            <div className="mt-3">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
          <address className="text-muted-foreground not-italic @md:text-right">
            <span className="text-foreground block font-semibold">
              {invoice.fullName}
            </span>
            <AddressLines
              lines={[
                invoice.email,
                invoice.addressLine1,
                invoice.addressLine2,
                [invoice.city, invoice.state].filter(Boolean).join(", "),
                invoice.postalCode,
                invoice.country,
              ]}
            />
          </address>
        </header>

        <div className="mt-10 grid gap-8 @lg:grid-cols-3">
          <div>
            <Eyebrow>Billed to</Eyebrow>
            {invoice.clientName ? (
              <div className="text-muted-foreground">
                <span className="text-foreground block font-semibold">
                  {invoice.clientName}
                </span>
                {invoice.attentionTo && (
                  <span className="block">Attn: {invoice.attentionTo}</span>
                )}
                <AddressLines
                  lines={[
                    invoice.clientAddress1,
                    invoice.clientAddress2,
                    [invoice.clientCity, invoice.clientState]
                      .filter(Boolean)
                      .join(", "),
                    invoice.clientPostalCode,
                    invoice.clientCountry,
                  ]}
                />
              </div>
            ) : (
              <p className="text-muted-foreground">No client on this invoice</p>
            )}
          </div>
          <div>
            <Eyebrow>Job</Eyebrow>
            <p className="font-semibold">{invoice.showName}</p>
            <p className="text-muted-foreground" suppressHydrationWarning>
              Issued {formatDate(invoice.invoiceDate)}
            </p>
          </div>
          {days.length > 0 && <MiniSchedule days={days} overtime={overtime} />}
        </div>

        <table className="mt-6 w-full">
          <thead className="sr-only">
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Quantity</th>
              <th scope="col">Rate</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <LineGroup
            title="Labour"
            lines={summary.labour}
            currency={currency}
          />
          <LineGroup
            title="Per diems"
            lines={summary.perDiems}
            currency={currency}
          />
          <LineGroup title="Other" lines={summary.other} currency={currency} />
          <LineGroup
            title="Expenses"
            lines={summary.expenses}
            currency={currency}
          />
        </table>
        {[
          summary.labour,
          summary.perDiems,
          summary.other,
          summary.expenses,
        ].every((group) => !group.length) && (
          <p className="text-muted-foreground mt-6">
            Nothing billed on this invoice yet.
          </p>
        )}

        <div className="border-foreground mt-6 flex items-baseline justify-between border-t-2 pt-4">
          <span className="text-[10px] font-semibold tracking-[0.16em] uppercase">
            Total due
          </span>
          <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(invoice.totalAmount, currency)}
          </span>
        </div>

        {invoice.notes && (
          <div className="mt-8">
            <Eyebrow>Notes</Eyebrow>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {payment.length > 0 && (
          <footer className="border-border/60 text-muted-foreground mt-12 grid gap-4 border-t pt-6 text-xs @md:grid-cols-3">
            <div>
              <p className="text-foreground mb-1 font-medium">Pay to</p>
              {invoice.fullName}
            </div>
            {payment.map((field) => (
              <div key={field.label} className="min-w-0">
                <p className="text-foreground mb-1 font-medium">
                  {field.label}
                </p>
                <span
                  className={cn(
                    "break-words",
                    field.label !== "Bank address" && "font-mono",
                  )}
                >
                  {field.value}
                </span>
              </div>
            ))}
          </footer>
        )}
      </article>
    </div>
  );
};
