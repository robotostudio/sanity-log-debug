"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateContainer } from "@/components/ui/state-container";
import { apiFetcher } from "@/lib/api-client";
import { PROCESSING_STATUS_BG } from "@/lib/constants";
import type { File } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

interface ProcessingStats {
  pending?: number;
  processing?: number;
  ready?: number;
  failed?: number;
}

interface ActiveJob extends File {
  currentRecordCount?: number;
}

interface ProcessingData {
  stats: ProcessingStats;
  recentJobs: File[];
  activeJobs: ActiveJob[];
  totalRecords: number;
}

export function PipelineContent() {
  const { data, error, isLoading } = useSWR<ProcessingData>(
    "/api/processing",
    apiFetcher,
    { refreshInterval: 2000 },
  );

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Pipeline" />
        <ErrorState />
      </div>
    );
  }

  const stats = data?.stats ?? {};
  const recentJobs = data?.recentJobs ?? [];
  const activeJobs = data?.activeJobs ?? [];
  const hasActiveJobs = activeJobs.length > 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Pipeline" />

      {/* Metrics Overview */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="In Queue"
          value={stats.pending ?? 0}
          icon={Clock}
          loading={isLoading}
        />
        <MetricCard
          label="Processing"
          value={stats.processing ?? 0}
          icon={Zap}
          loading={isLoading}
          pulse={Boolean(stats.processing)}
        />
        <MetricCard
          label="Completed"
          value={stats.ready ?? 0}
          icon={CheckCircle2}
          loading={isLoading}
          accent="success"
        />
        <MetricCard
          label="Failed"
          value={stats.failed ?? 0}
          icon={XCircle}
          loading={isLoading}
          accent="error"
        />
      </div>

      {/* Active Jobs */}
      {hasActiveJobs && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-300" />
            </div>
            <h2 className="text-sm font-medium text-zinc-400">Active Jobs</h2>
          </div>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <ActiveJobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Job History */}
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-sm font-medium text-zinc-400">Job History</h2>
          <p className="mt-0.5 text-xs text-zinc-600">
            Recent processing activity
          </p>
        </div>
        <JobsTable jobs={recentJobs} loading={isLoading} />
      </section>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[8px] border border-red-500/20 bg-red-500/5 p-12 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
      <h3 className="text-lg font-medium text-zinc-100">Connection Error</h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Unable to fetch pipeline status. Verify your database connection and
        refresh the page.
      </p>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  loading?: boolean;
  pulse?: boolean;
  accent?: "success" | "error";
}

function MetricCard({
  label,
  value,
  icon: Icon,
  loading,
  pulse,
  accent,
}: MetricCardProps) {
  const accentStyles = {
    success: "text-green-400",
    error: "text-red-400",
  };

  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>{label}</span>
          <Icon
            className={cn(
              "h-4 w-4 text-zinc-600",
              pulse && "animate-pulse text-zinc-400",
              accent && accentStyles[accent],
            )}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p
            className={cn(
              "font-mono text-2xl font-medium text-zinc-100",
              accent && accentStyles[accent],
            )}
          >
            {value.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ActiveJobCardProps {
  job: ActiveJob;
}

function ActiveJobCard({ job }: ActiveJobCardProps) {
  const isProcessing = job.processingStatus === "processing";
  const isPending = job.processingStatus === "pending";
  const recordCount = job.currentRecordCount ?? 0;

  return (
    <div className="rounded-[8px] border border-zinc-800 bg-transparent p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate text-sm font-medium text-zinc-200">
              {job.filename}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <span>{formatFileSize(job.size)}</span>
            <span className="text-zinc-700">·</span>
            <span>Uploaded {formatRelativeTime(job.uploadedAt)}</span>
          </div>
        </div>
        <ProcessingStatusBadge status={job.processingStatus} />
      </div>

      {/* Progress indicator */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {isPending && "Waiting in queue..."}
            {isProcessing && `${recordCount.toLocaleString()} records ingested`}
          </span>
          {isProcessing && (
            <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
          )}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
          {isProcessing ? (
            <div className="h-full w-full animate-progress-indeterminate bg-gradient-to-r from-transparent via-zinc-500 to-transparent" />
          ) : (
            <div className="h-full w-0 bg-zinc-600" />
          )}
        </div>
      </div>
    </div>
  );
}

interface JobsTableProps {
  jobs: File[];
  loading?: boolean;
}

const SKELETON_ROW_IDS = ["skel-0", "skel-1", "skel-2", "skel-3", "skel-4"];

function JobsTable({ jobs, loading }: JobsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {SKELETON_ROW_IDS.map((id) => (
          <Skeleton key={id} className="h-14" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return <EmptyJobsState />;
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-zinc-800">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 border-b border-zinc-800 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <div className="col-span-2">Status</div>
        <div className="col-span-3">File</div>
        <div className="col-span-2 text-right">Size</div>
        <div className="col-span-2 text-right">Records</div>
        <div className="col-span-3 text-right">Processed</div>
      </div>

      {/* Rows */}
      {jobs.map((job) => (
        <Link
          key={job.id}
          href={`/sources/${job.id}`}
          className="grid grid-cols-12 gap-4 border-b border-zinc-800 px-4 py-3.5 text-sm transition-colors duration-150 last:border-b-0 hover:bg-white/[0.04] cursor-pointer"
        >
          <div className="col-span-2 flex items-center gap-2">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                JOB_STATUS_DOT_COLORS[job.processingStatus] ?? "bg-zinc-400",
              )}
            />
            <span className="text-sm text-zinc-300">
              {JOB_STATUS_LABELS[job.processingStatus] ?? "Unknown"}
            </span>
          </div>
          <div className="col-span-3 flex items-center gap-2 truncate">
            <span className="truncate text-zinc-200">{job.filename}</span>
          </div>
          <div className="col-span-2 flex items-center justify-end text-zinc-500">
            {formatFileSize(job.size)}
          </div>
          <div className="col-span-2 flex items-center justify-end tabular-nums text-zinc-300">
            {job.recordCount?.toLocaleString() ?? "—"}
          </div>
          <div className="col-span-3 flex items-center justify-end text-zinc-500">
            {job.processedAt ? formatDate(job.processedAt) : "—"}
          </div>
        </Link>
      ))}
    </div>
  );
}

function EmptyJobsState() {
  return (
    <StateContainer
      variant="card"
      icon={<Database className="h-6 w-6 text-zinc-500" />}
      title="No processing history"
      description="Upload your first data source to begin ingesting records into the system."
      action={
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 rounded-[8px] bg-[#f4f4f5] px-[12px] py-[8px] text-[15px] font-medium leading-[20px] text-[#09090b] transition-colors hover:bg-zinc-200"
        >
          Upload Data Source
        </Link>
      }
    />
  );
}

function ProcessingStatusBadge({ status }: { status: string }) {
  const defaultConfig = PROCESSING_STATUS_BG.pending;
  const { label, className } = PROCESSING_STATUS_BG[status] ?? defaultConfig;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

const JOB_STATUS_DOT_COLORS: Record<string, string> = {
  pending: "bg-zinc-400",
  processing: "bg-amber-400",
  ready: "bg-emerald-400",
  failed: "bg-red-400",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  processing: "Processing",
  ready: "Complete",
  failed: "Failed",
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
