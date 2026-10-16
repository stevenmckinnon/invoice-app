import { Airplane01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { InvoiceTerms } from "@/lib/billing";
import {
  type StripDay,
  dateRange,
  dayOfMonth,
  legLabel,
  longDate,
  toLegs,
  weekdayShort,
} from "@/lib/day-strip";
import type { summariseInvoice } from "@/lib/invoice-summary";
import { cn, formatCurrency } from "@/lib/utils";

import {
  DARK_FILL,
  OT_AFTER_FILL,
  OT_FIRST_FILL,
  OT_PX_PER_HOUR,
  SLIVER,
  TRAVEL_FILL,
} from "./day-fills";
import { OvertimeCap } from "./OvertimeCap";

type Summary = ReturnType<typeof summariseInvoice>;

const ruleText = (terms: InvoiceTerms) => {
  const tier = terms.overtimeTier
    ? `2× after ${terms.overtimeTier.tierHours}h overtime a day`
    : "Overtime at 1.5×";
  const { bill, perDiem } = terms.travelWork;
  const travelWork = `Travel + work days bill as ${
    bill === "both" ? "both" : `a ${bill} day`
  }, ${perDiem} per diem`;
  return [tier, travelWork];
};

/**
 * The job drawn as its dates. Consecutive days of one type merge into a leg
 * of the trip; overtime rises out of the day it happened on; a work day that
 * also had travel carries a sliver at the end it happened. The legend below
 * doubles as the summary, every amount read from the stored lines.
 */
export const DayStrip = ({
  days,
  overtime,
  summary,
  terms,
  currency,
}: {
  days: StripDay[];
  /** Stored overtime per date, split by rate */
  overtime: Map<string, { at15: number; at2: number }>;
  summary: Summary;
  terms: InvoiceTerms | null;
  currency: string;
}) => {
  if (!days.length) return null;
  const legs = toLegs(days);
  const columns = days.length;
  const off = days.filter((d) => d.type === "off").length;
  const longest = Math.max(
    0,
    ...days.map((d) => {
      const ot = overtime.get(d.date);
      return ot ? ot.at15 + ot.at2 : 0;
    }),
  );
  const money = (amount: number) => formatCurrency(amount, currency);
  const gridColumns = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  };

  return (
    <section className="bg-card rounded-2xl p-5 shadow-sm md:p-6 dark:border">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">The job</h2>
          <p className="text-muted-foreground text-xs">
            {dateRange(days[0].date, days.at(-1)!.date)} · {columns - off}{" "}
            billed {columns - off === 1 ? "day" : "days"}
            {off ? ` · ${off} off` : ""}
          </p>
        </div>
        {terms && (
          <div className="text-muted-foreground hidden text-right text-xs sm:block">
            {ruleText(terms).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </div>

      {/* The strip is drawn for the eye; this is the same schedule for
          screen readers, one day per item */}
      <ol className="sr-only" aria-label="Schedule">
        {days.map((day) => {
          const ot = overtime.get(day.date);
          return (
            <li key={day.date}>
              {longDate(day.date)}:{" "}
              {day.type === "off"
                ? "day off, not billed"
                : day.type === "travel"
                  ? `travel ${day.direction}`
                  : `${day.type} day`}
              {day.alsoTravel === "out" && ", flew in that morning"}
              {day.alsoTravel === "home" && ", flew home after wrap"}
              {ot &&
                `, plus ${ot.at15 + ot.at2} hours overtime: ${[
                  ot.at15 && `${ot.at15} at 1.5×`,
                  ot.at2 && `${ot.at2} at 2×`,
                ]
                  .filter(Boolean)
                  .join(", ")}`}
            </li>
          );
        })}
      </ol>

      {/* A long job scrolls sideways inside the card on a phone rather than
          crushing two weeks into a 343px column */}
      <div
        className={cn(
          columns > 7 &&
            "-mx-5 overflow-x-auto overscroll-x-contain px-5 md:mx-0 md:px-0",
        )}
      >
        <div
          aria-hidden="true"
          style={{ minWidth: columns > 7 ? columns * 40 : undefined }}
        >
          <div className="grid" style={gridColumns}>
            {days.map((day) => (
              <div key={day.date} className="text-center">
                <p className="text-muted-foreground text-[11px]">
                  {weekdayShort(day.date)}
                </p>
                <p
                  className={cn(
                    "font-mono text-sm font-semibold tabular-nums",
                    day.type === "off" && "text-muted-foreground font-normal",
                  )}
                >
                  {dayOfMonth(day.date)}
                </p>
              </div>
            ))}
          </div>

          {/* Headroom sized to the longest overtime day plus its label */}
          <div
            className="grid gap-1"
            style={{ ...gridColumns, marginTop: longest * OT_PX_PER_HOUR + 24 }}
          >
            {legs.map((leg) => {
              const label = legLabel(leg);
              const legDays = days.slice(leg.start, leg.start + leg.days);
              const single = leg.days === 1;
              const span = {
                gridColumn: `${leg.start + 1} / span ${leg.days}`,
              };

              if (leg.type === "off") {
                return (
                  <div
                    key={leg.start}
                    style={span}
                    className="border-border flex h-10 items-center justify-center border-b border-dashed"
                  >
                    <span className="text-muted-foreground text-[11px]">
                      Off
                    </span>
                  </div>
                );
              }

              const firstOt = overtime.get(legDays[0].date);
              const lastOt = overtime.get(legDays.at(-1)!.date);
              return (
                <div
                  key={leg.start}
                  style={{
                    ...span,
                    // A hairline between each day inside the leg, so it still
                    // counts as days without breaking into separate blocks
                    backgroundImage: `linear-gradient(to right, transparent calc(100% - 1px), ${
                      leg.type === "work"
                        ? "color-mix(in oklch, var(--color-primary-foreground) 25%, transparent)"
                        : "color-mix(in oklch, var(--color-primary) 25%, transparent)"
                    } calc(100% - 1px))`,
                    backgroundSize: `calc(100% / ${leg.days}) 100%`,
                    // Square the corner an overtime cap sits on, so cap and
                    // leg read as one silhouette instead of a cap on a curve
                    ...(firstOt && { borderTopLeftRadius: 0 }),
                    ...(lastOt && { borderTopRightRadius: 0 }),
                    // Keep the label clear of a travel sliver at either end
                    ...(legDays[0].alsoTravel === "out" && {
                      paddingLeft: `calc(${SLIVER * 100}% / ${leg.days} + 8px)`,
                    }),
                    ...(legDays.at(-1)!.alsoTravel === "home" && {
                      paddingRight: `calc(${SLIVER * 100}% / ${leg.days} + 8px)`,
                    }),
                  }}
                  className={cn(
                    "relative flex h-10 items-center gap-1.5 rounded-lg",
                    single ? "justify-center px-1" : "px-3",
                    leg.type === "work" && "bg-primary text-primary-foreground",
                    leg.type === "travel" && cn("text-primary", TRAVEL_FILL),
                    leg.type === "dark" && DARK_FILL,
                  )}
                >
                  {legDays.map((day, i) => {
                    const ot = overtime.get(day.date);
                    return ot ? (
                      <OvertimeCap
                        key={`ot${i}`}
                        at15={ot.at15}
                        at2={ot.at2}
                        className="absolute bottom-full rounded-t-[6px]"
                        style={{
                          left: `calc(100% / ${leg.days} * ${i})`,
                          width: `calc(100% / ${leg.days})`,
                        }}
                      />
                    ) : null;
                  })}
                  {legDays.map((day, i) => {
                    if (!day.alsoTravel) return null;
                    const atStart = day.alsoTravel === "out";
                    const dayLeft = `calc(100% / ${leg.days} * ${i})`;
                    const width = `calc(100% / ${leg.days} * ${SLIVER})`;
                    // Only round the sliver where it meets the leg's corner
                    const corner =
                      atStart && i === 0
                        ? {
                            borderTopLeftRadius: "inherit",
                            borderBottomLeftRadius: "inherit",
                          }
                        : !atStart && i === leg.days - 1
                          ? {
                              borderTopRightRadius: "inherit",
                              borderBottomRightRadius: "inherit",
                            }
                          : {};
                    return (
                      <div
                        key={`t${i}`}
                        className="bg-card absolute inset-y-0"
                        style={{
                          left: atStart
                            ? dayLeft
                            : `calc(${dayLeft} + 100% / ${leg.days} - ${width})`,
                          width,
                          ...corner,
                        }}
                      >
                        <div
                          className={cn(
                            "text-primary flex size-full items-center justify-center rounded-[inherit]",
                            TRAVEL_FILL,
                          )}
                        >
                          <HugeiconsIcon
                            icon={Airplane01Icon}
                            className={cn(
                              "size-3",
                              day.alsoTravel === "home" && "-scale-x-100",
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {leg.type === "travel" && (
                    <HugeiconsIcon
                      icon={Airplane01Icon}
                      className={cn(
                        "relative size-3.5 shrink-0",
                        leg.direction === "home" && "-scale-x-100",
                      )}
                    />
                  )}
                  {/* One-day legs are too narrow for words on a phone; the
                      fill, outline or icon carries them there */}
                  {!(single && leg.type === "travel") && (
                    <span
                      className={cn(
                        "relative truncate text-xs font-semibold",
                        single && "hidden sm:inline",
                      )}
                    >
                      <span className="sm:hidden">{label.short}</span>
                      <span className="hidden sm:inline">
                        {single ? label.short : label.full}
                      </span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend doubles as the summary. Overtime is one item with a two-part
          swatch: as two items the legend wrapped and orphaned "2×". */}
      <dl className="border-border/60 mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 sm:grid-cols-4">
        {[
          {
            swatch: <span className="bg-primary size-2.5 rounded-[3px]" />,
            label: "Work",
            detail: `${summary.work.days} ${summary.work.days === 1 ? "day" : "days"}${
              summary.comboDays ? ` · ${summary.comboDays} with travel` : ""
            }`,
            amount: summary.work.amount,
          },
          {
            swatch: (
              <span className={cn("size-2.5 rounded-[3px]", TRAVEL_FILL)} />
            ),
            label: "Travel",
            detail: `${summary.travel.days} ${summary.travel.days === 1 ? "day" : "days"}`,
            amount: summary.travel.amount,
          },
          {
            swatch: (
              <span className={cn("size-2.5 rounded-[3px]", DARK_FILL)} />
            ),
            label: "Dark",
            detail: summary.dark.days
              ? `${summary.dark.days} ${summary.dark.days === 1 ? "day" : "days"}`
              : "None",
            amount: summary.dark.amount,
          },
          {
            swatch: (
              <span className="flex size-2.5 flex-col overflow-hidden rounded-[3px]">
                <span className={cn("flex-1", OT_AFTER_FILL)} />
                <span className={cn("flex-1", OT_FIRST_FILL)} />
              </span>
            ),
            label: "Overtime",
            detail:
              [
                summary.overtime.first && `${summary.overtime.first}h at 1.5×`,
                summary.overtime.after && `${summary.overtime.after}h at 2×`,
              ]
                .filter(Boolean)
                .join(" · ") || "None",
            amount: summary.overtime.amount,
          },
        ].map((item) => (
          <div key={item.label}>
            <dt className="flex items-center gap-2 text-xs font-medium">
              {item.swatch}
              {item.label}
            </dt>
            <dd className="mt-0.5 pl-[18px] font-mono text-sm tabular-nums">
              {item.amount ? money(item.amount) : "—"}
            </dd>
            <dd className="text-muted-foreground pl-[18px] text-[11px] text-pretty">
              {item.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
