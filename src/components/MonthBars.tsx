"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatFy } from "@/lib/tax-year";
import { cn, formatCurrency } from "@/lib/utils";

export type MonthBar = {
  /** Short month name, "Apr" */
  month: string;
  /** Null for a month that hasn't happened yet */
  revenue: number | null;
  /** The same month a year earlier; null with no earlier year to compare */
  previous: number | null;
  invoices: number;
};

/**
 * A tax year as twelve bars, April first, each standing in a full-height
 * track. Months still to come are bare tracks, so the year's shape reads at a
 * glance without an axis; last year's month is a mark across its track. The
 * figures are in the tooltips and, for screen readers, in the list itself.
 */
export const MonthBars = ({
  data,
  fy,
  currency,
}: {
  data: MonthBar[];
  /** The tax year shown, by the year it starts in */
  fy: number;
  currency: string;
}) => {
  const max = Math.max(
    1,
    ...data.map((m) => Math.max(m.revenue ?? 0, m.previous ?? 0)),
  );
  const pct = (value: number) => `${(value / max) * 100}%`;

  return (
    <ol
      className="grid grid-cols-12 gap-1 sm:gap-2"
      aria-label={`Invoiced by month, ${formatFy(fy)}`}
    >
      {data.map((m) => (
        <li key={m.month} className="flex flex-col items-center gap-2">
          <span className="sr-only">
            {m.month}:{" "}
            {m.revenue === null
              ? "still to come"
              : `${formatCurrency(m.revenue, currency)} invoiced`}
            {m.previous !== null &&
              `, ${formatCurrency(m.previous, currency)} in ${formatFy(fy - 1)}`}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <div
                  aria-hidden="true"
                  className="bg-muted relative h-36 w-full max-w-10 overflow-hidden rounded-full sm:h-48"
                />
              }
            >
              {m.revenue !== null && m.revenue > 0 && (
                <div
                  className="bg-primary absolute inset-x-0 bottom-0 min-h-1.5 rounded-full transition-[height] duration-500 ease-out"
                  style={{ height: pct(m.revenue) }}
                />
              )}
              {m.previous !== null && m.previous > 0 && (
                <div
                  className="bg-foreground/45 absolute inset-x-0 h-0.5 translate-y-1/2"
                  style={{ bottom: pct(m.previous) }}
                />
              )}
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{m.month}</p>
              <p className="tabular-nums">
                {formatFy(fy)}:{" "}
                {m.revenue === null
                  ? "still to come"
                  : formatCurrency(m.revenue, currency)}
                {m.revenue !== null && m.invoices > 0
                  ? ` · ${m.invoices} invoice${m.invoices !== 1 ? "s" : ""}`
                  : ""}
              </p>
              {m.previous !== null && (
                <p className="tabular-nums opacity-70">
                  {formatFy(fy - 1)}: {formatCurrency(m.previous, currency)}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
          <span
            aria-hidden="true"
            className={cn(
              "text-muted-foreground text-[11px] font-medium",
              m.revenue === null && "opacity-60",
            )}
          >
            {m.month}
          </span>
        </li>
      ))}
    </ol>
  );
};
