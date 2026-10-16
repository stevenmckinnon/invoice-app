"use client";

import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EditableExpense {
  /** Local key for React only; never sent as an id */
  key: string;
  description: string;
  /** Kept from a saved invoice so "2 × £10" isn't flattened on edit */
  quantity: number;
  /** As typed, so "12." survives while you're mid-number */
  unitPrice: string;
}

let nextKey = 0;
export const newExpenseKey = () => `expense-${nextKey++}`;

/** Anything paid for on the job, as a description and an amount */
export const ExpensesEditor = ({
  expenses,
  setExpenses,
  currencySymbol,
}: {
  expenses: EditableExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<EditableExpense[]>>;
  currencySymbol: string;
}) => {
  const update = (key: string, patch: Partial<EditableExpense>) =>
    setExpenses((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    );

  return (
    <section
      className="bg-card rounded-2xl p-4 shadow-sm md:p-6 dark:border"
      aria-labelledby="expenses-heading"
    >
      <h2 id="expenses-heading" className="text-sm font-semibold">
        Expenses
      </h2>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Anything you paid for on the job: taxis, fuel, parking.
      </p>

      {expenses.length > 0 && (
        <ul className="mt-4 space-y-2">
          {expenses.map((expense, i) => (
            <li key={expense.key} className="flex items-center gap-2">
              <Input
                aria-label={`Expense ${i + 1} description`}
                value={expense.description}
                placeholder="Description"
                onChange={(e) =>
                  update(expense.key, { description: e.target.value })
                }
              />
              {expense.quantity > 1 && (
                <span className="text-muted-foreground shrink-0 font-mono text-sm tabular-nums">
                  {expense.quantity} ×
                </span>
              )}
              <div className="relative w-32 shrink-0">
                <span
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
                  aria-hidden="true"
                >
                  {currencySymbol}
                </span>
                <Input
                  aria-label={`Expense ${i + 1} amount`}
                  inputMode="decimal"
                  value={expense.unitPrice}
                  placeholder="0.00"
                  className="pl-7 text-right font-mono tabular-nums"
                  onChange={(e) =>
                    update(expense.key, {
                      // Digits and one decimal point
                      unitPrice: e.target.value
                        .replace(/[^\d.]/g, "")
                        .replace(/(\..*)\./g, "$1"),
                    })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${expense.description || `expense ${i + 1}`}`}
                onClick={() =>
                  setExpenses((prev) =>
                    prev.filter((e) => e.key !== expense.key),
                  )
                }
              >
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() =>
          setExpenses((prev) => [
            ...prev,
            {
              key: newExpenseKey(),
              description: "",
              quantity: 1,
              unitPrice: "",
            },
          ])
        }
      >
        <HugeiconsIcon icon={Add01Icon} />
        Add expense
      </Button>
    </section>
  );
};
