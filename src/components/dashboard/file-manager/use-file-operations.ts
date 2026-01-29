"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import type { R2File } from "./types";
import { isValidNdjsonFile } from "./utils";

const FILES_API_ENDPOINT = "/api/files";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UseFileOperationsProps {
  onFileSelect?: (key: string | null) => void;
  selectedFile: string | null;
}

interface UseFileOperationsReturn {
  files: R2File[];
  isLoading: boolean;
  isUploading: boolean;
  uploadFile: (file: File) => Promise<void>;
  deleteFile: (key: string) => Promise<void>;
}

export function useFileOperations({
  onFileSelect,
  selectedFile,
}: UseFileOperationsProps): UseFileOperationsReturn {
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading } = useSWR<{ files: R2File[] }>(
    FILES_API_ENDPOINT,
    fetcher,
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isValidNdjsonFile(file)) {
        toast.error("Invalid file type", {
          description: "Please upload an .ndjson file",
        });
        return;
      }

      setIsUploading(true);
      const toastId = toast.loading("Uploading file...", {
        description: file.name,
      });

      try {
        const presignRes = await fetch(FILES_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name }),
        });

        if (!presignRes.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { url, key } = await presignRes.json();

        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/x-ndjson" },
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file");
        }

        await mutate(FILES_API_ENDPOINT);
        onFileSelect?.(key);

        toast.success("File uploaded", {
          id: toastId,
          description: file.name,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error("Upload failed", {
          id: toastId,
          description: message,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onFileSelect],
  );

  const deleteFile = useCallback(
    async (key: string) => {
      const toastId = toast.loading("Deleting file...");

      try {
        const res = await fetch(FILES_API_ENDPOINT, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });

        if (!res.ok) {
          throw new Error("Failed to delete file");
        }

        await mutate(FILES_API_ENDPOINT);

        if (selectedFile === key) {
          onFileSelect?.(null);
        }

        toast.success("File deleted", {
          id: toastId,
          description: key,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Delete failed";
        toast.error("Delete failed", {
          id: toastId,
          description: message,
        });
      }
    },
    [selectedFile, onFileSelect],
  );

  return {
    files: data?.files ?? [],
    isLoading,
    isUploading,
    uploadFile,
    deleteFile,
  };
}
