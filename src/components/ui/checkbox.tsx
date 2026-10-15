"use client"

import * as React from "react"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { MinusSignIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"

/**
 * Base UI marks state with data-checked / data-unchecked / data-indeterminate,
 * not Radix's data-state — styling against data-state silently never applies.
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input dark:bg-input/30 relative flex size-4 shrink-0 items-center justify-center rounded-[5px] border shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none",
        // A 16px box is too small a target, so the hit area extends past it
        "after:absolute after:-inset-2.5 after:content-['']",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "data-[checked]:bg-primary data-[checked]:border-primary data-[checked]:text-primary-foreground",
        "data-[indeterminate]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:text-primary-foreground",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            <HugeiconsIcon
              icon={state.indeterminate ? MinusSignIcon : Tick02Icon}
              strokeWidth={2.5}
              className="size-3"
            />
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
