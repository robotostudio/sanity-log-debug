"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Loader2, Upload, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import type { UploadProgress } from "./types";
import { formatBytes } from "./utils";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  progress: UploadProgress;
}

export function UploadZone({
  onUpload,
  isUploading,
  progress,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

      const file = e.dataTransfer.files[0];
      if (file) {
        await onUpload(file);
      }
    },
    [onUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onUpload(file);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onUpload],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Show progress UI when uploading
  if (progress.status !== "idle") {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-8">
        <div className="flex items-center gap-4 mb-4">
          <StatusIcon status={progress.status} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">
              {progress.fileName ?? "Uploading..."}
            </p>
            <p className="text-xs text-zinc-500">
              <StatusText status={progress.status} />
            </p>
          </div>
          <span className="text-sm font-medium tabular-nums text-zinc-100">
            {progress.percentage}%
          </span>
        </div>

        <Progress value={progress.percentage} className="h-2" />

        <div className="flex justify-between mt-3 text-xs text-zinc-500">
          <span>{formatBytes(progress.bytesUploaded)}</span>
          <span>{formatBytes(progress.bytesTotal)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative cursor-pointer rounded-md border-2 border-dashed p-12 text-center transition-colors",
        isDragOver
          ? "border-zinc-500 bg-zinc-800"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".ndjson"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center">
        <div
          className={cn(
            "rounded-full p-4 transition-colors",
            isDragOver
              ? "bg-zinc-700/50 text-zinc-300"
              : "bg-zinc-800/50 text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-400",
          )}
        >
          <Upload className="h-8 w-8" />
        </div>

        <p className="mt-4 text-sm font-medium text-zinc-300">
          Drag & drop .ndjson files here
        </p>
        <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
        <p className="mt-4 text-xs text-zinc-600">Supports files up to 500MB</p>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: UploadProgress["status"] }) {
  switch (status) {
    case "uploading":
      return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
    case "complete":
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    case "error":
      return <XCircle className="h-6 w-6 text-red-500" />;
    default:
      return <Upload className="h-6 w-6 text-zinc-500" />;
  }
}

function StatusText({ status }: { status: UploadProgress["status"] }) {
  switch (status) {
    case "uploading":
      return "Uploading to cloud storage...";
    case "complete":
      return "Upload complete - processing will begin shortly";
    case "error":
      return "Upload failed";
    default:
      return "Ready";
  }
}
