"use client";

import { ChevronRight, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SourceDetail } from "./types";
import { formatBytes, formatDate, formatSourceName } from "./utils";

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

function MetadataItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] leading-[16px] text-[#a1a1aa] tracking-wide">
        {label}
      </span>
      <span className="text-[15px] leading-[22px] text-[#f4f4f5]">
        {children}
      </span>
    </div>
  );
}

interface SourceDetailHeaderProps {
  source: SourceDetail;
  onDelete: () => void;
  isDeleting: boolean;
}

export function SourceDetailHeader({
  source,
  onDelete,
  isDeleting,
}: SourceDetailHeaderProps) {
  const displayName = formatSourceName(source.filename);
  const statusKey =
    source.processingStatus in STATUS_DOT_COLORS
      ? source.processingStatus
      : "legacy";

  return (
    <div className="shrink-0">
      <p className="text-[16px] leading-[24px] flex items-center gap-1.5">
        <Link
          href="/sources"
          className="text-[#a1a1aa] transition-colors hover:text-[#d4d4d8]"
        >
          Sources
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#71717a]" />
        <span className="text-[#fafafa]">{displayName}</span>
      </p>

      <div className="mt-[31px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[24px] font-medium leading-[34px] text-[#fafafa]">
            {displayName}
          </h1>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1">
            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[statusKey]}`} />
            <span className="text-[14px] leading-[20px] text-[#f4f4f5]">
              {STATUS_LABELS[statusKey]}
            </span>
          </div>
        </div>

        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-[8px] border border-zinc-800 p-2 text-[#a1a1aa] transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-[#f4f4f5] disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-red-400 focus:text-red-400">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Source
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete source</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <span className="font-medium text-[#f4f4f5]">
                  {displayName}
                </span>{" "}
                and all {source.recordCount?.toLocaleString() ?? ""} associated
                log records. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-12 gap-y-4 sm:grid-cols-4">
        <MetadataItem label="Uploaded">
          {formatDate(source.uploadedAt)}
        </MetadataItem>
        <MetadataItem label="Processed">
          {source.processedAt ? formatDate(source.processedAt) : "\u2014"}
        </MetadataItem>
        <MetadataItem label="Records">
          {source.recordCount != null
            ? source.recordCount.toLocaleString()
            : "\u2014"}
        </MetadataItem>
        <MetadataItem label="Size">
          {formatBytes(source.size)}
        </MetadataItem>
      </div>
    </div>
  );
}
