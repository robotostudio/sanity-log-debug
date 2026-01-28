"use client";

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";

const studioOptions = ["true", "false", "all"] as const;

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

  return { filters, setFilters, clearAll, activeCount, queryString };
}
