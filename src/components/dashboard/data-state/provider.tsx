"use client";

import { type ReactNode, useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useFilters } from "@/lib/hooks/use-filters";
import type { Aggregations } from "@/lib/types";
import { DashboardContext } from "./context";
import type { DashboardState, DataStatus } from "./types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const { queryString } = useFilters();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const fileParam = selectedFile
    ? `fileKey=${encodeURIComponent(selectedFile)}`
    : "";

  // Only fetch when a file is selected
  const shouldFetch = selectedFile !== null;

  const aggUrl = shouldFetch
    ? queryString
      ? `/api/logs/aggregations?${queryString}&${fileParam}`
      : `/api/logs/aggregations?${fileParam}`
    : null;

  const { data, isLoading, error } = useSWR<Aggregations>(aggUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  // Derive status from state
  const status: DataStatus = useMemo(() => {
    if (!selectedFile) return "empty";
    if (error) return "error";
    if (isLoading && !data) return "loading";
    return "success";
  }, [selectedFile, error, isLoading, data]);

  const state: DashboardState = useMemo(
    () => ({
      status,
      selectedFile,
      data: data ?? null,
      error: error?.message ?? null,
    }),
    [status, selectedFile, data, error],
  );

  const selectFile = useCallback((key: string | null) => {
    setSelectedFile(key);
  }, []);

  const actions = useMemo(() => ({ selectFile }), [selectFile]);

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return <DashboardContext value={contextValue}>{children}</DashboardContext>;
}
