"use client";

import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { File } from "@/lib/db/schema";

interface ActiveJobsPanelProps {
  jobs: File[];
}

export function ActiveJobsPanel({ jobs }: ActiveJobsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Active Processing Jobs
        </CardTitle>
        <CardDescription>
          {jobs.length} job{jobs.length !== 1 ? "s" : ""} currently being
          processed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <ActiveJobItem key={job.id} job={job} />
        ))}
      </CardContent>
    </Card>
  );
}

function ActiveJobItem({ job }: { job: File }) {
  // For processing jobs, we show an indeterminate progress
  // Since we don't track line-by-line progress, we show a pulse animation
  const isProcessing = job.processingStatus === "processing";

  return (
    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate max-w-[300px]">
            {job.filename}
          </span>
          <StatusBadge status={job.processingStatus} />
        </div>
        <span className="text-sm text-muted-foreground">
          {formatFileSize(job.size)}
        </span>
      </div>
      <Progress
        value={isProcessing ? undefined : 0}
        className={isProcessing ? "animate-pulse" : ""}
      />
      <p className="text-xs text-muted-foreground">
        {isProcessing
          ? "Processing records..."
          : "Waiting to start..."}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    processing:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    ready:
      "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
