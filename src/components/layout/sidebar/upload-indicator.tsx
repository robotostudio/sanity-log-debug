"use client";

import { CheckCircle2, Loader2, Upload, XCircle, X } from "lucide-react";
import {
  useUploadState,
  useUploadActions,
  type UploadStatus,
} from "@/components/upload";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-provider";
import { formatBytes, formatDurationSeconds } from "@/lib/format";

export function UploadIndicator() {
  const { status, file, progress, speed } = useUploadState();
  const { cancel } = useUploadActions();
  const { isCollapsed } = useSidebar();

  if (status === "idle") {
    return null;
  }

  return (
    <div className="border-t border-zinc-800 p-2">
      <div
        className={cn(
          "flex items-center gap-3 rounded-md bg-zinc-900 px-3 py-2",
          isCollapsed && "justify-center px-2"
        )}
      >
        <StatusIcon status={status} />

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-xs font-medium text-zinc-300">
                {file?.name ?? "Uploading..."}
              </p>
              {status === "uploading" && (
                <button
                  onClick={cancel}
                  className="ml-2 rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  title="Cancel upload"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-zinc-800">
                <div
                  className={cn(
                    "h-1 rounded-full transition-all duration-200",
                    status === "processing" ? "bg-amber-500" : "bg-zinc-400"
                  )}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-zinc-500">
                {progress.percentage}%
              </span>
            </div>
            {status === "uploading" && (
              <div className="mt-1 flex items-center justify-between text-xs text-zinc-600">
                <span>
                  {formatBytes(progress.uploaded)} /{" "}
                  {formatBytes(progress.total)}
                </span>
                {speed && speed.eta > 0 && (
                  <span>{formatDurationSeconds(speed.eta)} left</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadStatus }) {
  switch (status) {
    case "uploading":
      return (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-zinc-400" />
      );
    case "processing":
      return (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
      );
    case "complete":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 shrink-0 text-zinc-500" />;
    default:
      return <Upload className="h-4 w-4 shrink-0 text-zinc-500" />;
  }
}
