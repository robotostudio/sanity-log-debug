"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
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
  fileKey?: string;
}

export function DashboardProvider({
  children,
  fileKey,
}: DashboardProviderProps) {
  const { queryString } = useFilters();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use prop if provided, otherwise fall back to URL param
  const selectedFile = fileKey ?? searchParams.get("file");
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

  // Handle toast notifications in useEffect to ensure they only fire once per committed render
  // This prevents duplicate toasts from React's concurrent rendering or Strict Mode
  useEffect(() => {
    if (status === prevStatusRef.current) return;

    // Dismiss any existing loading toast first
    if (loadingToastRef.current && status !== "loading") {
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
      } else {
        // Dismiss without replacement (e.g., status became "empty")
        toast.dismiss(loadingToastRef.current);
      }
      loadingToastRef.current = null;
    }

    // Show new loading toast if entering loading state
    if (status === "loading") {
      loadingToastRef.current = toast.loading("Loading dashboard data...");
    }

    prevStatusRef.current = status;
  }, [status, data, error]);

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
