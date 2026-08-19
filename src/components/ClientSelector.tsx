"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowUpDownIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClients } from "@/hooks/use-clients";
import { cn } from "@/lib/utils";

export interface Client {
  id: string;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  attentionTo?: string | null;
  dayRate?: number | null;
  perDiemWork?: number | null;
  perDiemTravel?: number | null;
  /** Tiered overtime terms — see `clientOvertimeRule` */
  overtimeTierHours?: number | string | null;
  overtimeFirstRate?: string | null;
  overtimeAfterRate?: string | null;
}

interface ClientSelectorProps {
  value?: string;
  onSelect: (clientId: string | null) => void;
  onClientData?: (client: Client | null) => void;
  onCreateNew?: () => void;
}

export const ClientSelector = ({
  value,
  onSelect,
  onClientData,
  onCreateNew,
}: ClientSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { data: clients = [] } = useClients();

  const selectedClient = clients.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          // bg-transparent overrides the outline variant's bg-background: this
          // is a form control and must match the inputs beside it, which let
          // the card show through. --background is the cream canvas, not white.
          className="w-full justify-between bg-transparent"
        >
          {value
            ? selectedClient
              ? selectedClient.name
              : "Select client..."
            : "Select client or create new..."}
          <HugeiconsIcon icon={ArrowUpDownIcon} className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandList>
            <CommandEmpty>
              {onCreateNew ? (
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
                    Create New Client
                  </Button>
                </div>
              ) : (
                "No clients found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {onCreateNew && (
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onCreateNew();
                  }}
                  className="cursor-pointer"
                >
                  <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
                  Create New Client
                </CommandItem>
              )}
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onSelect(client.id);
                    onClientData?.(client);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <HugeiconsIcon icon={Tick01Icon} className={cn(
                                            "mr-2 h-4 w-4",
                                            value === client.id ? "opacity-100" : "opacity-0",
                                          )} />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
