"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { SourceRow } from "./source-row";
import type { Source } from "./types";

interface SourceListProps {
  sources: Source[];
  onDelete?: (key: string) => void;
}

const SKELETON_IDS = ["skeleton-0", "skeleton-1", "skeleton-2"];

export function SourceList({ sources, onDelete }: SourceListProps) {
  if (sources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <div className="w-[28%] min-w-0">Name</div>
        <div className="w-[12%]">Status</div>
        <div className="w-[15%] text-right">Records</div>
        <div className="w-[12%] text-right">Size</div>
        <div className="w-[18%] text-right">Date Range</div>
        <div className="w-[15%] text-right">Analytics</div>
      </div>

      {/* Rows */}
      {sources.map((source) => (
        <SourceRow key={source.key} source={source} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function SourceListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      {/* Header */}
      <div className="flex items-center border-b border-zinc-800 px-4 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <div className="w-[28%] min-w-0">Name</div>
        <div className="w-[12%]">Status</div>
        <div className="w-[15%] text-right">Records</div>
        <div className="w-[12%] text-right">Size</div>
        <div className="w-[18%] text-right">Date Range</div>
        <div className="w-[15%] text-right">Analytics</div>
      </div>

      {/* Skeleton Rows */}
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="flex items-center border-b border-zinc-800 px-4 py-3.5 last:border-b-0"
        >
          <div className="w-[28%] min-w-0 flex flex-col gap-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <div className="w-[12%] flex items-center">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-[15%] flex items-center justify-end">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-[12%] flex items-center justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="w-[18%] flex items-center justify-end">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-[15%] flex items-center justify-end">
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}
