"use client";

import Link from "next/link";
import { AnalyticsNavIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ProcessingStatus, Source } from "./types";
import { formatBytes, formatSourceName, getFileName } from "./utils";

interface SourceRowProps {
  source: Source;
  onDelete?: (key: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatDateRange(dateString: string): string {
  const date = new Date(dateString);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const endDay = Math.min(day + 7, 30);
  return `${month} ${day} - ${endDay}`;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  processing: "bg-amber-400",
  pending: "bg-zinc-400",
  ready: "bg-emerald-400",
  error: "bg-red-400",
  failed: "bg-red-400",
  legacy: "bg-zinc-400",
};

const STATUS_LABELS: Record<string, string> = {
  processing: "Processing",
  pending: "Pending",
  ready: "Ready",
  error: "Error",
  failed: "Failed",
  legacy: "Legacy",
};

function StatusDot({ status }: { status?: ProcessingStatus }) {
  const key = status && status in STATUS_DOT_COLORS ? status : "legacy";

  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT_COLORS[key])} />
      <span className="text-sm text-zinc-300">{STATUS_LABELS[key]}</span>
    </div>
  );
}

function AnalyticsIconSmall() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-800 bg-[radial-gradient(circle,#222_0%,#141414_100%)]">
      <AnalyticsNavIcon className="h-3.5 w-3.5 text-zinc-400" />
    </div>
  );
}

export function SourceRow({ source, onDelete }: SourceRowProps) {
  const rawFileName = getFileName(source.key);
  const displayName = formatSourceName(rawFileName);
  const isReady = source.processingStatus === "ready";
  const isProcessing =
    source.processingStatus === "processing" ||
    source.processingStatus === "pending";

  return (
    <Link
      href={`/sources/${source.id}`}
      className="grid cursor-pointer grid-cols-12 gap-4 border-b border-zinc-800 px-4 py-3.5 text-sm transition-colors duration-150 last:border-b-0 hover:bg-white/[0.04]"
    >
      {/* Name */}
      <div className="col-span-3 flex flex-col gap-0.5 min-w-0">
        <p className="truncate text-zinc-200">{displayName}</p>
        <p className="text-xs text-zinc-500">
          {formatRelativeTime(source.lastModified)}
        </p>
      </div>

      {/* Status */}
      <div className="col-span-2 flex items-center">
        <StatusDot status={source.processingStatus} />
      </div>

      {/* Records */}
      <div className="col-span-2 flex items-center justify-end tabular-nums text-zinc-300">
        {source.recordCount != null
          ? source.recordCount.toLocaleString()
          : "—"}
      </div>

      {/* Size */}
      <div className="col-span-1 flex items-center justify-end text-zinc-500">
        {formatBytes(source.size)}
      </div>

      {/* Date range */}
      <div className="col-span-2 flex items-center justify-end text-zinc-500">
        {formatDateRange(source.lastModified)}
      </div>

      {/* View Analytics */}
      <div className="col-span-2 flex items-center justify-end">
        <div
          className={cn(
            "inline-flex items-center gap-2 text-zinc-300",
            !isReady && "text-zinc-500",
            isProcessing && "opacity-40",
          )}
        >
          <AnalyticsIconSmall />
          <span>View</span>
        </div>
      </div>
    </Link>
  );
}
