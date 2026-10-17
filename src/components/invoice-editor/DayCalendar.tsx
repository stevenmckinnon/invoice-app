"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  Airplane01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { DARK_FILL, TRAVEL_FILL } from "@/components/invoice/day-fills";
import { Button } from "@/components/ui/button";
import {
  BRUSHES,
  type Brush,
  type Painted,
  applyStroke,
  matchesBrush,
  monthGrid,
} from "@/lib/day-editor";
import { type StripDay, dayOfMonth, longDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";

const monthName = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const BrushSwatch = ({ brush }: { brush: Brush }) => (
  <span
    aria-hidden="true"
    className={cn(
      "size-2.5 shrink-0 rounded-[3px]",
      brush === "work" && "bg-primary",
      brush === "travel" && TRAVEL_FILL,
      brush === "dark" && "border-muted-foreground/60 border border-dashed",
      brush === "off" && "border-muted-foreground/60 border-b border-dashed",
      brush === "worktravel" && "bg-primary flex overflow-hidden",
    )}
  >
    {/* A travel sliver on a work day, as on the strip */}
    {brush === "worktravel" && (
      <span className="bg-card w-[45%]">
        <span className={cn("block size-full", TRAVEL_FILL)} />
      </span>
    )}
  </span>
);

/**
 * Paint a job's days onto a month. Tap or drag with a brush. Tapping a day
 * the brush already matches selects it, and tapping it again clears it; a
 * drag that starts on one clears every day of that kind it crosses. Painting
 * outside the job extends it; gaps inside become days off.
 */
export const DayCalendar = ({
  painted,
  setPainted,
  days,
  selected,
  onSelect,
  total,
  initialMonth,
}: {
  painted: Painted;
  setPainted: React.Dispatch<React.SetStateAction<Painted>>;
  /** The job as billed: gaps filled as off, directions resolved */
  days: StripDay[];
  selected: string | null;
  onSelect: (date: string) => void;
  /** Formatted running total, shown while painting */
  total: string;
  /** yyyy-mm-dd: which month to open on */
  initialMonth: string;
}) => {
  const [cursor, setCursor] = useState(() => ({
    year: Number(initialMonth.slice(0, 4)),
    month: Number(initialMonth.slice(5, 7)) - 1,
  }));
  const [brush, setBrush] = useState<Brush>("work");
  const painting = useRef(false);
  // Decided once per gesture by the day it starts on and held for the whole
  // drag, so one stroke never flickers days on and off
  const strokeErases = useRef(false);
  // A press on an unselected day the brush already matches only selects it:
  // you tap a day to edit its overtime, and a tap that deleted it would be a
  // trap. It becomes an erase if the finger moves on to another day.
  const pendingErase = useRef<string | null>(null);

  const paint = useCallback(
    (date: string) =>
      setPainted((prev) =>
        applyStroke(prev, date, brush, strokeErases.current),
      ),
    [brush, setPainted],
  );

  // Touch pointers are captured by the element they start on, so the cell
  // under the finger is found by position, not by pointerenter
  const onGridPointerMove = (e: React.PointerEvent) => {
    if (!painting.current) return;
    const cell = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-date]");
    const date = cell?.dataset.date;
    if (!date) return;
    if (pendingErase.current) {
      if (date === pendingErase.current) return;
      paint(pendingErase.current);
      pendingErase.current = null;
    }
    paint(date);
    onSelect(date);
  };

  useEffect(() => {
    const stop = () => {
      painting.current = false;
      pendingErase.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const byDate = new Map(days.map((day) => [day.date, day]));
  const grid = monthGrid(cursor.year, cursor.month);
  const thisMonth = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const step = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <section
      className="bg-card rounded-2xl p-4 shadow-sm md:p-6 dark:border"
      aria-label="Days"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => step(-1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Button>
            <h2
              className="min-w-[8.5rem] text-center text-sm font-semibold"
              aria-live="polite"
            >
              {monthName(cursor.year, cursor.month)}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => step(1)}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} />
            </Button>
          </div>
          {/* Live feedback while painting: the paper and its total are
              further down the page */}
          <p className="font-mono text-sm font-semibold tabular-nums">
            {total}
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Paint days as"
          className="bg-muted flex w-full overflow-x-auto rounded-full p-0.5 text-[11px] font-medium sm:w-auto sm:text-xs"
        >
          {BRUSHES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={brush === option.id}
              onClick={() => setBrush(option.id)}
              className={cn(
                // Below sm the five brushes share the full row
                "flex flex-auto shrink-0 items-center justify-center gap-1 rounded-full px-1.5 py-1.5 whitespace-nowrap transition-colors sm:flex-none sm:gap-1.5 sm:px-3",
                brush === option.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BrushSwatch brush={option.id} />
              {option.short ? (
                <>
                  <span className="sm:hidden">{option.short}</span>
                  <span className="hidden sm:inline">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        className="text-muted-foreground mb-1 grid grid-cols-7 gap-1 text-[11px]"
        aria-hidden="true"
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          // Left-aligned with the date numbers in the tiles below, not centred
          <span key={d} className="px-1.5 sm:px-2">
            {d}
          </span>
        ))}
      </div>

      {/* touch-none so a drag paints instead of scrolling the page */}
      <div
        className="grid touch-none grid-cols-7 gap-1 select-none"
        onPointerMove={onGridPointerMove}
      >
        {grid.map((date) => {
          const entry = painted.get(date);
          const day = byDate.get(date);
          const type = day?.type;
          const travel = day?.alsoTravel;
          const isSelected = date === selected;
          const otherMonth = !date.startsWith(thisMonth);

          return (
            <button
              key={date}
              type="button"
              data-date={date}
              aria-pressed={isSelected}
              aria-label={`${longDate(date)}: ${
                type
                  ? type === "off"
                    ? "off"
                    : `${type} day`
                  : "not in the job"
              }${day?.overtimeHours ? `, ${day.overtimeHours}h overtime` : ""}${
                travel === "out"
                  ? ", flew in that morning"
                  : travel === "home"
                    ? ", flew home after wrap"
                    : ""
              }`}
              onPointerDown={(e) => {
                // Keeps the focus ring off for pointer use; click handles keys
                e.preventDefault();
                painting.current = true;
                const matches = matchesBrush(entry, brush);
                strokeErases.current = matches;
                // Tap a matching day to select it; tap it again to clear it
                if (matches && !isSelected) pendingErase.current = date;
                else paint(date);
                onSelect(date);
              }}
              onClick={(e) => {
                // Pointer taps were handled on pointerdown; acting on their
                // click too would undo them. Keyboard clicks (Enter/Space)
                // report detail 0, and follow the same select-then-clear rule.
                if (e.detail !== 0) return;
                const matches = matchesBrush(entry, brush);
                strokeErases.current = matches;
                if (!(matches && !isSelected)) paint(date);
                onSelect(date);
              }}
              className={cn(
                "relative flex h-12 flex-col items-start overflow-hidden rounded-lg p-1.5 text-left transition-[box-shadow] sm:h-16 sm:p-2",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                type === "work" && "bg-primary text-primary-foreground",
                type === "travel" && cn("text-primary", TRAVEL_FILL),
                type === "dark" && DARK_FILL,
                type === "off" &&
                  "border-border text-muted-foreground border-b border-dashed",
                !type && "hover:bg-muted text-muted-foreground",
                otherMonth && !type && "opacity-50",
                isSelected &&
                  "ring-foreground ring-offset-card ring-2 ring-offset-1",
              )}
            >
              {/* Date top-left, with a plane after it for travel + work;
                  overtime bottom-right. Fixed corners, so nothing collides
                  even at 40px */}
              <span className="flex items-center gap-0.5">
                <span className="font-mono text-xs font-semibold tabular-nums sm:text-sm">
                  {dayOfMonth(date)}
                </span>
                {travel && (
                  <HugeiconsIcon
                    icon={Airplane01Icon}
                    className={cn(
                      "size-3 sm:size-3.5",
                      travel === "home" && "-scale-x-100",
                    )}
                    aria-hidden="true"
                  />
                )}
              </span>
              {type === "travel" && (
                <HugeiconsIcon
                  icon={Airplane01Icon}
                  className={cn(
                    "mt-auto size-3.5",
                    day?.direction === "home" && "-scale-x-100",
                  )}
                  aria-hidden="true"
                />
              )}
              {day?.overtimeHours ? (
                // On the card, not the blue: amber text on primary fails
                <span className="bg-card text-warning absolute right-1 bottom-1 rounded-full px-1 font-mono text-[10px] leading-4 font-semibold sm:right-1.5 sm:bottom-1.5 sm:px-1.5">
                  +{day.overtimeHours}h
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-3 text-xs">
        Tap or drag to paint. Tap a painted day to select it, and tap it again
        to clear it; dragging from it clears every day of that kind it crosses.
      </p>
    </section>
  );
};
