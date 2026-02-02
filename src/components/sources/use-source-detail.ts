"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { apiFetcher, apiRequest } from "@/lib/api-client";
import type { SourceDetail } from "./types";

export function useSourceDetail(id: string) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error } = useSWR<SourceDetail>(
    `/api/files/${id}`,
    apiFetcher,
    {
      refreshInterval: (data) => {
        if (
          data?.processingStatus === "pending" ||
          data?.processingStatus === "processing"
        ) {
          return 2000;
        }
        return 0;
      },
      revalidateOnFocus: false,
    },
  );

  const deleteSource = useCallback(async () => {
    if (!data) return;
    const toastId = toast.loading("Deleting source...");
    setIsDeleting(true);

    try {
      await apiRequest("/api/files", {
        method: "DELETE",
        body: JSON.stringify({ key: data.key }),
      });

      await mutate("/api/files");
      toast.success("Source deleted", { id: toastId });
      router.push("/sources");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error("Delete failed", { id: toastId, description: message });
      setIsDeleting(false);
    }
  }, [data, router]);

  return {
    source: data ?? null,
    isLoading,
    error: error ?? null,
    isDeleting,
    deleteSource,
  };
}
