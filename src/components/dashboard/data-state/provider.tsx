"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
  const searchParams = useSearchParams();
  const fileFromUrl = searchParams.get("file");
  const [selectedFile, setSelectedFile] = useState<string | null>(fileFromUrl);
  const loadingToastRef = useRef<string | number | null>(null);

  // Sync with URL param when it changes
  useEffect(() => {
    if (fileFromUrl !== selectedFile) {
      setSelectedFile(fileFromUrl);
    }
  }, [fileFromUrl]);

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

  // Toast notifications for state changes
  useEffect(() => {
    if (status === "loading") {
      loadingToastRef.current = toast.loading("Loading dashboard data...");
    } else if (loadingToastRef.current) {
      if (status === "success" && data) {
        toast.success("Dashboard loaded", {
          id: loadingToastRef.current,
          description: `${data.kpis.totalRequests.toLocaleString()} requests loaded`,
        });
      } else if (status === "error") {
        toast.error("Failed to load data", {
          id: loadingToastRef.current,
          description: error?.message ?? "An error occurred",
        });
      }
      loadingToastRef.current = null;
    }
  }, [status, data, error]);

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
