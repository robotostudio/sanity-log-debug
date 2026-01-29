"use client";

import type { Source } from "./types";
import { SourceRow } from "./source-row";
import { EmptyState } from "./empty-state";

interface SourceListProps {
  sources: Source[];
  isLoading: boolean;
  onDelete: (key: string) => Promise<void>;
}

export function SourceList({ sources, isLoading, onDelete }: SourceListProps) {
  if (isLoading) {
    return <SourceListSkeleton />;
  }

  if (sources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <div className="w-10" /> {/* Icon spacer */}
        <div className="min-w-0 flex-1">Name</div>
        <div className="w-24">Status</div>
        <div className="w-24 text-right">Records</div>
        <div className="w-20 text-right">Size</div>
        <div className="w-32" /> {/* Actions spacer */}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {sources.map((source) => (
          <SourceRow key={source.key} source={source} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function SourceListSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-zinc-800/50 animate-pulse" />
      ))}
    </div>
  );
}
