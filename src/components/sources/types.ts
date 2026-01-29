export type ProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "error"
  | "legacy";

export interface Source {
  key: string;
  size: number;
  lastModified: string;
  processingStatus?: ProcessingStatus;
  recordCount?: number | null;
}

export interface UploadProgress {
  status: "idle" | "uploading" | "complete" | "error";
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
  fileName: string | null;
}
