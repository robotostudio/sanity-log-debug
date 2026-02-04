"use client";

import { createContext, use } from "react";

// ============================================================================
// State Interface - Reactive values that change during upload
// ============================================================================

export type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "error"
  | "cancelled";

export interface UploadState {
  status: UploadStatus;
  file: { name: string; size: number } | null;
  progress: {
    uploaded: number;
    total: number;
    percentage: number;
  };
  chunks: {
    current: number;
    total: number;
    uploaded: number;
  } | null;
  speed: {
    bytesPerSecond: number;
    eta: number;
  } | null;
}

// ============================================================================
// Actions Interface - Imperative functions (stable references)
// ============================================================================

export interface UploadActions {
  upload: (file: File) => Promise<void>;
  cancel: () => void;
}

// ============================================================================
// Meta Interface - Static configuration values
// ============================================================================

export interface UploadMeta {
  maxFileSize: number;
  acceptedTypes: string[];
  isUploading: boolean;
}

// ============================================================================
// Contexts - Separate contexts for optimal re-render behavior
// ============================================================================

export const UploadStateContext = createContext<UploadState | null>(null);
export const UploadActionsContext = createContext<UploadActions | null>(null);
export const UploadMetaContext = createContext<UploadMeta | null>(null);

// ============================================================================
// Hooks - Type-safe access to context values
// ============================================================================

export function useUploadState(): UploadState {
  const context = use(UploadStateContext);
  if (!context) {
    throw new Error("useUploadState must be used within an UploadProvider");
  }
  return context;
}

export function useUploadActions(): UploadActions {
  const context = use(UploadActionsContext);
  if (!context) {
    throw new Error("useUploadActions must be used within an UploadProvider");
  }
  return context;
}

export function useUploadMeta(): UploadMeta {
  const context = use(UploadMetaContext);
  if (!context) {
    throw new Error("useUploadMeta must be used within an UploadProvider");
  }
  return context;
}

// Combined hook for convenience (components that need everything)
export function useUpload() {
  return {
    ...useUploadState(),
    ...useUploadActions(),
    ...useUploadMeta(),
  };
}
