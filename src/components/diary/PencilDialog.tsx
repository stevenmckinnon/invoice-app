"use client";

import { useRef, useState } from "react";

import { ClientSelector } from "@/components/ClientSelector";
import { DatePickerGrid } from "@/components/diary/DatePickerGrid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { type Hold, useSaveHold } from "@/hooks/use-holds";
import { radioKeyTarget } from "@/lib/day-keyboard";
import { type HoldRank, holdRangeLabel } from "@/lib/holds";
import { cn } from "@/lib/utils";

const RANKS: ReadonlyArray<{ value: HoldRank; label: string; hint: string }> = [
  { value: 1, label: "1st pencil", hint: "You have first refusal on these dates." },
  { value: 2, label: "2nd pencil", hint: "Next in line: someone else holds a 1st. It moves up if theirs is released." },
];

/**
 * New pencil or edit one: client, job, 1st or 2nd, and the dates. What's
 * missing is said beside the field when you try to save, not before.
 */
export const PencilDialog = ({
  open,
  onOpenChange,
  editing,
  holds,
  initialMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The pencil being changed; omitted for a new one */
  editing?: Hold;
  /** Every hold, so dates another one has can be marked */
  holds: Hold[];
  initialMonth: string;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
      {/* Remounted per open, so a cancelled edit never leaks into the next */}
      {open && (
        <PencilForm
          editing={editing}
          holds={holds}
          initialMonth={editing?.dates[0] ?? initialMonth}
          onDone={() => onOpenChange(false)}
        />
      )}
    </DialogContent>
  </Dialog>
);

const PencilForm = ({
  editing,
  holds,
  initialMonth,
  onDone,
}: {
  editing?: Hold;
  holds: Hold[];
  initialMonth: string;
  onDone: () => void;
}) => {
  const save = useSaveHold();
  const [clientId, setClientId] = useState<string | null>(editing?.client.id ?? null);
  const [showName, setShowName] = useState(editing?.showName ?? "");
  const [rank, setRank] = useState<HoldRank>(editing?.rank ?? 1);
  const [dates, setDates] = useState<string[]>(editing?.dates ?? []);
  const [attempted, setAttempted] = useState(false);
  const rankRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const busy = new Set(
    holds.filter((h) => h.id !== editing?.id).flatMap((h) => h.dates),
  );
  const missing = {
    client: !clientId,
    job: !showName.trim(),
    dates: dates.length === 0,
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missing.client || missing.job || missing.dates) {
      // Focus the first problem, in the order the form reads
      const first = missing.client ? "pencil-client" : missing.job ? "pencil-job" : null;
      if (first) document.getElementById(first)?.querySelector<HTMLElement>("button, input")?.focus();
      else document.querySelector<HTMLElement>('[aria-label="Dates"] [tabindex="0"]')?.focus();
      return;
    }
    save.mutate(
      { id: editing?.id, clientId: clientId!, showName: showName.trim(), dates, rank },
      { onSuccess: onDone },
    );
  };

  const current = RANKS.findIndex((r) => r.value === rank);

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>{editing ? `Edit ${editing.showName}` : "New pencil"}</DialogTitle>
        <DialogDescription>
          Hold dates for a job before it&apos;s confirmed. Pencils never count
          towards your totals.
        </DialogDescription>
      </DialogHeader>

      <div id="pencil-client">
        <p className="mb-1.5 text-xs font-medium">Client</p>
        <ClientSelector value={clientId ?? undefined} onSelect={setClientId} />
        {attempted && missing.client && (
          <p className="text-destructive mt-1.5 text-xs">Pick a client.</p>
        )}
      </div>

      <div id="pencil-job">
        <label htmlFor="pencil-job-name" className="mb-1.5 block text-xs font-medium">
          Job
        </label>
        <Input
          id="pencil-job-name"
          value={showName}
          placeholder="Triplemania 35"
          aria-invalid={attempted && missing.job ? true : undefined}
          aria-describedby={attempted && missing.job ? "pencil-job-error" : undefined}
          onChange={(e) => setShowName(e.target.value)}
        />
        {attempted && missing.job && (
          <p id="pencil-job-error" className="text-destructive mt-1.5 text-xs">
            Name the job.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium" id="pencil-rank-label">
          Pencil
        </p>
        {/* A radio group is one Tab stop; the arrows choose within it */}
        <div
          role="radiogroup"
          aria-labelledby="pencil-rank-label"
          className="bg-muted flex w-fit rounded-full p-0.5 text-xs font-medium"
          onKeyDown={(e) => {
            const next = radioKeyTarget(RANKS.length, current, e.key);
            if (next === null) return;
            e.preventDefault();
            setRank(RANKS[next]!.value);
            rankRefs.current[next]?.focus();
          }}
        >
          {RANKS.map((option, index) => (
            <button
              key={option.value}
              ref={(el) => {
                rankRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={rank === option.value}
              tabIndex={rank === option.value ? 0 : -1}
              onClick={() => setRank(option.value)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                rank === option.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{RANKS[current]?.hint}</p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium">Dates</p>
        <DatePickerGrid
          value={dates}
          onChange={setDates}
          busy={busy}
          initialMonth={initialMonth}
          invalid={attempted && missing.dates}
          describedBy="pencil-dates-summary"
        />
        <p
          id="pencil-dates-summary"
          className={cn(
            "mt-2 text-xs",
            attempted && missing.dates ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {dates.length > 0
            ? `${dates.length} date${dates.length === 1 ? "" : "s"}: ${holdRangeLabel(dates)}`
            : attempted
              ? "Pick at least one date."
              : "Tap dates, or drag across a run. A dot means another pencil has that date."}
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          {editing ? "Save pencil" : "Pencil in"}
        </Button>
      </DialogFooter>
    </form>
  );
};
