"use client";

import { CheckCircle2, Upload, XCircle } from "lucide-react";
import spinners from "unicode-animations";
import { UnicodeSpinner } from "@/components/ui/unicode-spinner";
import {
  type UploadStatus as UploadStatusType,
  useUploadState,
} from "./upload-context";

interface StatusIconProps {
  status: UploadStatusType;
  className?: string;
}

function StatusIcon({ status, className = "h-6 w-6" }: StatusIconProps) {
  switch (status) {
    case "uploading":
      return (
        <UnicodeSpinner
          animation={spinners.braillewave}
          className={`${className} text-blue-500`}
          label="Uploading"
        />
      );
    case "processing":
      return (
        <UnicodeSpinner
          animation={spinners.dna}
          className={`${className} text-amber-500`}
          label="Processing"
        />
      );
    case "complete":
      return <CheckCircle2 className={`${className} text-green-500`} />;
    case "error":
      return <XCircle className={`${className} text-red-500`} />;
    case "cancelled":
      return <XCircle className={`${className} text-zinc-500`} />;
    default:
      return <Upload className={`${className} text-zinc-500`} />;
  }
}

interface StatusTextProps {
  status: UploadStatusType;
  chunks?: { current: number; total: number; uploaded: number } | null;
}

function StatusText({ status, chunks }: StatusTextProps) {
  switch (status) {
    case "uploading":
      if (chunks && chunks.total > 1) {
        return `Uploading chunk ${chunks.uploaded + 1} of ${chunks.total}...`;
      }
      return "Uploading to cloud storage...";
    case "processing":
      return "Finalizing upload and starting processing...";
    case "complete":
      return "Upload complete - processing will begin shortly";
    case "error":
      return "Upload failed";
    case "cancelled":
      return "Upload cancelled";
    default:
      return "Ready";
  }
}

// ============================================================================
// Compound Component: Upload.Status
// ============================================================================

interface UploadStatusProps {
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
}

export function UploadStatus({
  iconOnly = false,
  className,
  iconClassName,
}: UploadStatusProps) {
  const { status, chunks } = useUploadState();

  if (iconOnly) {
    return <StatusIcon status={status} className={iconClassName} />;
  }

  return (
    <div className={className}>
      <StatusIcon status={status} className={iconClassName} />
      <span className="text-xs text-zinc-500">
        <StatusText status={status} chunks={chunks} />
      </span>
    </div>
  );
}

// Export individual pieces for flexible composition
export { StatusIcon, StatusText };
