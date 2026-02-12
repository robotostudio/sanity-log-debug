"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import {
  useUploadState,
  useUploadActions,
  type UploadStatus,
} from "./upload-context";
import { cn } from "@/lib/utils";
import { formatBytes, formatDurationSeconds } from "@/lib/format";

export function FloatingUploadCard() {
  const { status } = useUploadState();

  if (status === "idle") return null;

  return <FloatingCardInner />;
}

function FloatingCardInner() {
  const { status, file, progress, speed, chunks } = useUploadState();
  const { cancel } = useUploadActions();
  const [isMinimized, setIsMinimized] = useState(false);

  const isActive = status === "uploading" || status === "processing";

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[380px] animate-slide-in-bottom">
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-lg",
          status === "complete" && "border-emerald-500/40",
          (status === "error" || status === "cancelled") &&
            "border-rose-500/40",
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <StatusIcon status={status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {file?.name ?? "Upload"}
            </p>
            <p className="text-xs text-zinc-500">
              <StatusLabel status={status} chunks={chunks} />
            </p>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1 text-sm font-medium tabular-nums text-zinc-300">
              {progress.percentage}%
            </span>
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
              aria-label={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {isActive && (
              <button
                type="button"
                onClick={cancel}
                className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                aria-label="Cancel upload"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar — always visible */}
        <div className="px-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                status === "uploading" && "bg-zinc-300",
                status === "processing" &&
                  "animate-progress-indeterminate bg-zinc-400",
                status === "complete" && "bg-emerald-500",
                (status === "error" || status === "cancelled") && "bg-rose-500",
              )}
              style={{
                width:
                  status === "processing"
                    ? "40%"
                    : `${progress.percentage}%`,
              }}
            />
          </div>
        </div>

        {/* Expandable details */}
        {!isMinimized && (
          <div className="px-4 pt-2 pb-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
              </span>
              <div className="flex items-center gap-3">
                {status === "uploading" &&
                  speed &&
                  speed.bytesPerSecond > 0 && (
                    <span>{formatBytes(speed.bytesPerSecond)}/s</span>
                  )}
                {status === "uploading" && speed && speed.eta > 0 && (
                  <span>{formatDurationSeconds(speed.eta)} left</span>
                )}
              </div>
            </div>
            {chunks && chunks.total > 1 && status === "uploading" && (
              <p className="mt-1 text-xs text-zinc-600">
                Chunk {chunks.uploaded} of {chunks.total}
              </p>
            )}
          </div>
        )}

        {/* Minimized bottom padding */}
        {isMinimized && <div className="h-3" />}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "uploading":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        </div>
      );
    case "processing":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        </div>
      );
    case "complete":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
      );
    case "error":
    case "cancelled":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
          <XCircle className="h-4 w-4 text-rose-400" />
        </div>
      );
    default:
      return null;
  }
}

function StatusLabel({
  status,
  chunks,
}: {
  status: UploadStatus;
  chunks: { current: number; total: number; uploaded: number } | null;
}) {
  switch (status) {
    case "uploading":
      return chunks && chunks.total > 1
        ? "Uploading chunks..."
        : "Uploading...";
    case "processing":
      return "Processing file...";
    case "complete":
      return "Upload complete";
    case "error":
      return "Upload failed";
    case "cancelled":
      return "Upload cancelled";
    default:
      return null;
  }
}
