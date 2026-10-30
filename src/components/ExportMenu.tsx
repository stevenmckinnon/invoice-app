"use client";

import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFy, getFyStart } from "@/lib/tax-year";

/**
 * Downloads a tax year's invoices as a CSV for an accountant. The years are
 * the ones with invoices in them, plus the current one, as on the dashboard.
 */
export const ExportMenu = ({
  invoiceDates,
}: {
  invoiceDates: Array<Date | string>;
}) => {
  const years = Array.from(
    new Set([
      getFyStart(new Date()),
      ...invoiceDates.map((date) => getFyStart(new Date(date))),
    ]),
  ).sort((a, b) => b - a);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <HugeiconsIcon icon={Download01Icon} />
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Download as CSV</DropdownMenuLabel>
          {years.map((year) => (
            <DropdownMenuItem
              key={year}
              render={
                <a
                  href={`/api/invoices/export?year=${year}`}
                  download
                  className="cursor-pointer"
                />
              }
            >
              Tax year {formatFy(year)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <p className="text-muted-foreground px-2 py-1.5 text-xs">
          Sent, paid and overdue invoices dated 6 April to 5 April. Drafts are
          left out.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
