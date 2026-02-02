"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  value?: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({
  label,
  value,
  onRemove,
  className,
}: FilterChipProps) {
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-transparent px-2.5 py-1 text-xs text-zinc-200",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        className,
      )}
    >
      {value ? (
        <>
          <span className="text-zinc-400">{label}:</span>
          <span className="font-medium">{value}</span>
        </>
      ) : (
        <span className="font-medium">{label}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

interface FilterChipsContainerProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  showClearAll?: boolean;
}

export function FilterChipsContainer({
  children,
  onClearAll,
  showClearAll = false,
}: FilterChipsContainerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">Active:</span>
      {children}
      {showClearAll && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-2 text-xs text-red-400/70 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
