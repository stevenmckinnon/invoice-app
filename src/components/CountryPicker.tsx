"use client";

import * as React from "react";

import { Check, ChevronsUpDown } from "lucide-react";
import countries from "world-countries";

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
import { cn } from "@/lib/utils";


// Transform countries data
const countryOptions = countries
  .map((country) => ({
    value: country.name.common,
    label: country.name.common,
    flag: country.flag,
    code: country.cca2,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

interface CountryPickerProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountryPicker({
  value,
  onChange,
  disabled,
}: CountryPickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = countryOptions.find(
    (country) => country.value === value,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{selectedCountry.flag}</span>
              {selectedCountry.label}
            </span>
          ) : (
            "Select country..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countryOptions.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.label}
                  onSelect={() => {
                    onChange(country.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 text-lg">{country.flag}</span>
                  {country.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
