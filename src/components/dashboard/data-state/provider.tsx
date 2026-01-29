"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useFilters } from "@/lib/hooks/use-filters";
import type { Aggregations } from "@/lib/types";
import { DashboardContext } from "./context";
import type { DashboardState, DataStatus } from "./types";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch: ${res.status} ${res.statusText}${errorBody ? ` - ${errorBody}` : ""}`,
    );
  }
  return res.json();
}

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const { queryString } = useFilters();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL is the single source of truth for selected file
  const selectedFile = searchParams.get("file");
  const prevStatusRef = useRef<DataStatus | null>(null);
  const loadingToastRef = useRef<string | number | null>(null);

  const fileParam = selectedFile
    ? `fileKey=${encodeURIComponent(selectedFile)}`
    : "";

  const shouldFetch = selectedFile !== null;

  const aggUrl = shouldFetch
    ? queryString
      ? `/api/logs/aggregations?${queryString}&${fileParam}`
      : `/api/logs/aggregations?${fileParam}`
    : null;

  const { data, isLoading, isValidating, error } = useSWR<Aggregations>(
    aggUrl,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  // Derive status from state
  const status: DataStatus = useMemo(() => {
    if (!selectedFile) return "empty";
    if (error) return "error";
    if (isLoading && !data) return "loading";
    return "success";
  }, [selectedFile, error, isLoading, data]);

  // Handle toast notifications without useEffect - compare with previous status
  if (status !== prevStatusRef.current) {
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
          description: error?.message ?? String(error) ?? "An error occurred",
        });
      }
      loadingToastRef.current = null;
    }
    prevStatusRef.current = status;
  }

  const isFiltering = isValidating && status === "success";

  const state: DashboardState = useMemo(
    () => ({
      status,
      selectedFile,
      data: data ?? null,
      error: error?.message ?? (error ? String(error) : null),
      isFiltering,
    }),
    [status, selectedFile, data, error, isFiltering],
  );

  // Update URL when selecting a file - URL is the source of truth
  const selectFile = useCallback(
    (key: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (key) {
        params.set("file", key);
      } else {
        params.delete("file");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const actions = useMemo(() => ({ selectFile }), [selectFile]);

  const contextValue = useMemo(() => ({ state, actions }), [state, actions]);

  return <DashboardContext value={contextValue}>{children}</DashboardContext>;
}
