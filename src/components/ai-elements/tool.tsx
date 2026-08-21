"use client";

import type { ComponentProps, ReactNode } from "react";
import { isValidElement } from "react";

import { ArrowDown01Icon, CancelCircleIcon, CheckmarkCircle01Icon, CircleIcon, Clock01Icon, Wrench01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { CodeBlock } from "./code-block";

import type { DynamicToolUIPart, ToolUIPart } from "ai";


export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  // Inset tile on the panel rather than a bordered box. Outer 16px with 6px of
  // padding keeps the inner 10px surfaces concentric.
  <Collapsible
    className={cn("group not-prose bg-muted/50 mb-4 w-full rounded-xl", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

// Semantic tokens only — the raw Tailwind palette drifts from the theme and
// does not follow the warm neutral into dark mode.
const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <HugeiconsIcon icon={Clock01Icon} className="text-warning size-4" />,
  "approval-responded": <HugeiconsIcon icon={CheckmarkCircle01Icon} className="text-primary size-4" />,
  "input-available": <HugeiconsIcon icon={Clock01Icon} className="size-4 animate-pulse" />,
  "input-streaming": <HugeiconsIcon icon={CircleIcon} className="size-4" />,
  "output-available": <HugeiconsIcon icon={CheckmarkCircle01Icon} className="text-success size-4" />,
  "output-denied": <HugeiconsIcon icon={CancelCircleIcon} className="text-warning size-4" />,
  "output-error": <HugeiconsIcon icon={CancelCircleIcon} className="text-destructive size-4" />,
};

// ghost, not secondary: secondary is near-black in this theme, and a solid
// dark pill outweighs the tool name it sits beside.
export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge className="text-muted-foreground gap-1.5 rounded-full px-0 text-xs" variant="ghost">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Wrench01Icon} className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-2 p-1.5 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-1.5 overflow-hidden", className)} {...props}>
    <h4 className="px-1.5 pt-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-sm bg-card">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <h4 className="px-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-sm text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-card text-foreground"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
