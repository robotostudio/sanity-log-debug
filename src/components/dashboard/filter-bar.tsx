"use client";

import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateForUrl, parseDateStringToDate } from "@/lib/date-utils";
import { useFilters } from "@/lib/hooks/use-filters";
import { cn } from "@/lib/utils";
import { useDashboard } from "./data-state";
import { DatePresets } from "./filters/date-presets";
import { FilterChip, FilterChipsContainer } from "./filters/filter-chip";

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

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  searchable?: boolean;
}

function MultiSelectFilter({
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
          <ChevronDown className={cn("ml-0.5 h-3 w-3", isActive ? "text-zinc-400" : "text-zinc-600")} />
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

export function FilterBar() {
  const { state } = useDashboard();
  const {
    filters,
    setFilters,
    clearAll,
    activeCount,
    activePreset,
    applyDatePreset,
  } = useFilters();
  const [searchInput, setSearchInput] = useState(filters.search);
  const isFiltering = state.isFiltering;
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

  const dateRange: DateRange | undefined =
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom
            ? parseDateStringToDate(filters.dateFrom)
            : undefined,
          to: filters.dateTo
            ? parseDateStringToDate(filters.dateTo)
            : undefined,
        }
      : undefined;

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setFilters({
      dateFrom: range?.from ? formatDateForUrl(range.from) : "",
      dateTo: range?.to ? formatDateForUrl(range.to) : "",
    });
  };

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
      : format(dateRange.from, "MMM d")
    : "Custom";

  // Build list of active filter chips
  const hasActiveFilters = activeCount > 0;

  return (
    <div className="space-y-3">
      {/* Row 1: Time scope — prominent top-level control */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-zinc-500">Time range</span>
        <DatePresets
          activePreset={activePreset}
          onPresetSelect={applyDatePreset}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 border border-zinc-800 bg-transparent px-3 text-xs",
                "hover:bg-transparent hover:border-zinc-700 hover:text-zinc-100",
                "focus-visible:ring-zinc-400 focus-visible:ring-offset-zinc-950",
                activePreset === "custom"
                  ? "border-zinc-600 bg-zinc-800/60 text-zinc-100"
                  : "text-zinc-400",
              )}
            >
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              {activePreset === "custom" ? dateLabel : "Custom"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto border-zinc-700 bg-zinc-900 p-0"
            align="start"
          >
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              defaultMonth={new Date(2026, 0)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2: Search + Multi-select filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          {isFiltering ? (
            <Loader2 className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 animate-spin" />
          ) : (
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          )}
          <Input
            placeholder="Search by URL or trace ID..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 w-[280px] pl-8 border-zinc-800 bg-transparent dark:bg-transparent text-xs text-zinc-300 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500"
          />
        </div>
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
          searchable
        />

        <MultiSelectFilter
          label="Endpoint"
          options={ENDPOINT_OPTIONS}
          selected={filters.endpoint}
          onChange={(val) => setFilters({ endpoint: val })}
          searchable
        />

        <MultiSelectFilter
          label="Domain"
          options={DOMAIN_OPTIONS}
          selected={filters.domain}
          onChange={(val) => setFilters({ domain: val })}
        />

        <MultiSelectFilter
          label="Severity"
          options={SEVERITY_OPTIONS}
          selected={filters.severity}
          onChange={(val) => setFilters({ severity: val })}
        />

        {/* Studio origin toggle */}
        <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-zinc-800">
          <span className="text-xs text-zinc-500 mr-1.5">Origin:</span>
          <div className="flex items-center rounded-[8px] border border-zinc-800 p-0.5">
            {(["all", "true", "false"] as const).map((opt) => (
              <button
                type="button"
                key={opt}
                className={cn(
                  "h-6 px-2.5 rounded-[6px] text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950",
                  filters.studio === opt
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
                onClick={() => setFilters({ studio: opt })}
              >
                {opt === "all" ? "All" : opt === "true" ? "Studio" : "External"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Active filter chips */}
      {hasActiveFilters && (
        <FilterChipsContainer
          showClearAll={activeCount > 1}
          onClearAll={clearAll}
        >
          {/* Date chip */}
          {(filters.dateFrom || filters.dateTo) && (
            <FilterChip
              label={
                activePreset && activePreset !== "custom"
                  ? activePreset
                  : dateLabel
              }
              onRemove={() => setFilters({ dateFrom: "", dateTo: "" })}
            />
          )}

          {/* Search chip */}
          {filters.search && (
            <FilterChip
              label="Search"
              value={
                filters.search.length > 20
                  ? `${filters.search.slice(0, 20)}...`
                  : filters.search
              }
              onRemove={() => {
                setSearchInput("");
                setFilters({ search: "" });
              }}
            />
          )}

          {/* Method chips */}
          {filters.method.length > 0 && (
            <FilterChip
              label="Method"
              value={filters.method.join(", ")}
              onRemove={() => setFilters({ method: [] })}
            />
          )}

          {/* Status chips */}
          {filters.status.length > 0 && (
            <FilterChip
              label="Status"
              value={
                filters.status.length > 3
                  ? `${filters.status.slice(0, 3).join(", ")}...`
                  : filters.status.join(", ")
              }
              onRemove={() => setFilters({ status: [] })}
            />
          )}

          {/* Endpoint chips */}
          {filters.endpoint.length > 0 && (
            <FilterChip
              label="Endpoint"
              value={
                filters.endpoint.length > 2
                  ? `${filters.endpoint.slice(0, 2).join(", ")}...`
                  : filters.endpoint.join(", ")
              }
              onRemove={() => setFilters({ endpoint: [] })}
            />
          )}

          {/* Domain chips */}
          {filters.domain.length > 0 && (
            <FilterChip
              label="Domain"
              value={filters.domain.join(", ")}
              onRemove={() => setFilters({ domain: [] })}
            />
          )}

          {/* Severity chips */}
          {filters.severity.length > 0 && (
            <FilterChip
              label="Severity"
              value={filters.severity.join(", ")}
              onRemove={() => setFilters({ severity: [] })}
            />
          )}

          {/* Origin chip */}
          {filters.studio !== "all" && (
            <FilterChip
              label="Origin"
              value={filters.studio === "true" ? "Studio" : "External"}
              onRemove={() => setFilters({ studio: "all" })}
            />
          )}
        </FilterChipsContainer>
      )}
    </div>
  );
}
