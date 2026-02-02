"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { fileKeys } from "@/lib/query-keys";
import type { UploadProgress } from "./types";
import { isValidNdjsonFile } from "./utils";

const FILES_API_ENDPOINT = "/api/files";
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

const initialUploadProgress: UploadProgress = {
  status: "idle",
  percentage: 0,
  bytesUploaded: 0,
  bytesTotal: 0,
  fileName: null,
};

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/x-ndjson");
    xhr.send(file);
  });
}

interface UploadContextValue {
  isUploading: boolean;
  uploadProgress: UploadProgress;
  uploadFile: (file: File) => Promise<void>;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function useUpload(): UploadContextValue {
  const context = use(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
}

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>(
    initialUploadProgress,
  );
  const uploadResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const uploadFile = useCallback(
    async (file: File) => {
      if (!isValidNdjsonFile(file)) {
        toast.error("Invalid file type", {
          description: "Please upload an .ndjson file",
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error("File too large", {
          description: `Maximum file size is ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.`,
        });
        return;
      }

      setIsUploading(true);
      setUploadProgress({
        status: "uploading",
        percentage: 0,
        bytesUploaded: 0,
        bytesTotal: file.size,
        fileName: file.name,
      });

      try {
        const { url, key } = await apiRequest<{ url: string; key: string }>(
          FILES_API_ENDPOINT,
          {
            method: "POST",
            body: JSON.stringify({ filename: file.name }),
          },
        );

        await uploadWithProgress(url, file, (loaded, total) => {
          const percentage = Math.round((loaded / total) * 100);
          setUploadProgress((prev) => ({
            ...prev,
            percentage,
            bytesUploaded: loaded,
            bytesTotal: total,
          }));
        });

        await apiRequest(FILES_API_ENDPOINT, {
          method: "PUT",
          body: JSON.stringify({
            key,
            filename: file.name,
            size: file.size,
          }),
        });

        setUploadProgress((prev) => ({
          ...prev,
          status: "complete",
          percentage: 100,
        }));

        await queryClient.invalidateQueries({ queryKey: fileKeys.list() });

        toast.success("File uploaded", {
          description: `${file.name} is now being processed`,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setUploadProgress((prev) => ({
          ...prev,
          status: "error",
        }));
        toast.error("Upload failed", {
          description: message,
        });
      } finally {
        setIsUploading(false);
        if (uploadResetTimerRef.current) {
          clearTimeout(uploadResetTimerRef.current);
        }
        uploadResetTimerRef.current = setTimeout(() => {
          setUploadProgress(initialUploadProgress);
          uploadResetTimerRef.current = null;
        }, 1500);
      }
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({
      isUploading,
      uploadProgress,
      uploadFile,
    }),
    [isUploading, uploadProgress, uploadFile],
  );

  return <UploadContext value={value}>{children}</UploadContext>;
}
