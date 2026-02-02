"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { apiFetcher, apiRequest } from "@/lib/api-client";
import type { Source } from "./types";
import { useUpload } from "./upload-provider";

const POLL_INTERVAL_MS = 2000;
const FILES_API_ENDPOINT = "/api/files";

export function useSources() {
  const { isUploading, uploadProgress, uploadFile } = useUpload();

  const { data, isLoading, error } = useSWR<{ files: Source[] }>(
    FILES_API_ENDPOINT,
    apiFetcher,
  );

  const hasProcessingSources = useMemo(() => {
    return data?.files?.some(
      (f) =>
        f.processingStatus === "pending" || f.processingStatus === "processing",
    );
  }, [data?.files]);

  useSWR<{ files: Source[] }>(
    hasProcessingSources ? FILES_API_ENDPOINT : null,
    apiFetcher,
    {
      refreshInterval: POLL_INTERVAL_MS,
      dedupingInterval: POLL_INTERVAL_MS / 2,
    },
  );

  const deleteSource = useCallback(async (key: string) => {
    const toastId = toast.loading("Deleting source...");

    try {
      await apiRequest(FILES_API_ENDPOINT, {
        method: "DELETE",
        body: JSON.stringify({ key }),
      });

      await mutate(FILES_API_ENDPOINT);

      toast.success("Source deleted", {
        id: toastId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      toast.error("Delete failed", {
        id: toastId,
        description: message,
      });
    }
  }, []);

  return {
    sources: data?.files ?? [],
    isLoading,
    error,
    isUploading,
    uploadProgress,
    uploadFile,
    deleteSource,
  };
}
