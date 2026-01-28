"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFilters } from "@/lib/hooks/use-filters";
import { useState, useEffect, useRef } from "react";

const SEVERITY_OPTIONS = ["INFO", "WARN", "ERROR"];
const METHOD_OPTIONS = ["GET", "POST", "OPTIONS", "HEAD", "PUT"];
const STATUS_OPTIONS = [
  "200",
  "204",
  "304",
  "429",
  "402",
  "101",
  "0",
  "403",
  "400",
  "404",
  "502",
  "504",
];
const ENDPOINT_OPTIONS = [
  "query",
  "images",
  "listen",
  "files",
  "live",
  "projects",
  "socket",
  "doc",
  "help",
  "history",
  "journey",
  "mutate",
  "intake",
  "users",
  "ping",
];
const DOMAIN_OPTIONS = ["api", "cdn", "apicdn"];

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
        >
          {label}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1.5 h-4 rounded-sm px-1 text-[10px] bg-zinc-700"
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 border-zinc-700 bg-zinc-900 p-2"
        align="start"
      >
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, opt]);
                  } else {
                    onChange(selected.filter((s) => s !== opt));
                  }
                }}
                className="h-3.5 w-3.5"
              />
              <span className="font-mono">{opt}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-6 w-full text-xs text-zinc-500"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar() {
  const { filters, setFilters, clearAll, activeCount } = useFilters();
  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({ search: val });
    }, 300);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search URL or traceId..."
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="h-8 w-64 border-zinc-700 bg-zinc-900 text-xs text-zinc-300 placeholder:text-zinc-600"
      />

      <MultiSelectFilter
        label="Severity"
        options={SEVERITY_OPTIONS}
        selected={filters.severity}
        onChange={(val) => setFilters({ severity: val })}
      />

      <MultiSelectFilter
        label="Method"
        options={METHOD_OPTIONS}
        selected={filters.method}
        onChange={(val) => setFilters({ method: val })}
      />

      <MultiSelectFilter
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.status}
        onChange={(val) => setFilters({ status: val })}
      />

      <MultiSelectFilter
        label="Endpoint"
        options={ENDPOINT_OPTIONS}
        selected={filters.endpoint}
        onChange={(val) => setFilters({ endpoint: val })}
      />

      <MultiSelectFilter
        label="Domain"
        options={DOMAIN_OPTIONS}
        selected={filters.domain}
        onChange={(val) => setFilters({ domain: val })}
      />

      <div className="flex items-center gap-1.5">
        <Label className="text-xs text-zinc-500">Studio:</Label>
        <div className="flex gap-0.5">
          {(["all", "true", "false"] as const).map((opt) => (
            <Button
              key={opt}
              variant={filters.studio === opt ? "secondary" : "ghost"}
              size="sm"
              className={`h-7 px-2 text-xs ${
                filters.studio === opt
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setFilters({ studio: opt })}
            >
              {opt === "all" ? "All" : opt === "true" ? "Yes" : "No"}
            </Button>
          ))}
        </div>
      </div>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-zinc-500 hover:text-zinc-300"
          onClick={clearAll}
        >
          Clear all ({activeCount})
        </Button>
      )}
    </div>
  );
}
