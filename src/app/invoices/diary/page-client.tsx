"use client";
import { useState } from "react";

import { Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { PencilDialog } from "@/components/diary/PencilDialog";
import { EmptyState } from "@/components/EmptyState";
import { InvoicesViewSwitch } from "@/components/InvoicesViewSwitch";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Hold, useHolds, useReleaseHold } from "@/hooks/use-holds";
import { monthGrid } from "@/lib/day-editor";
import { dayOfMonth } from "@/lib/day-strip";
import { clashesOf, holdRangeLabel, isPencilled, promotedByRelease } from "@/lib/holds";
import { cn } from "@/lib/utils";

const monthName = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const rankLabel = (hold: Hold) => (hold.rank === 1 ? "1st" : "2nd");

/** Solid for confirmed, dashed for pencilled, amber when it clashes */
const chipClass = (hold: Hold, clashes: boolean) =>
  !isPencilled(hold)
    ? "bg-primary text-primary-foreground"
    : clashes
      ? "border-warning text-warning bg-warning/10 border border-dashed"
      : "border-primary text-primary bg-primary/8 border border-dashed";

/**
 * Pencils and the jobs they became, by month. The calendar shows the shape;
 * the list below it is where everything is done, so the grid itself has
 * nothing to tab through.
 */
export default function DiaryPage() {
  const { data: holds = [], isLoading } = useHolds();
  const release = useReleaseHold();
  const [picked, setPicked] = useState<{ year: number; month: number } | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; editing?: Hold }>({ open: false });
  const [releasing, setReleasing] = useState<Hold | null>(null);

  const todayStr = today();
  const clashes = clashesOf(holds);

  // Everything that hasn't finished yet, across all months: clashes first,
  // then by the first date. This is the page's answer to "what's coming up".
  const upcoming = holds
    .filter((h) => (h.dates.at(-1) ?? "") >= todayStr)
    .sort(
      (a, b) =>
        Number(clashes.has(b.id)) - Number(clashes.has(a.id)) ||
        (a.dates[0] ?? "").localeCompare(b.dates[0] ?? ""),
    );

  // Open on the month of the next date held, never on an empty grid; once
  // you've paged, stay where you put it.
  const nextDate =
    holds
      .flatMap((h) => h.dates)
      .filter((d) => d >= todayStr)
      .sort()[0] ?? todayStr;
  const cursor = picked ?? { year: Number(nextDate.slice(0, 4)), month: Number(nextDate.slice(5, 7)) - 1 };

  const thisMonth = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const grid = monthGrid(cursor.year, cursor.month);
  // Jobs already over that fall in the month on screen. The rest are above.
  const earlier = holds.filter(
    (h) => (h.dates.at(-1) ?? "") < todayStr && h.dates.some((d) => grid.includes(d)),
  );
  const step = (delta: number) => {
    const m = cursor.month + delta;
    setPicked({ year: cursor.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 });
  };

  const releasingMoves = releasing
    ? holds.filter((h) => promotedByRelease(holds, releasing).includes(h.id))
    : [];

  const renderRow = (hold: Hold) => {
    const clashWith = clashes.get(hold.id);
    return (
      <div key={hold.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{hold.showName}</p>
          <p className="text-muted-foreground text-xs">
            {hold.client.name} · {holdRangeLabel(hold.dates)} · {hold.dates.length} day
            {hold.dates.length === 1 ? "" : "s"}
          </p>
          {clashWith && (
            <p className="text-warning mt-0.5 text-xs font-medium">
              Clashes with {clashWith.map((h) => `${h.showName}${isPencilled(h) ? "" : " (confirmed)"}`).join(" and ")}
            </p>
          )}
        </div>
        {isPencilled(hold) ? (
          <>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                clashWith ? "bg-warning/12 text-warning" : "bg-muted text-muted-foreground",
              )}
            >
              {rankLabel(hold)} pencil
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, editing: hold })}>
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReleasing(hold)}>
                Release
              </Button>
              {/* Opens the editor with the dates painted; saving it confirms the job */}
              <Button size="sm" nativeButton={false} render={<Link href={`/invoices/new?hold=${hold.id}`}>Confirm</Link>} />
            </div>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/invoices/${hold.invoice?.id}`} transitionTypes={["forward"]}>
                Open {hold.invoice?.invoiceNumber}
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Link>
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-6 py-10 md:pb-8">
      <PageHeader
        title="Diary"
        subtitle="Pencilled jobs and the ones they became. Pencils never count towards your totals."
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <HugeiconsIcon icon={Add01Icon} />
            New pencil
          </Button>
        }
      />
      <InvoicesViewSwitch current="diary" />

      <section aria-label="Coming up" className="grid gap-3">
        <h2 className="text-sm font-semibold">Coming up</h2>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : upcoming.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Calendar03Icon}
                title="Nothing coming up"
                description="Pencil a job when you're asked to hold dates, and confirm it into an invoice once it's yours."
                action={
                  <Button variant="outline" onClick={() => setDialog({ open: true })}>
                    <HugeiconsIcon icon={Add01Icon} />
                    New pencil
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-border divide-y px-3 md:px-6">{upcoming.map(renderRow)}</CardContent>
          </Card>
        )}
      </section>

      <Card>
        <CardContent className="px-3 md:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => step(-1)}>
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
              <h2 className="min-w-[8.5rem] text-center text-sm font-semibold" aria-live="polite">
                {monthName(cursor.year, cursor.month)}
              </h2>
              <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => step(1)}>
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
            <ul className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs font-medium" aria-label="Key">
              <li className="flex items-center gap-1.5">
                <span className="bg-primary h-2.5 w-4 rounded-[3px]" aria-hidden="true" />
                Confirmed
              </li>
              <li className="flex items-center gap-1.5">
                <span className="border-primary bg-primary/8 h-2.5 w-4 rounded-[3px] border border-dashed" aria-hidden="true" />
                Pencilled
              </li>
              <li className="flex items-center gap-1.5">
                <span className="border-warning bg-warning/10 h-2.5 w-4 rounded-[3px] border border-dashed" aria-hidden="true" />
                Clash
              </li>
            </ul>
          </div>

          {/* The shape of the month; the list below says the same in words */}
          <div aria-hidden="true">
            <div className="text-muted-foreground mb-1 grid grid-cols-7 gap-1 text-[11px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d} className="px-1.5 sm:px-2">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((date) => {
                const otherMonth = !date.startsWith(thisMonth);
                const here = holds.filter((h) => h.dates.includes(date));
                return (
                  <div
                    key={date}
                    className={cn(
                      "bg-muted/50 min-h-16 overflow-hidden rounded-lg p-1.5 sm:min-h-20 sm:p-2",
                      otherMonth && "opacity-50",
                      date === today() && "ring-foreground/30 ring-1",
                    )}
                  >
                    <span className="text-muted-foreground font-mono text-xs font-semibold tabular-nums">
                      {dayOfMonth(date)}
                    </span>
                    {here.map((hold) => (
                      <span
                        key={hold.id}
                        className={cn(
                          "mt-1 block truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium sm:text-[11px]",
                          chipClass(hold, clashes.has(hold.id)),
                        )}
                      >
                        {isPencilled(hold) && <span className="hidden xl:inline">{rankLabel(hold)} · </span>}
                        {hold.showName}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {earlier.length > 0 && (
        <section aria-label={`Earlier jobs in ${monthName(cursor.year, cursor.month)}`} className="grid gap-3">
          <h2 className="text-sm font-semibold">Earlier in {monthName(cursor.year, cursor.month).split(" ")[0]}</h2>
          <Card>
            <CardContent className="divide-border divide-y px-3 md:px-6">{earlier.map(renderRow)}</CardContent>
          </Card>
        </section>
      )}

      <PencilDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        editing={dialog.editing}
        holds={holds}
        initialMonth={`${thisMonth}-01`}
      />

      <AlertDialog open={releasing !== null} onOpenChange={(open) => !open && setReleasing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release {releasing?.showName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its dates ({releasing ? holdRangeLabel(releasing.dates) : ""}) are free again.
              {releasingMoves.length > 0 &&
                ` ${releasingMoves.map((h) => h.showName).join(" and ")} ${releasingMoves.length === 1 ? "moves" : "move"} up to 1st pencil.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (releasing) release.mutate(releasing);
                setReleasing(null);
              }}
            >
              Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
