"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (val: string[]) => void;
  searchable?: boolean;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const [search, setSearch] = useState("");
  const filteredOptions =
    searchable && search
      ? options.filter((opt) =>
          opt.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  const isActive = selected.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 border border-zinc-800 bg-transparent px-3 text-xs",
            "hover:border-zinc-700 hover:bg-zinc-800/50 hover:text-zinc-100",
            "focus-visible:ring-zinc-400 focus-visible:ring-offset-zinc-950",
            isActive
              ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
              : "text-zinc-400",
          )}
        >
          {label}
          {isActive && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-900">
              {selected.length}
            </span>
          )}
          <ChevronDown
            className={cn(
              "ml-0.5 h-3 w-3",
              isActive ? "text-zinc-400" : "text-zinc-600",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 border-zinc-700 bg-zinc-900 p-2"
        align="start"
      >
        {searchable && (
          <Input
            placeholder={`Search ${label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-7 border-zinc-700 bg-zinc-800 text-xs placeholder:text-zinc-500"
          />
        )}
        <div className="max-h-64 space-y-0.5 overflow-y-auto" role="listbox">
          {filteredOptions.map((opt) => {
            const checked = selected.includes(opt);
            const checkboxId = `filter-${label.toLowerCase()}-${opt}`;
            const toggleOption = () => {
              if (checked) {
                onChange(selected.filter((s) => s !== opt));
              } else {
                onChange([...selected, opt]);
              }
            };
            return (
              <label
                key={opt}
                htmlFor={checkboxId}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[4px] px-2 py-1.5 text-xs",
                  "transition-colors hover:bg-zinc-800",
                  checked ? "bg-zinc-800/60 text-zinc-100" : "text-zinc-400",
                )}
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  onCheckedChange={toggleOption}
                  className="h-3.5 w-3.5 border-zinc-600 data-[state=checked]:bg-zinc-100 data-[state=checked]:border-zinc-100 data-[state=checked]:text-zinc-900"
                />
                <span className="font-mono">{opt}</span>
              </label>
            );
          })}
        </div>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
