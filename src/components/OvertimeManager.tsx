/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, TrashIcon } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { parseDate } from "@/lib/utils";

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

const RATE_PRICES = {
  "1.5x": 78.75,
  "2x": 105,
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - React Hook Form type inference issues
  const form = useForm<OvertimeFormValues>({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    resolver: zodResolver(overtimeFormSchema),
    defaultValues: {
      hours: 1,
      rateType: "1.5x",
    },
  });

  const onSubmit = (values: OvertimeFormValues) => {
    const entry: OvertimeEntry = {
      id: Math.random().toString(36).substring(2, 11),
      date: parseDate(values.date.toISOString().slice(0, 10)),
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-black/50">
          <FormField
            control={form.control as any}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col col-span-2">
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
                    min="0.5"
                    step="0.5"
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
                      1.5x (£{RATE_PRICES["1.5x"]}/hr)
                    </SelectItem>
                    <SelectItem value="2x">
                      2x (£{RATE_PRICES["2x"]}/hr)
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
                            <TooltipTrigger>
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

            <div className="text-right font-semibold text-lg pt-2 border-t">
              Overtime Total: £{getTotalCost().toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
