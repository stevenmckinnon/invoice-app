"use client";

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import type { InvoiceTerms, TravelDirection } from "@/lib/billing";
import type { PaintedDay, Painted } from "@/lib/day-editor";
import { type StripDay, longDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";

const Segmented = <T extends string | undefined>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className="bg-muted flex w-fit rounded-full p-0.5 text-xs font-medium"
  >
    {options.map((option) => (
      <button
        key={option.label}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={cn(
          "rounded-full px-3 py-1.5 transition-colors",
          value === option.value
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {option.label}
      </button>
    ))}
  </div>
);

/** Overtime is logged in half hours, up to a 24-hour day */
const OT_STEP = 0.5;
const OT_MAX = 14;

/**
 * Detail for the day last tapped: travel on a work day, a travel day's
 * direction when the guess is wrong, and overtime with how it'll split.
 */
export const DayDetails = ({
  date,
  painted,
  setPainted,
  day,
  terms,
}: {
  date: string;
  painted: Painted;
  setPainted: React.Dispatch<React.SetStateAction<Painted>>;
  /** The day as billed, if it's in the job */
  day?: StripDay;
  terms: InvoiceTerms | null;
}) => {
  const entry = painted.get(date);
  const update = (patch: Partial<PaintedDay>) =>
    setPainted((prev) => {
      const current = prev.get(date);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(date, { ...current, ...patch });
      return next;
    });

  const hours = entry?.overtimeHours ?? 0;
  // Split as billDays will: the tier's first rate up to its hours, then its
  // second; no tier, all of it at 1.5x
  const tier = terms?.overtimeTier ?? null;
  const first = tier ? Math.min(hours, tier.tierHours) : hours;
  const after = hours - first;
  const rate = (r: string) => r.replace("x", "×");
  const bill = terms?.travelWork.bill;

  return (
    <section
      className="bg-card rounded-2xl p-4 shadow-sm md:p-6 dark:border"
      aria-label="Selected day"
    >
      <h2 className="text-sm font-semibold">{longDate(date)}</h2>

      {!entry || entry.type === "off" ? (
        <p className="text-muted-foreground mt-1 text-sm">
          {day
            ? "A day off inside the job: not billed. Paint it to bill it."
            : "Not part of this job. Paint it to add it."}
        </p>
      ) : entry.type === "dark" ? (
        <p className="text-muted-foreground mt-1 text-sm">
          Dark day: billed at the day rate, with the travel per diem.
        </p>
      ) : entry.type === "travel" ? (
        <div className="mt-4">
          <Segmented<TravelDirection | undefined>
            label="Travel direction"
            options={[
              { value: undefined, label: "Automatic" },
              { value: "out", label: "Travelling out" },
              { value: "home", label: "Travelling home" },
            ]}
            value={entry.direction}
            onChange={(direction) => update({ direction })}
          />
          <p className="text-muted-foreground mt-2 text-xs">
            {entry.direction
              ? "Set by hand."
              : `Worked out as travelling ${day?.direction ?? "out"} from the days around it.`}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium">Travel on this day</p>
            <Segmented<TravelDirection | "auto" | undefined>
              label="Travel on this day"
              options={[
                { value: undefined, label: "None" },
                { value: "out", label: "Flew in" },
                { value: "home", label: "Flew home" },
              ]}
              // An automatic direction shows as whichever it resolved to
              value={
                entry.alsoTravel === "auto" ? day?.alsoTravel : entry.alsoTravel
              }
              onChange={(alsoTravel) => update({ alsoTravel })}
            />
            <p className="text-muted-foreground mt-2 text-xs">
              {entry.alsoTravel
                ? `Bills as ${
                    bill === "both"
                      ? "a work day and a travel day"
                      : `a ${bill ?? "work"} day`
                  }, with the ${terms?.travelWork.perDiem ?? "travel"} per diem.${
                    entry.alsoTravel === "auto"
                      ? " Direction worked out from the days around it."
                      : ""
                  }`
                : "Flew in before call, or home after wrap? Mark it here."}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium" id={`ot-${date}`}>
              Overtime
            </p>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-labelledby={`ot-${date}`}
            >
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Half an hour less"
                disabled={hours <= 0}
                onClick={() =>
                  update({ overtimeHours: Math.max(0, hours - OT_STEP) })
                }
              >
                <HugeiconsIcon icon={MinusSignIcon} />
              </Button>
              <output
                className="w-14 text-center font-mono text-lg font-semibold tabular-nums"
                aria-live="polite"
              >
                {hours}h
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Half an hour more"
                disabled={hours >= OT_MAX}
                onClick={() => update({ overtimeHours: hours + OT_STEP })}
              >
                <HugeiconsIcon icon={PlusSignIcon} />
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {hours
                ? tier && after
                  ? `${first}h at ${rate(tier.firstRate)} and ${after}h at ${rate(tier.afterRate)}: the rate changes after ${tier.tierHours}h.`
                  : `${hours}h at ${rate(tier?.firstRate ?? "1.5x")}.`
                : "Hours past a 10-hour day."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
