"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetcher } from "@/lib/api-client";
import { logKeys } from "@/lib/query-keys";
import type { Aggregations } from "@/lib/types";
import { useFileKeyContext } from "./use-file-key-context";
import { useFilters } from "./use-filters";
import { useSelectedFile } from "./use-selected-file";

export type DataStatus = "empty" | "loading" | "success" | "error";

export interface DashboardData {
  status: DataStatus;
  selectedFile: string | null;
  data: Aggregations | null;
  error: string | null;
  isFiltering: boolean;
}

/**
 * Hook to fetch dashboard aggregation data.
 * TanStack Query handles caching and deduplication automatically.
 *
 * @param fileKey - Optional file key override (for source detail pages)
 */
export function useDashboardData(
  fileKey?: string,
  isActive = true,
): DashboardData {
  const { queryString } = useFilters();
  const { selectedFile: urlFile } = useSelectedFile();
  const contextFileKey = useFileKeyContext();

  // Priority: explicit prop > context > URL param
  const selectedFile = fileKey ?? contextFileKey ?? urlFile;

  const fileParam = selectedFile
    ? `fileKey=${encodeURIComponent(selectedFile)}`
    : "";

  const shouldFetch = selectedFile !== null;

  const aggUrl = shouldFetch
    ? queryString
      ? `/api/logs/aggregations?${queryString}&${fileParam}`
      : `/api/logs/aggregations?${fileParam}`
    : null;

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: logKeys.aggregation(selectedFile ?? "", queryString),
    queryFn: ({ signal }) => apiFetcher<Aggregations>(aggUrl as string, signal),
    enabled: shouldFetch && aggUrl !== null && isActive,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const status: DataStatus = useMemo(() => {
    if (!selectedFile) return "empty";
    if (error) return "error";
    if (isPending && !data) return "loading";
    return "success";
  }, [selectedFile, error, isPending, data]);

  const isFiltering = isFetching && status === "success";

  return {
    status,
    selectedFile,
    data: data ?? null,
    error: error?.message ?? (error ? String(error) : null),
    isFiltering,
  };
}
