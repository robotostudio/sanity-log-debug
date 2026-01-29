"use client";

import {
  endOfDay,
  format,
  isEqual,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";
import type { DatePreset } from "@/components/dashboard/filters/date-presets";

const studioOptions = ["true", "false", "all"] as const;

const DATE_FORMAT = "yyyy-MM-dd";

function getPresetDateRange(
  preset: DatePreset,
): { from: Date; to: Date } | null {
  if (!preset || preset === "custom") return null;

  const now = new Date();
  const to = endOfDay(now);

  switch (preset) {
    case "24h":
      return { from: subDays(startOfDay(now), 1), to };
    case "7d":
      return { from: subDays(startOfDay(now), 7), to };
    case "30d":
      return { from: subDays(startOfDay(now), 30), to };
    default:
      return null;
  }
}

function detectActivePreset(dateFrom: string, dateTo: string): DatePreset {
  if (!dateFrom && !dateTo) return null;

  const now = new Date();
  const today = format(endOfDay(now), DATE_FORMAT);

  // Check if dateTo is today
  if (dateTo !== today) return "custom";

  const fromDate = parseISO(dateFrom);

  // Check each preset
  const presets: DatePreset[] = ["24h", "7d", "30d"];
  for (const preset of presets) {
    const range = getPresetDateRange(preset);
    if (range && isEqual(startOfDay(fromDate), startOfDay(range.from))) {
      return preset;
    }
  }

  return "custom";
}

export function useFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      dateFrom: parseAsString.withDefault(""),
      dateTo: parseAsString.withDefault(""),
      severity: parseAsArrayOf(parseAsString, ",").withDefault([]),
      method: parseAsArrayOf(parseAsString, ",").withDefault([]),
      status: parseAsArrayOf(parseAsString, ",").withDefault([]),
      endpoint: parseAsArrayOf(parseAsString, ",").withDefault([]),
      domain: parseAsArrayOf(parseAsString, ",").withDefault([]),
      studio: parseAsStringLiteral(studioOptions).withDefault("all"),
      apiVersion: parseAsArrayOf(parseAsString, ",").withDefault([]),
      search: parseAsString.withDefault(""),
      groqId: parseAsString.withDefault(""),
    },
    { shallow: true },
  );

  const clearAll = useCallback(() => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      severity: [],
      method: [],
      status: [],
      endpoint: [],
      domain: [],
      studio: "all",
      apiVersion: [],
      search: "",
      groqId: "",
    });
  }, [setFilters]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.severity.length) count++;
    if (filters.method.length) count++;
    if (filters.status.length) count++;
    if (filters.endpoint.length) count++;
    if (filters.domain.length) count++;
    if (filters.studio !== "all") count++;
    if (filters.apiVersion.length) count++;
    if (filters.search) count++;
    if (filters.groqId) count++;
    return count;
  }, [filters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    if (filters.severity.length)
      params.set("severity", filters.severity.join(","));
    if (filters.method.length) params.set("method", filters.method.join(","));
    if (filters.status.length) params.set("status", filters.status.join(","));
    if (filters.endpoint.length)
      params.set("endpoint", filters.endpoint.join(","));
    if (filters.domain.length) params.set("domain", filters.domain.join(","));
    if (filters.studio !== "all") params.set("studio", filters.studio);
    if (filters.apiVersion.length)
      params.set("apiVersion", filters.apiVersion.join(","));
    if (filters.search) params.set("search", filters.search);
    if (filters.groqId) params.set("groqId", filters.groqId);
    return params.toString();
  }, [filters]);

  const activePreset = useMemo(
    () => detectActivePreset(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo],
  );

  const applyDatePreset = useCallback(
    (preset: DatePreset) => {
      if (!preset || preset === "custom") {
        // Clear date filters when preset is null or custom
        setFilters({ dateFrom: "", dateTo: "" });
        return;
      }

      const range = getPresetDateRange(preset);
      if (range) {
        setFilters({
          dateFrom: format(range.from, DATE_FORMAT),
          dateTo: format(range.to, DATE_FORMAT),
        });
      }
    },
    [setFilters],
  );

  return {
    filters,
    setFilters,
    clearAll,
    activeCount,
    queryString,
    activePreset,
    applyDatePreset,
  };
}
