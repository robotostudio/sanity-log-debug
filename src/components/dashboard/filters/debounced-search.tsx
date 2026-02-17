"use client";

import { Search } from "lucide-react";
import { useRef, useState } from "react";
import spinners from "unicode-animations";
import { Input } from "@/components/ui/input";
import { UnicodeSpinner } from "@/components/ui/unicode-spinner";

interface DebouncedSearchProps {
  value: string;
  onChange: (value: string) => void;
  isFiltering?: boolean;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Debounced search input that handles internal state and cleanup.
 * Uses key prop pattern externally - parent should pass `key={value}` to reset
 * when URL state changes externally.
 */
export function DebouncedSearch({
  value,
  onChange,
  isFiltering = false,
  placeholder = "Search...",
  debounceMs = 300,
}: DebouncedSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(newValue);
      debounceRef.current = null;
    }, debounceMs);
  };

  return (
    <div className="relative">
      {isFiltering ? (
        <UnicodeSpinner
          animation={spinners.sparkle}
          size="sm"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          label="Searching"
        />
      ) : (
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      )}
      <Input
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 w-72 border-zinc-800 bg-transparent pl-8 text-xs text-zinc-300 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500 dark:bg-transparent"
      />
    </div>
  );
}
