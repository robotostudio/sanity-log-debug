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
  status: "idle" | "uploading" | "complete" | "error";
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
  fileName: string | null;
}
