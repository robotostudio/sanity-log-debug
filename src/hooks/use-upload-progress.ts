/**
 * Upload Progress Hook
 *
 * React hook for consuming upload progress SSE stream.
 */

import { useEffect, useState, useCallback, useRef } from "react";

export interface UploadChunkProgress {
  chunkNumber: number;
  status: string;
  size: number;
}

export interface UploadProgress {
  sessionId: string;
  filename: string;
  totalBytes: number;
  bytesUploaded: number;
  totalChunks: number;
  uploadedChunks: number;
  percentComplete: number;
  status: string;
  estimatedSecondsRemaining: number | null;
  bytesPerSecond: number | null;
  chunks?: UploadChunkProgress[];
}

export interface UseUploadProgressOptions {
  onComplete?: (progress: UploadProgress) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export function useUploadProgress(
  sessionId: string | null,
  options: UseUploadProgressOptions = {},
) {
  const { onComplete, onError, enabled = true } = options;
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) {
      disconnect();
      return;
    }

    const eventSource = new EventSource(`/api/progress/upload/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
          return;
        }

        if (data.type === "timeout") {
          setError("Connection timed out");
          disconnect();
          return;
        }

        if (data.type === "error") {
          setError(data.message || "Unknown error");
          onError?.(data.message || "Unknown error");
          disconnect();
          return;
        }

        if (data.type === "complete") {
          setProgress(data);
          onComplete?.(data);
          disconnect();
          return;
        }

        if (data.type === "cancelled") {
          setProgress(data);
          disconnect();
          return;
        }

        // Regular progress update
        setProgress(data);
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      setError("Connection error");
      setIsConnected(false);
      // EventSource will auto-reconnect, but let's track the error state
    };

    return () => {
      disconnect();
    };
  }, [sessionId, enabled, onComplete, onError, disconnect]);

  return {
    progress,
    isConnected,
    error,
    disconnect,
  };
}
