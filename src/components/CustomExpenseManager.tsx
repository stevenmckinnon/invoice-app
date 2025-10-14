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

  const updateEntry = (
    id: string,
    field: keyof CustomExpenseEntry,
    value: string | number
  ) => {
    onEntriesChange(
      entries.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };
          // Auto-calculate cost if quantity or unitPrice changes
          if (field === "quantity" || field === "unitPrice") {
            updated.cost = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return entry;
      })
    );
  };

  const getTotalCost = () => {
    return entries.reduce((total, entry) => total + entry.cost, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Expenses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new custom expense */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50 dark:bg-black/50">
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
            <div className="grid grid-cols-12 gap-2 font-medium text-sm border-b pb-2">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2">Cost</div>
              <div className="col-span-2">Action</div>
            </div>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-12 gap-2 items-center py-2 border-b"
              >
                <div className="col-span-4">
                  <Input
                    value={entry.description}
                    onChange={(e) =>
                      updateEntry(entry.id, "description", e.target.value)
                    }
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={entry.quantity}
                    onChange={(e) =>
                      updateEntry(
                        entry.id,
                        "quantity",
                        parseFloat(e.target.value) || 1
                      )
                    }
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.unitPrice}
                    onChange={(e) =>
                      updateEntry(
                        entry.id,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly
                    value={entry.cost}
                    className="text-sm bg-gray-50"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeEntry(entry.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            <div className="text-right font-semibold text-lg pt-2 border-t">
              Expenses Total: £{getTotalCost().toFixed(2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
