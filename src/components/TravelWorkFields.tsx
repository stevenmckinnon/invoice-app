"use client";

import { type Control, type FieldValues, type Path } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TRAVEL_WORK_BILL = {
  both: "A work day and a travel day",
  work: "A work day only",
  travel: "A travel day only",
} as const;

export const TRAVEL_WORK_PER_DIEM = {
  travel: "Travel per diem",
  work: "Work per diem",
} as const;

/**
 * How a client bills a day that had both work and travel: flew in and
 * worked, or wrapped and flew home. Shared by the create dialog and the edit
 * page, like `OvertimeTierFields`; the hosting forms hold the fields under
 * these exact names.
 */
export const TravelWorkFields = <T extends FieldValues>({
  control,
}: {
  control: Control<T>;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={"travelWorkBill" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>A day with work and travel bills as</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "both"}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: keyof typeof TRAVEL_WORK_BILL) =>
                      TRAVEL_WORK_BILL[value]
                    }
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(TRAVEL_WORK_BILL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"travelWorkPerDiem" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>With a</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || "travel"}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: keyof typeof TRAVEL_WORK_PER_DIEM) =>
                      TRAVEL_WORK_PER_DIEM[value]
                    }
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.entries(TRAVEL_WORK_PER_DIEM).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
    </div>

    <p className="text-muted-foreground text-sm">
      For days you flew in and worked, or wrapped and flew home.
    </p>
  </div>
);
