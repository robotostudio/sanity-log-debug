export type ProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "error"
  | "failed"
  | "legacy";

export interface Source {
  id: string;
  key: string;
  size: number;
  lastModified: string;
  processingStatus?: ProcessingStatus;
  recordCount?: number | null;
}

export interface SourceDetail {
  id: string;
  key: string;
  filename: string;
  size: number;
  uploadedAt: string;
  processingStatus: ProcessingStatus;
  recordCount: number | null;
  processedAt: string | null;
}

export interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "complete" | "error" | "cancelled";
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
  fileName: string | null;
  // Chunked upload details
  sessionId?: string;
  totalChunks?: number;
  uploadedChunks?: number;
  currentChunk?: number;
  bytesPerSecond?: number | null;
  estimatedSecondsRemaining?: number | null;
  // Processing details
  jobId?: string;
  processedRows?: number;
  totalRows?: number | null;
  failedRows?: number;
}
