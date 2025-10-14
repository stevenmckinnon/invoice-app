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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrashIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export interface CustomExpenseEntry {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  cost: number;
}

interface CustomExpenseManagerProps {
  entries: CustomExpenseEntry[];
  onEntriesChange: (entries: CustomExpenseEntry[]) => void;
}

const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().nonnegative("Unit price must be non-negative"),
  cost: z.coerce.number().nonnegative("Cost must be non-negative"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const CustomExpenseManager = ({
  entries,
  onEntriesChange,
}: CustomExpenseManagerProps) => {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as any,
    defaultValues: {
      description: "",
      quantity: 1,
      unitPrice: 0,
      cost: 0,
    },
  });

  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  // Auto-calculate cost when quantity or unitPrice changes
  const calculatedCost = quantity * unitPrice;

  const onSubmit = (values: ExpenseFormValues) => {
    const entry: CustomExpenseEntry = {
      id: Math.random().toString(36).substring(2, 11),
      description: values.description.trim(),
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      cost: values.cost || calculatedCost,
    };

    onEntriesChange([...entries, entry]);
    form.reset({
      description: "",
      quantity: 1,
      unitPrice: 0,
      cost: 0,
    });
  };

  const removeEntry = (id: string) => {
    onEntriesChange(entries.filter((entry) => entry.id !== id));
  };

  const getTotalCost = () => {
    return entries.reduce((total, entry) => total + entry.cost, 0);
  };

  return (
    <Card className="w-full max-w-[calc(100dvw-3rem)]">
      <CardHeader>
        <CardTitle>Custom Expenses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new custom expense */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-black/50">
          <FormField
            control={form.control as any}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Uber fare, Train ticket"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Update cost field with calculated value
                      const newQuantity = parseFloat(e.target.value) || 1;
                      form.setValue(
                        "cost",
                        newQuantity * form.getValues("unitPrice")
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // Update cost field with calculated value
                      const newUnitPrice = parseFloat(e.target.value) || 0;
                      form.setValue(
                        "cost",
                        form.getValues("quantity") * newUnitPrice
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="cost"
            render={({ field }) => (
              <FormItem className="hidden">
                <FormLabel>Total Cost</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly
                    placeholder={calculatedCost.toFixed(2)}
                    {...field}
                  />
                </FormControl>
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
              Add Expense
            </Button>
          </div>
        </div>

        {/* Display existing entries */}
        {entries.length > 0 && (
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Description</TableHead>
                    <TableHead className="w-20">Quantity</TableHead>
                    <TableHead className="w-28">Unit Price</TableHead>
                    <TableHead className="w-24">Cost</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="w-40">
                        <div className="text-sm font-medium">
                          {entry.description}
                        </div>
                      </TableCell>
                      <TableCell className="w-20">
                        <div className="text-sm font-medium">
                          {entry.quantity}
                        </div>
                      </TableCell>
                      <TableCell className="w-28">
                        <div className="text-sm font-medium">
                          £{entry.unitPrice.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="w-24">
                        <div className="text-sm font-medium">
                          £{entry.cost.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="w-16">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEntry(entry.id)}
                              aria-label="Remove custom expense entry"
                              className="h-8 w-8 p-0"
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete entry</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="text-right font-semibold text-lg pt-2 border-t">
              Expenses Total: £{getTotalCost().toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
