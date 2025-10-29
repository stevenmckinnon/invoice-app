"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, TrashIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseDate } from "@/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface OvertimeEntry {
  id: string;
  date: Date;
  hours: number;
  rateType: "1.5x" | "2x";
}

interface OvertimeManagerProps {
  entries: OvertimeEntry[];
  onEntriesChange: (entries: OvertimeEntry[]) => void;
  regularRate: number;
}

const RATE_MULTIPLIERS = {
  "1.5x": 1.5,
  "2x": 2,
};

const overtimeFormSchema = z.object({
  date: z.date({
    message: "Please select a date",
  }),
  hours: z.coerce
    .number()
    .positive("Hours must be positive")
    .min(0.5, "Minimum 0.5 hours"),
  rateType: z.enum(["1.5x", "2x"]),
});

type OvertimeFormValues = z.infer<typeof overtimeFormSchema>;

export const OvertimeManager = ({
  entries,
  onEntriesChange,
  regularRate,
}: OvertimeManagerProps) => {
  // @ts-ignore - React Hook Form type inference issues
  const form = useForm<OvertimeFormValues>({
    // @ts-ignore
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      hours: 1,
      rateType: "1.5x",
    },
  });

  // Calculate overtime rates dynamically based on regularRate
  const ratePrices = {
    "1.5x": regularRate * RATE_MULTIPLIERS["1.5x"],
    "2x": regularRate * RATE_MULTIPLIERS["2x"],
  };

  const onSubmit = (values: OvertimeFormValues) => {
    // Extract date components directly to avoid timezone issues
    const year = values.date.getFullYear();
    const month = String(values.date.getMonth() + 1).padStart(2, "0");
    const day = String(values.date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    const entry: OvertimeEntry = {
      id: crypto.randomUUID(),
      date: parseDate(dateString),
      hours: values.hours,
      rateType: values.rateType,
    };

    const newEntries = [...entries, entry].sort((a, b) => {
      // Sort by date first
      const dateCompare =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;

      // Then sort by rate (1.5x before 2x)
      const rateOrder = { "1.5x": 1, "2x": 2 };
      return rateOrder[a.rateType] - rateOrder[b.rateType];
    });

    onEntriesChange(newEntries);
    form.reset({
      hours: 1,
      rateType: "1.5x",
    });
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter((entry) => entry.id !== id));
  };

  const getTotalCost = () => {
    return entries.reduce((total, entry) => {
      const multiplier = RATE_MULTIPLIERS[entry.rateType];
      const hourlyRate = regularRate * multiplier;
      return total + entry.hours * hourlyRate;
    }, 0);
  };

  return (
    <Card className="w-full max-w-[calc(100dvw-3rem)]">
      <CardHeader>
        <CardTitle>Overtime Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new overtime entry */}
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-5 dark:bg-black/50">
          <FormField
            control={form.control as any}
            name="date"
            render={({ field }) => (
              <FormItem className="col-span-2 flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-1 h-4 w-4" />
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Select date</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="rateType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1.5x">
                      1.5x (£{ratePrices["1.5x"].toFixed(2)}/hr)
                    </SelectItem>
                    <SelectItem value="2x">
                      2x (£{ratePrices["2x"].toFixed(2)}/hr)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-end">
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              onClick={form.handleSubmit(onSubmit as any)}
            >
              Add Overtime
            </Button>
          </div>
        </div>

        {/* Display existing entries */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <Table className="w-full md:min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const hourlyRate =
                      regularRate * RATE_MULTIPLIERS[entry.rateType];
                    const cost = entry.hours * hourlyRate;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell
                          className="text-sm font-medium"
                          suppressHydrationWarning
                        >
                          {format(entry.date, "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {entry.hours}h
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {entry.rateType} (£{hourlyRate.toFixed(2)}/hr)
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          £{cost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEntry(entry.id)}
                                aria-label="Remove overtime entry"
                              >
                                <TrashIcon className="h-4 w-4 text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete entry</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="border-t pt-2 text-right text-lg font-semibold">
              Overtime Total: £{getTotalCost().toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
