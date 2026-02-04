"use client";

import { Clock } from "lucide-react";
import { formatBytes, formatDurationSeconds } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUploadState } from "./upload-context";

// ============================================================================
// Compound Component: Upload.Stats
// ============================================================================

interface UploadStatsProps {
  className?: string;
  showSpeed?: boolean;
  showEta?: boolean;
  showBytes?: boolean;
  showChunks?: boolean;
}

export function UploadStats({
  className,
  showSpeed = true,
  showEta = true,
  showBytes = true,
  showChunks = false,
}: UploadStatsProps) {
  const { progress, speed, chunks } = useUploadState();

  return (
    <div className={cn("flex justify-between text-xs text-zinc-500", className)}>
      {showBytes && <span>{formatBytes(progress.uploaded)}</span>}

      <span className="flex items-center gap-4">
        {showSpeed && speed && speed.bytesPerSecond > 0 && (
          <span>{formatBytes(speed.bytesPerSecond)}/s</span>
        )}

        {showEta && speed && speed.eta > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDurationSeconds(speed.eta)}
          </span>
        )}

        {showBytes && <span>{formatBytes(progress.total)}</span>}
      </span>
    </div>
  );
}

// ============================================================================
// Chunk Progress (separate component for chunk display)
// ============================================================================

interface ChunkProgressProps {
  className?: string;
}

export function ChunkProgress({ className }: ChunkProgressProps) {
  const { chunks } = useUploadState();

  if (!chunks || chunks.total <= 1) {
    return null;
  }

  return (
    <div className={cn("text-xs text-zinc-600", className)}>
      Chunk {chunks.uploaded} of {chunks.total}
    </div>
  );
}

// ============================================================================
// Compact Stats (for sidebar)
// ============================================================================

interface CompactStatsProps {
  className?: string;
}

export function CompactStats({ className }: CompactStatsProps) {
  const { progress, speed } = useUploadState();

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs text-zinc-600",
        className
      )}
    >
      <span>
        {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
      </span>
      {speed && speed.eta > 0 && (
        <span>{formatDurationSeconds(speed.eta)} left</span>
      )}
    </div>
  );
}
