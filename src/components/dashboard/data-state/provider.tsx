"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { apiFetcher } from "@/lib/api-client";
import { useFilters } from "@/lib/hooks/use-filters";
import { logKeys } from "@/lib/query-keys";
import type { Aggregations } from "@/lib/types";
import { DashboardContext } from "./context";
import type { DashboardState, DataStatus } from "./types";

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

  const { data, isPending, isFetching, error } = useQuery({
    queryKey: logKeys.aggregation(selectedFile ?? "", queryString),
    queryFn: () => apiFetcher<Aggregations>(aggUrl as string),
    enabled: shouldFetch && aggUrl !== null,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const status: DataStatus = useMemo(() => {
    if (!selectedFile) return "empty";
    if (error) return "error";
    if (isPending && !data) return "loading";
    return "success";
  }, [selectedFile, error, isPending, data]);

  useEffect(() => {
    if (status === prevStatusRef.current) return;

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
        toast.dismiss(loadingToastRef.current);
      }
      loadingToastRef.current = null;
    }

    if (status === "loading") {
      loadingToastRef.current = toast.loading("Loading dashboard data...");
    }

    prevStatusRef.current = status;
  }, [status, data, error]);

  const isFiltering = isFetching && status === "success";

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
