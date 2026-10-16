"use client";

import { useState } from "react";

import {
  Alert01Icon,
  ArrowDown01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDate } from "@/lib/utils";

import type { ToolUIPart } from "ai";

export const INVOICE_TOOL_TYPES = [
  "tool-createInvoiceDraft",
  "tool-updateInvoiceDraft",
] as const;

type InvoiceToolType = (typeof INVOICE_TOOL_TYPES)[number];

export const isInvoiceToolPart = (
  part: ToolUIPart,
): part is ToolUIPart & { type: InvoiceToolType } =>
  (INVOICE_TOOL_TYPES as readonly string[]).includes(part.type);

type StepStatus = "pending" | "active" | "done" | "error";

interface Step {
  label: string;
  detail?: string;
  status: StepStatus;
}

// While the input streams in, every field may still be missing
interface ToolInputShape {
  invoiceId?: string;
  showName?: string;
  invoiceDate?: string;
  clientName?: string;
  days?: { type?: string; alsoTravel?: string; overtimeHours?: number }[];
  expenses?: unknown[];
}

interface ToolOutputShape {
  success?: boolean;
  error?: string;
  invoiceNumber?: string;
  total?: string;
}

const DAY_NOUNS: Record<string, [string, string]> = {
  work: ["work day", "work days"],
  travel: ["travel day", "travel days"],
  dark: ["dark day", "dark days"],
};

const plural = (n: number, [one, many]: [string, string]) =>
  `${n} ${n === 1 ? one : many}`;

/** "4 travel days, 2 work days, 2h overtime, 1 expense" — from whatever has arrived */
const summariseCharges = (input: ToolInputShape): string | undefined => {
  const days = input.days ?? [];
  const parts = ["travel", "work", "dark"]
    .map((type) => {
      const n = days.filter((d) => d.type === type).length;
      return n ? plural(n, DAY_NOUNS[type]) : null;
    })
    .filter((part): part is string => Boolean(part));

  const overtimeHours = days.reduce(
    (sum, d) => sum + (d.overtimeHours ?? 0),
    0,
  );
  if (overtimeHours > 0) parts.push(`${overtimeHours}h overtime`);

  const expenses = input.expenses?.length ?? 0;
  if (expenses > 0) parts.push(plural(expenses, ["expense", "expenses"]));

  return parts.length > 0 ? parts.join(", ") : undefined;
};

const formatIsoDate = (value?: string) => {
  // A date still streaming in ("2026-1") is not worth formatting yet
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return formatDate(value);
};

/**
 * The steps follow the tool call's real lifecycle rather than a scripted
 * sequence: the details step finishes once they have streamed in, the line
 * items once the input is complete, and the save once the server answers.
 * Nothing here advances on a timer.
 */
const buildSteps = (part: ToolUIPart & { type: InvoiceToolType }): Step[] => {
  const input = (part.input ?? {}) as ToolInputShape;
  const output = (
    part.state === "output-available" ? part.output : undefined
  ) as ToolOutputShape | undefined;
  const isCreate = part.type === "tool-createInvoiceDraft";

  const inputComplete = part.state !== "input-streaming";
  const failed =
    part.state === "output-error" ||
    part.state === "output-denied" ||
    Boolean(output?.error);
  const saved = Boolean(output?.success);

  const detailsReady = isCreate
    ? Boolean(input.showName && formatIsoDate(input.invoiceDate))
    : Boolean(input.invoiceId);
  const detailsDone = inputComplete || detailsReady;

  const charges = summariseCharges(input);

  const changedFields = [
    input.showName && "project name",
    input.invoiceDate && "date",
    input.clientName && "client",
  ].filter(Boolean) as string[];

  return [
    {
      label: isCreate ? "Read the job details" : "Find the draft",
      detail: isCreate
        ? [input.showName, formatIsoDate(input.invoiceDate), input.clientName]
            .filter(Boolean)
            .join(" · ") || undefined
        : undefined,
      status: detailsDone ? "done" : "active",
    },
    {
      label: isCreate ? "Lay out the days" : "Work out the changes",
      detail: isCreate
        ? charges
        : [...changedFields, charges].filter(Boolean).join(", ") || undefined,
      status: inputComplete ? "done" : detailsDone ? "active" : "pending",
    },
    {
      label: isCreate ? "Save the draft" : "Save the changes",
      detail: failed ? "Not saved" : undefined,
      status: failed
        ? "error"
        : saved
          ? "done"
          : inputComplete
            ? "active"
            : "pending",
    },
  ];
};

const STEP_STATUS_TEXT: Record<StepStatus, string> = {
  pending: "Not started",
  active: "In progress",
  done: "Done",
  error: "Failed",
};

const StepIcon = ({ status }: { status: StepStatus }) => (
  <span className="flex size-5 shrink-0 items-center justify-center">
    {status === "done" && (
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2}
        className="text-success size-4"
      />
    )}
    {status === "active" && (
      <Spinner
        aria-hidden
        role={undefined}
        aria-label={undefined}
        className="text-primary size-4"
      />
    )}
    {status === "pending" && (
      <span className="border-muted-foreground/40 size-3.5 rounded-full border border-dashed" />
    )}
    {status === "error" && (
      <HugeiconsIcon icon={Alert01Icon} className="text-destructive size-4" />
    )}
  </span>
);

/**
 * Progress for the invoice tools, in place of the generic tool block and its
 * raw JSON. Open while the call runs; collapses to its summary line once it
 * settles, so a long conversation isn't a stack of finished checklists.
 */
export const InvoiceToolProgress = ({
  part,
  live,
  className,
}: {
  part: ToolUIPart & { type: InvoiceToolType };
  /**
   * Whether this call can still advance. History is saved mid-stream, so a
   * refresh or a stop can leave a call parked in a running state for good —
   * without this it would spin forever.
   */
  live: boolean;
  className?: string;
}) => {
  const isCreate = part.type === "tool-createInvoiceDraft";
  const output = (
    part.state === "output-available" ? part.output : undefined
  ) as ToolOutputShape | undefined;

  const built = buildSteps(part);
  const failed = built.some((s) => s.status === "error");
  const saved = Boolean(output?.success);
  const stopped = !live && !failed && !saved;
  const settled = failed || saved || stopped;

  const steps = stopped
    ? built.map((s) =>
        s.status === "active" ? { ...s, status: "pending" as const } : s,
      )
    : built;

  // Follows the call (open while running, closed once settled) until the
  // user toggles it, after which their choice sticks
  const [userOpen, setUserOpen] = useState<boolean>();
  const open = userOpen ?? !settled;

  const remaining = steps.filter((s) => s.status !== "done").length;

  const heading = stopped
    ? "Stopped before saving"
    : failed
      ? "Draft not saved"
      : saved
        ? !isCreate
          ? "Draft updated"
          : output?.invoiceNumber
            ? `Draft ${output.invoiceNumber} created`
            : "Draft created"
        : isCreate
          ? "Creating draft"
          : "Updating draft";

  return (
    <Collapsible
      open={open}
      onOpenChange={setUserOpen}
      className={cn("w-full max-w-sm rounded-2xl", className)}
    >
      <CollapsibleTrigger className="hover:bg-foreground/[0.03] flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors">
        <span className="flex size-5 shrink-0 items-center justify-center">
          {stopped ? (
            <span className="border-muted-foreground size-3.5 rounded-full border-[1.5px]" />
          ) : failed ? (
            <HugeiconsIcon
              icon={Alert01Icon}
              className="text-destructive size-4"
            />
          ) : saved ? (
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={2}
              className="text-success size-4"
            />
          ) : (
            <Spinner
              aria-hidden
              role={undefined}
              aria-label={undefined}
              className="text-primary size-4"
            />
          )}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-medium"
          aria-live="polite"
        >
          {settled ? heading : <Shimmer as="span">{heading}</Shimmer>}
        </span>
        {saved && output?.total ? (
          <span className="font-semibold tabular-nums">{output.total}</span>
        ) : (
          !settled && (
            <span className="text-muted-foreground text-xs tabular-nums">
              {remaining} {remaining === 1 ? "step" : "steps"} left
            </span>
          )
        )}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="space-y-0.5 px-3 pb-3">
          {steps.map((step) => (
            <li
              key={step.label}
              className={cn(
                "flex gap-2 rounded-xl px-0 py-1.5 text-sm transition-colors duration-200",
                step.status === "pending" && "text-muted-foreground",
              )}
            >
              <StepIcon status={step.status} />
              <div className="min-w-0 flex-1">
                <p className={cn(step.status === "active" && "font-medium")}>
                  {step.label}
                  <span className="sr-only">
                    {" "}
                    — {STEP_STATUS_TEXT[step.status]}
                  </span>
                </p>
                {step.detail && (
                  <p
                    className={cn(
                      "text-xs",
                      step.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
};
