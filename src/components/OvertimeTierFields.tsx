"use client";

import { type Control, type FieldValues, type Path } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OVERTIME_RATE_TYPES } from "@/lib/overtime";

/**
 * The three fields behind a client's tiered overtime rule, shared by the create
 * dialog and the edit page so the two can't describe the same rule differently.
 *
 * The forms that host this hold the fields under these exact names; the generic
 * only exists so each can keep its own form value type.
 */
export const OvertimeTierFields = <T extends FieldValues>({
  control,
}: {
  control: Control<T>;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormField
        control={control}
        name={"overtimeTierHours" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Overtime tier (hours/day)</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="e.g. 2"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"overtimeFirstRate" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Those hours at</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "1.5x"}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OVERTIME_RATE_TYPES.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"overtimeAfterRate" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>After that</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || "2x"}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {OVERTIME_RATE_TYPES.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <p className="text-muted-foreground text-sm">
      The tier resets each day. Leave the hours blank to bill all overtime at
      one rate.
    </p>
  </div>
);
