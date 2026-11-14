"use client";

import { Alert01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { EditorEditOutput } from "@/components/ai/editor-bridge";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Spinner } from "@/components/ui/spinner";
import { EDIT_OPEN_INVOICE_TOOL } from "@/lib/editor-edits";
import { cn } from "@/lib/utils";

import type { ToolUIPart } from "ai";

export const isEditorEditPart = (part: ToolUIPart) =>
  part.type === `tool-${EDIT_OPEN_INVOICE_TOOL}`;

/**
 * One line for the assistant changing the editor on screen: what it did, the
 * new total, and anything it was refused. The editor itself shows the change,
 * so this stays small.
 */
export const EditorEditCard = ({
  part,
  className,
}: {
  part: ToolUIPart;
  className?: string;
}) => {
  const output =
    part.state === "output-available"
      ? (part.output as Partial<EditorEditOutput> | undefined)
      : undefined;
  const failed = part.state === "output-error";
  const working = !output && !failed;
  const applied = output?.applied ?? [];
  const rejected = output?.rejected ?? [];

  const heading = working
    ? "Updating the invoice…"
    : failed
      ? "Couldn't update the invoice"
      : applied.length
        ? applied.join(" · ")
        : "Nothing changed";

  return (
    <div
      className={cn("rounded-2xl px-3 py-2.5 text-sm", className)}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center">
          {working ? (
            <Spinner
              aria-hidden
              role={undefined}
              aria-label={undefined}
              className="text-primary size-4"
            />
          ) : failed || (rejected.length && !applied.length) ? (
            <HugeiconsIcon
              icon={Alert01Icon}
              className="text-destructive size-4"
            />
          ) : (
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={2}
              className="text-success size-4"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 font-medium">
          {working ? <Shimmer as="span">{heading}</Shimmer> : heading}
        </span>
        {output?.total && (
          <span className="font-semibold tabular-nums">{output.total}</span>
        )}
      </div>
      {(failed || rejected.length > 0) && (
        <ul className="text-destructive mt-1 space-y-0.5 pl-7 text-xs">
          {failed && <li>{part.errorText}</li>}
          {rejected.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {output && (
        <p className="text-muted-foreground mt-1 pl-7 text-xs">
          In the editor, not saved yet
        </p>
      )}
    </div>
  );
};
