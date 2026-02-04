"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { apiFetcher, apiRequest } from "@/lib/api-client";
import { fileKeys } from "@/lib/query-keys";
import type { Source } from "./types";

const POLL_INTERVAL_MS = 2000;
const FILES_API_ENDPOINT = "/api/files";

export function useSources() {
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: fileKeys.list(),
    queryFn: () => apiFetcher<{ files: Source[] }>(FILES_API_ENDPOINT),
  });

  const hasProcessingSources = useMemo(() => {
    return data?.files?.some(
      (f) =>
        f.processingStatus === "pending" || f.processingStatus === "processing",
    );
  }, [data?.files]);

  // Conditional polling when there are processing sources
  useQuery({
    queryKey: [...fileKeys.list(), "polling"],
    queryFn: () => apiFetcher<{ files: Source[] }>(FILES_API_ENDPOINT),
    enabled: hasProcessingSources ?? false,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) =>
      apiRequest(FILES_API_ENDPOINT, {
        method: "DELETE",
        body: JSON.stringify({ key }),
      }),
    onMutate: async (key) => {
      await queryClient.cancelQueries({ queryKey: fileKeys.list() });
      const previous = queryClient.getQueryData<{ files: Source[] }>(
        fileKeys.list(),
      );

      queryClient.setQueryData<{ files: Source[] }>(fileKeys.list(), (old) => ({
        files: old?.files.filter((f) => f.key !== key) ?? [],
      }));

      return { previous };
    },
    onError: (err, _key, context) => {
      queryClient.setQueryData(fileKeys.list(), context?.previous);
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error("Delete failed", { description: message });
    },
    onSuccess: () => {
      toast.success("Source deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.list() });
    },
  });

  const deleteSource = useCallback(
    (key: string) => {
      toast.loading("Deleting source...");
      deleteMutation.mutate(key);
    },
    [deleteMutation],
  );

  return {
    sources: data?.files ?? [],
    isLoading: isPending,
    error,
    deleteSource,
  };
}
