"use client";

import { useEffect, useRef, useState } from "react";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { monthGrid } from "@/lib/day-editor";
import { calendarKeyTarget } from "@/lib/day-keyboard";
import { dayOfMonth, longDate } from "@/lib/day-strip";
import { cn } from "@/lib/utils";

const monthName = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * Pick the dates a pencil holds: tap to add or remove one, or drag across a
 * run. One Tab stop, with the arrows moving a day or a week and Page Up and
 * Page Down changing month (`calendarKeyTarget`, as in the day editor);
 * Space and Enter toggle. Dates another pencil holds carry a dot.
 */
export const DatePickerGrid = ({
  value,
  onChange,
  busy,
  initialMonth,
  invalid,
  describedBy,
}: {
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  /** Dates other holds already have */
  busy: Set<string>;
  /** yyyy-mm-dd: which month to open on */
  initialMonth: string;
  invalid?: boolean;
  describedBy?: string;
}) => {
  const [cursor, setCursor] = useState(() => ({
    year: Number(initialMonth.slice(0, 4)),
    month: Number(initialMonth.slice(5, 7)) - 1,
  }));
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  // One drag either adds or removes, decided by the date it starts on
  const dragAdds = useRef<boolean | null>(null);
  const selected = new Set(value);

  // From the latest dates, not this render's: a drag fires faster than renders
  const set = (date: string, on: boolean) =>
    onChange((prev) => {
      if (prev.includes(date) === on) return prev;
      return on ? [...prev, date].sort() : prev.filter((d) => d !== date);
    });

  useEffect(() => {
    const stop = () => {
      dragAdds.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  useEffect(() => {
    const date = pendingFocus.current;
    if (!date) return;
    pendingFocus.current = null;
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus();
  }, [cursor.year, cursor.month, focusDate]);

  const grid = monthGrid(cursor.year, cursor.month);
  const thisMonth = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const tabDate =
    (focusDate && grid.includes(focusDate) && focusDate) ||
    grid.find((d) => d.startsWith(thisMonth) && selected.has(d)) ||
    `${thisMonth}-01`;

  const step = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
          <HugeiconsIcon icon={ArrowLeft01Icon} />
        </Button>
        <p className="text-sm font-semibold" aria-live="polite">
          {monthName(cursor.year, cursor.month)}
        </p>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => step(1)}>
          <HugeiconsIcon icon={ArrowRight01Icon} />
        </Button>
      </div>
      <div className="text-muted-foreground mb-1 grid grid-cols-7 gap-1 text-center text-[11px]" aria-hidden="true">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      {/* touch-none so a drag picks dates instead of scrolling */}
      <div
        ref={gridRef}
        role="group"
        aria-label="Dates"
        aria-describedby={describedBy}
        className={cn(
          "grid touch-none grid-cols-7 gap-1 rounded-lg select-none",
          invalid && "ring-destructive ring-2 ring-offset-2 ring-offset-card",
        )}
        onPointerMove={(e) => {
          if (dragAdds.current === null) return;
          const date = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>("[data-date]")?.dataset.date;
          if (date) set(date, dragAdds.current);
        }}
      >
        {grid.map((date) => {
          const on = selected.has(date);
          const otherMonth = !date.startsWith(thisMonth);
          return (
            <button
              key={date}
              type="button"
              data-date={date}
              tabIndex={date === tabDate ? 0 : -1}
              aria-pressed={on}
              aria-label={`${longDate(date)}${busy.has(date) ? ", has another pencil" : ""}`}
              onFocus={() => setFocusDate(date)}
              onPointerDown={(e) => {
                e.preventDefault();
                dragAdds.current = !on;
                set(date, !on);
                setFocusDate(date);
              }}
              onClick={(e) => {
                // Pointer presses were handled on pointerdown
                if (e.detail === 0) set(date, !on);
              }}
              onKeyDown={(e) => {
                if (e.altKey || e.ctrlKey || e.metaKey) return;
                const target = calendarKeyTarget(date, e.key);
                if (!target) return;
                e.preventDefault();
                pendingFocus.current = target;
                setFocusDate(target);
                if (e.key === "PageUp" || e.key === "PageDown" || !grid.includes(target)) {
                  setCursor({
                    year: Number(target.slice(0, 4)),
                    month: Number(target.slice(5, 7)) - 1,
                  });
                }
              }}
              className={cn(
                "relative flex h-9 items-center justify-center rounded-md font-mono text-xs font-semibold tabular-nums transition-colors",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                on ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                otherMonth && !on && "text-muted-foreground/60",
              )}
            >
              {dayOfMonth(date)}
              {busy.has(date) && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-1 size-1 rounded-full",
                    on ? "bg-primary-foreground" : "bg-warning",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
