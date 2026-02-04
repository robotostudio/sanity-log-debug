"use client";

import { Upload, Clock, Pause } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes, formatDurationSeconds } from "@/lib/format";
import { isValidCSVFile } from "@/components/sources/utils";
import {
  useUploadState,
  useUploadActions,
  useUploadMeta,
} from "./upload-context";
import { StatusIcon } from "./upload-status";

// ============================================================================
// Compound Component: Upload.Zone
// ============================================================================

interface UploadZoneProps {
  children?: ReactNode;
  className?: string;
}

export function UploadZone({ children, className }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { status, file, progress, speed, chunks } = useUploadState();
  const { upload, cancel } = useUploadActions();
  const { maxFileSize, isUploading } = useUploadMeta();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      if (!isValidCSVFile(droppedFile)) {
        toast.error("Invalid file type", {
          description: "Please drop a .csv file",
        });
        return;
      }

      await upload(droppedFile);
    },
    [upload]
  );

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await upload(file);
      }
    };
    input.click();
  }, [upload]);

  // Show progress UI when uploading
  if (status !== "idle") {
    return (
      <div className={cn("rounded-md border border-zinc-800 bg-zinc-900 p-8", className)}>
        <div className="mb-4 flex items-center gap-4">
          <StatusIcon status={status} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {file?.name ?? "Uploading..."}
            </p>
            <p className="text-xs text-zinc-500">
              <StatusText status={status} chunks={chunks} />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium tabular-nums text-zinc-100">
              {progress.percentage}%
            </span>
            {status === "uploading" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <Progress value={progress.percentage} className="h-2" />

        <div className="mt-3 flex justify-between text-xs text-zinc-500">
          <span>{formatBytes(progress.uploaded)}</span>
          <span className="flex items-center gap-4">
            {speed && speed.bytesPerSecond > 0 && (
              <span>{formatBytes(speed.bytesPerSecond)}/s</span>
            )}
            {speed && speed.eta > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDurationSeconds(speed.eta)}
              </span>
            )}
            <span>{formatBytes(progress.total)}</span>
          </span>
        </div>

        {chunks && chunks.total > 1 && (
          <div className="mt-3 text-xs text-zinc-600">
            Chunk {chunks.uploaded} of {chunks.total}
          </div>
        )}

        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative w-full cursor-pointer rounded-md border-2 border-dashed p-12 text-center transition-colors",
        isDragOver
          ? "border-zinc-500 bg-zinc-800"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
        className
      )}
    >
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "rounded-full p-4 transition-colors",
            isDragOver
              ? "bg-zinc-700/50 text-zinc-300"
              : "bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-400"
          )}
        >
          <Upload className="h-8 w-8" />
        </div>

        <p className="mt-4 text-sm font-medium text-zinc-300">
          Drag & drop .csv files here
        </p>
        <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
        <p className="mt-4 text-xs text-zinc-600">
          Supports files up to {formatBytes(maxFileSize)}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          Convert NDJSON to CSV:{" "}
          <code className="text-zinc-500">
            gunzip -c file.ndjson.gz | json2csv &gt; file.csv
          </code>
        </p>
      </div>

      {children}
    </button>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusText({
  status,
  chunks,
}: {
  status: string;
  chunks?: { current: number; total: number; uploaded: number } | null;
}) {
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
