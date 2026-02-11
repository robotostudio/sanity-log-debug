"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { apiFetcher, apiRequest } from "@/lib/api-client";
import { fileKeys, processingKeys } from "@/lib/query-keys";
import type { SourceDetail } from "./types";

export function useSourceDetail(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => apiFetcher<SourceDetail>(`/api/files/${id}`),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data?.processingStatus === "pending" ||
        data?.processingStatus === "processing"
      ) {
        return 2000;
      }
      return false;
    },
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/files", {
        method: "DELETE",
        body: JSON.stringify({ key: data?.key }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.list() });
      toast.success("Source deleted");
      router.push("/sources");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error("Delete failed", { description: message });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ fileId: string }>(`/api/files/${id}/retry`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: processingKeys.stats() });
      toast.success("Retry started", {
        description: "Processing will restart shortly.",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Retry failed";
      toast.error("Retry failed", { description: message });
    },
  });

  const deleteSource = useCallback(() => {
    if (!data) return;
    toast.loading("Deleting source...");
    deleteMutation.mutate();
  }, [data, deleteMutation]);

  const retrySource = useCallback(() => {
    retryMutation.mutate();
  }, [retryMutation]);

  return {
    source: data ?? null,
    isLoading: isPending,
    error: error ?? null,
    isDeleting: deleteMutation.isPending,
    deleteSource,
    isRetrying: retryMutation.isPending,
    retrySource,
  };
}
