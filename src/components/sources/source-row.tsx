"use client";

import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cog,
  FileText,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ProcessingStatus, Source } from "./types";
import { formatBytes, formatDate, getFileName } from "./utils";

interface SourceRowProps {
  source: Source;
  onDelete: (key: string) => Promise<void>;
}

export function SourceRow({ source, onDelete }: SourceRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileName = getFileName(source.key);
  const isReady = source.processingStatus === "ready";

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(source.key);
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="group flex items-center gap-4 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700">
        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800/50">
          <FileText className="h-5 w-5 text-zinc-400" />
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {fileName}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(source.lastModified)}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={source.processingStatus} />
        </div>

        {/* Records */}
        <div className="w-24 text-right">
          {source.recordCount !== null && source.recordCount !== undefined ? (
            <p className="text-sm tabular-nums text-zinc-300">
              {source.recordCount.toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-zinc-500">-</p>
          )}
          <p className="text-xs text-zinc-500">records</p>
        </div>

        {/* Size */}
        <div className="w-20 text-right">
          <p className="text-sm tabular-nums text-zinc-300">
            {formatBytes(source.size)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isReady && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 text-zinc-400 hover:text-zinc-100"
            >
              <Link href={`/analytics?file=${encodeURIComponent(source.key)}`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-zinc-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {isReady && (
                <>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/analytics?file=${encodeURIComponent(source.key)}`}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileName}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusBadge({ status }: { status?: ProcessingStatus }) {
  const config: Record<
    ProcessingStatus,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    pending: {
      label: "Pending",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-zinc-800 text-zinc-400",
    },
    processing: {
      label: "Processing",
      icon: <Cog className="h-3 w-3 animate-spin" />,
      className: "bg-blue-500/20 text-blue-400",
    },
    ready: {
      label: "Ready",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-green-500/20 text-green-400",
    },
    error: {
      label: "Error",
      icon: <AlertCircle className="h-3 w-3" />,
      className: "bg-red-500/20 text-red-400",
    },
    legacy: {
      label: "Legacy",
      icon: <FileText className="h-3 w-3" />,
      className: "bg-zinc-800 text-zinc-400",
    },
  };

  const statusKey = status && status in config ? status : "legacy";
  const { label, icon, className } = config[statusKey];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
