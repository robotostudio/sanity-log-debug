"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import type { SourceDetail } from "./types";

async function fetcher(url: string): Promise<SourceDetail> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
}

export function useSourceDetail(id: string) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading, error } = useSWR<SourceDetail>(
    `/api/files/${id}`,
    fetcher,
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
      const res = await fetch("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: data.key }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete source");
      }

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
