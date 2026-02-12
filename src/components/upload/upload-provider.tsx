"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import { fileKeys } from "@/lib/query-keys";
import { isValidCSVFile } from "@/components/sources/utils";
import {
  type UploadState,
  type UploadActions,
  type UploadMeta,
  UploadStateContext,
  UploadActionsContext,
  UploadMetaContext,
} from "./upload-context";

// ============================================================================
// Constants
// ============================================================================

const UPLOADS_API_ENDPOINT = "/api/uploads";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const MAX_CONCURRENT_CHUNKS = 4;
const MAX_CHUNK_RETRIES = 3;
const ACCEPTED_FILE_TYPES = [".csv"];

// ============================================================================
// Types
// ============================================================================

interface ChunkUploadResult {
  chunkNumber: number;
  etag: string;
}

interface UploadSession {
  sessionId: string;
  fileId: string;
  r2UploadId: string;
  chunkSize: number;
  totalChunks: number;
  chunks: {
    chunkNumber: number;
    presignedUrl: string;
    byteStart: number;
    byteEnd: number;
  }[];
}

// ============================================================================
// Chunk Upload Helper
// ============================================================================

async function uploadChunkWithRetry(
  file: File,
  chunk: {
    chunkNumber: number;
    presignedUrl: string;
    byteStart: number;
    byteEnd: number;
  },
  sessionId: string,
  onProgress: (loaded: number) => void,
  abortSignal?: AbortSignal
): Promise<ChunkUploadResult> {
  let lastError: Error | null = null;

  if (!chunk.presignedUrl) {
    throw new Error(`Chunk ${chunk.chunkNumber} has no presignedUrl`);
  }

  for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
    try {
      const blob = file.slice(chunk.byteStart, chunk.byteEnd);

      const response = await fetch(chunk.presignedUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "text/csv",
        },
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.status}`);
      }

      const etag =
        response.headers.get("ETag") || `"chunk-${chunk.chunkNumber}"`;
      onProgress(chunk.byteEnd - chunk.byteStart);

      await apiRequest(
        `${UPLOADS_API_ENDPOINT}/${sessionId}/chunks/${chunk.chunkNumber}`,
        {
          method: "POST",
          body: JSON.stringify({ etag }),
        }
      );

      return { chunkNumber: chunk.chunkNumber, etag };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (abortSignal?.aborted) {
        throw new Error("Upload cancelled");
      }

      if (attempt < MAX_CHUNK_RETRIES - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  await apiRequest(
    `${UPLOADS_API_ENDPOINT}/${sessionId}/chunks/${chunk.chunkNumber}`,
    {
      method: "PATCH",
      body: JSON.stringify({ error: lastError?.message || "Max retries exceeded" }),
    }
  ).catch(() => {});

  throw lastError || new Error("Chunk upload failed after retries");
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: UploadState = {
  status: "idle",
  file: null,
  progress: { uploaded: 0, total: 0, percentage: 0 },
  chunks: null,
  speed: null,
};

// ============================================================================
// Provider Component
// ============================================================================

interface UploadProviderProps {
  children: ReactNode;
}

export function UploadProvider({ children }: UploadProviderProps) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<UploadState>(initialState);
  const uploadResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Actions (stable references via useCallback)
  // -------------------------------------------------------------------------

  const cancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (currentSessionRef.current) {
      try {
        await apiRequest(`${UPLOADS_API_ENDPOINT}/${currentSessionRef.current}`, {
          method: "DELETE",
        });
      } catch {
        // Ignore cancellation errors
      }
      currentSessionRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: "cancelled",
    }));
  }, []);

  const upload = useCallback(
    async (file: File) => {
      if (!isValidCSVFile(file)) {
        toast.error("Invalid file type", {
          description: "Please upload a .csv file",
        });
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error("File too large", {
          description: `Maximum file size is ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024 * 1024))}GB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.`,
        });
        return;
      }

      abortControllerRef.current = new AbortController();

      setState({
        status: "uploading",
        file: { name: file.name, size: file.size },
        progress: { uploaded: 0, total: file.size, percentage: 0 },
        chunks: null,
        speed: null,
      });

      let sessionId: string | null = null;

      try {
        // Create upload session
        const session = await apiRequest<UploadSession>(UPLOADS_API_ENDPOINT, {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            contentType: "text/csv",
          }),
        });

        sessionId = session.sessionId;
        currentSessionRef.current = sessionId;

        setState((prev) => ({
          ...prev,
          chunks: {
            current: 0,
            total: session.totalChunks,
            uploaded: 0,
          },
        }));

        // Upload chunks
        const chunks = session.chunks;
        if (!chunks || chunks.length === 0) {
          throw new Error("No chunks received from server");
        }

        const results: ChunkUploadResult[] = [];
        let bytesUploaded = 0;
        let uploadedChunks = 0;
        const startTime = Date.now();

        for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error("Upload cancelled");
          }

          const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);

          const batchResults = await Promise.all(
            batch.map((chunk) =>
              uploadChunkWithRetry(
                file,
                chunk,
                sessionId!,
                (chunkBytes) => {
                  bytesUploaded += chunkBytes;
                  uploadedChunks++;

                  const elapsed = (Date.now() - startTime) / 1000;
                  const bytesPerSecond =
                    elapsed > 0 ? bytesUploaded / elapsed : 0;
                  const remainingBytes = file.size - bytesUploaded;
                  const eta =
                    bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : 0;

                  setState((prev) => ({
                    ...prev,
                    progress: {
                      uploaded: bytesUploaded,
                      total: file.size,
                      percentage: Math.round((bytesUploaded / file.size) * 100),
                    },
                    chunks: {
                      current: chunk.chunkNumber,
                      total: chunks.length,
                      uploaded: uploadedChunks,
                    },
                    speed: {
                      bytesPerSecond,
                      eta,
                    },
                  }));
                },
                abortControllerRef.current?.signal
              )
            )
          );

          results.push(...batchResults);
        }

        // Complete upload
        setState((prev) => ({
          ...prev,
          status: "processing",
          progress: { ...prev.progress, percentage: 100 },
        }));

        await apiRequest<{ fileId: string; jobId: string }>(
          `${UPLOADS_API_ENDPOINT}/${sessionId}/complete`,
          {
            method: "POST",
            body: JSON.stringify({
              parts: results.map((r) => ({
                partNumber: r.chunkNumber,
                etag: r.etag,
              })),
            }),
          }
        );

        setState((prev) => ({
          ...prev,
          status: "complete",
        }));

        currentSessionRef.current = null;
        await queryClient.invalidateQueries({ queryKey: fileKeys.list() });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";

        if (message !== "Upload cancelled") {
          setState((prev) => ({
            ...prev,
            status: "error",
          }));
        }
      } finally {
        abortControllerRef.current = null;
        currentSessionRef.current = null;

        if (uploadResetTimerRef.current) {
          clearTimeout(uploadResetTimerRef.current);
        }
        uploadResetTimerRef.current = setTimeout(() => {
          setState(initialState);
          uploadResetTimerRef.current = null;
        }, 3000);
      }
    },
    [queryClient]
  );

  // -------------------------------------------------------------------------
  // Memoized Context Values
  // -------------------------------------------------------------------------

  const actions = useMemo<UploadActions>(
    () => ({ upload, cancel }),
    [upload, cancel]
  );

  const meta = useMemo<UploadMeta>(
    () => ({
      maxFileSize: MAX_FILE_SIZE_BYTES,
      acceptedTypes: ACCEPTED_FILE_TYPES,
      isUploading: state.status === "uploading" || state.status === "processing",
    }),
    [state.status]
  );

  return (
    <UploadStateContext value={state}>
      <UploadActionsContext value={actions}>
        <UploadMetaContext value={meta}>{children}</UploadMetaContext>
      </UploadActionsContext>
    </UploadStateContext>
  );
}
