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
    <div className="overflow-hidden rounded-[8px] border border-zinc-800">
      {sources.map((source) => (
        <SourceRow key={source.key} source={source} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function SourceListSkeleton() {
  return (
    <div className="overflow-hidden rounded-[8px] border border-zinc-800">
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center border-b border-zinc-800 px-4 py-3.5 last:border-b-0"
        >
          <div className="flex flex-col gap-1 pr-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      ))}
    </div>
  );
}
