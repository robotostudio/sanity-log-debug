"use client";

import {
  Activity,
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
import { cn } from "@/lib/utils";
import type { File } from "@/lib/db/schema";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PipelineContent() {
  const { data, error, isLoading } = useSWR<ProcessingData>(
    "/api/processing",
    fetcher,
    { refreshInterval: 2000 }
  );

  if (error) {
    return (
      <div className="space-y-8">
        <PipelineHeader />
        <ErrorState />
      </div>
    );
  }

  const stats = data?.stats ?? {};
  const recentJobs = data?.recentJobs ?? [];
  const activeJobs = data?.activeJobs ?? [];
  const totalRecords = data?.totalRecords ?? 0;

  const hasActiveJobs = activeJobs.length > 0;

  return (
    <div className="space-y-8">
      <PipelineHeader />

      {/* Metrics Overview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400">Overview</h2>
          <span className="text-xs text-zinc-600">
            {totalRecords.toLocaleString()} total records processed
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
      </section>

      {/* Active Jobs */}
      {hasActiveJobs && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-300" />
            </div>
            <h2 className="text-sm font-medium text-zinc-400">
              Active Jobs
            </h2>
          </div>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <ActiveJobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Job History */}
      <section>
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

function PipelineHeader() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-zinc-500" />
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Pipeline
        </h1>
      </div>
      <p className="text-sm text-zinc-500">
        Monitor data ingestion and processing workflows in real-time.
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 py-16 text-center">
      <div className="rounded-full bg-red-500/10 p-3">
        <XCircle className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-zinc-200">
        Connection Error
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500">
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
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
        <Icon
          className={cn(
            "h-4 w-4 text-zinc-600",
            pulse && "animate-pulse text-zinc-400",
            accent && accentStyles[accent]
          )}
        />
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-zinc-800" />
      ) : (
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums text-zinc-100",
            accent && accentStyles[accent]
          )}
        >
          {value.toLocaleString()}
        </p>
      )}
    </div>
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
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
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
        <StatusBadge status={job.processingStatus} />
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

function JobsTable({ jobs, loading }: JobsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-md bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return <EmptyJobsState />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-800">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <div className="col-span-1">Status</div>
        <div className="col-span-4">File</div>
        <div className="col-span-2 text-right">Size</div>
        <div className="col-span-2 text-right">Records</div>
        <div className="col-span-3 text-right">Processed</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-800/50">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 text-sm transition-colors hover:bg-zinc-800/30"
          >
            <div className="col-span-1 flex items-center">
              <StatusIcon status={job.processingStatus} />
            </div>
            <div className="col-span-4 flex items-center gap-2 truncate">
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
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyJobsState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 py-16 text-center">
      <div className="rounded-full bg-zinc-800 p-3">
        <Database className="h-6 w-6 text-zinc-500" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-zinc-200">
        No processing history
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500">
        Upload your first data source to begin ingesting records into the
        system.
      </p>
      <Link
        href="/sources"
        className="mt-4 rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
      >
        Upload Data Source
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Queued",
      className: "bg-zinc-800 text-zinc-400",
    },
    processing: {
      label: "Processing",
      className: "bg-zinc-700 text-zinc-200",
    },
    ready: {
      label: "Complete",
      className: "bg-green-500/10 text-green-400",
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-400",
    },
  };

  const { label, className } = config[status] ?? config.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="h-4 w-4 text-zinc-500" />,
    processing: <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />,
    ready: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    failed: <XCircle className="h-4 w-4 text-red-400" />,
  };

  return icons[status] ?? icons.pending;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
