"use client";

import { EmptyState } from "./empty-state";
import { SourceRow } from "./source-row";
import type { Source } from "./types";

interface SourceListProps {
  sources: Source[];
}

const SKELETON_IDS = ["skeleton-0", "skeleton-1", "skeleton-2"];

export function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-zinc-800">
      {sources.map((source) => (
        <SourceRow key={source.key} source={source} />
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
          className="grid grid-cols-[2fr_1fr_1.2fr_1.4fr_0.8fr_1fr] items-center gap-4 border-b border-zinc-800 px-4 py-3.5 last:border-b-0"
        >
          <div className="flex flex-col gap-1">
            <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800/50" />
            <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-800/50" />
          </div>
          <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800/50" />
        </div>
      ))}
    </div>
  );
}
