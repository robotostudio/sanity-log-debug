"use client";

// ============================================================================
// Upload Compound Components
// ============================================================================
//
// Usage:
// ```tsx
// <Upload.Provider>
//   <Upload.Zone>
//     <Upload.Progress />
//     <Upload.Stats />
//     <Upload.CancelButton />
//   </Upload.Zone>
// </Upload.Provider>
// ```
//
// Or use individual hooks for custom implementations:
// ```tsx
// const { status, progress } = useUploadState();
// const { upload, cancel } = useUploadActions();
// const { maxFileSize } = useUploadMeta();
// ```

import { UploadProvider } from "./upload-provider";
import { UploadZone } from "./upload-zone";
import { UploadProgress, MiniProgressBar } from "./upload-progress";
import { UploadStats, ChunkProgress, CompactStats } from "./upload-stats";
import { UploadStatus, StatusIcon, StatusText } from "./upload-status";
import { UploadTrigger } from "./upload-trigger";
import { UploadCancelButton } from "./upload-cancel-button";
import { FloatingUploadCard } from "./upload-float-card";

// Compound component pattern
export const Upload = {
  Provider: UploadProvider,
  Zone: UploadZone,
  Progress: UploadProgress,
  MiniProgressBar,
  Stats: UploadStats,
  ChunkProgress,
  CompactStats,
  Status: UploadStatus,
  StatusIcon,
  StatusText,
  Trigger: UploadTrigger,
  CancelButton: UploadCancelButton,
  FloatCard: FloatingUploadCard,
};

// Re-export provider for direct use at app level
export { UploadProvider } from "./upload-provider";

// Re-export context hooks for custom implementations
export {
  useUploadState,
  useUploadActions,
  useUploadMeta,
  useUpload,
  type UploadState,
  type UploadActions,
  type UploadMeta,
  type UploadStatus,
} from "./upload-context";

// Re-export individual components for granular use
export { UploadZone } from "./upload-zone";
export { UploadProgress, MiniProgressBar } from "./upload-progress";
export { UploadStats, ChunkProgress, CompactStats } from "./upload-stats";
export { UploadStatus as UploadStatusComponent, StatusIcon, StatusText } from "./upload-status";
export { UploadTrigger } from "./upload-trigger";
export { UploadCancelButton } from "./upload-cancel-button";
export { FloatingUploadCard } from "./upload-float-card";
