"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useUploadState } from "./upload-context";

// ============================================================================
// Compound Component: Upload.Progress
// ============================================================================

interface UploadProgressProps {
  className?: string;
  showPercentage?: boolean;
}

export function UploadProgress({
  className,
  showPercentage = false,
}: UploadProgressProps) {
  const { progress, status } = useUploadState();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={progress.percentage} className="h-2 flex-1" />
      {showPercentage && (
        <span className="text-sm font-medium tabular-nums text-zinc-100">
          {progress.percentage}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Mini Progress Bar (for sidebar)
// ============================================================================

interface MiniProgressBarProps {
  className?: string;
}

export function MiniProgressBar({ className }: MiniProgressBarProps) {
  const { progress, status } = useUploadState();

  return (
    <div className={cn("h-1 flex-1 rounded-full bg-zinc-800", className)}>
      <div
        className={cn(
          "h-1 rounded-full transition-all duration-200",
          status === "processing" ? "bg-amber-500" : "bg-zinc-400"
        )}
        style={{ width: `${progress.percentage}%` }}
      />
    </div>
  );
}
