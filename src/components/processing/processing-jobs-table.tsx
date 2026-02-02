"use client";

import { CheckCircle2, Clock, Database, Loader2, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StateContainer } from "@/components/ui/state-container";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { File } from "@/lib/db/schema";

interface ProcessingJobsTableProps {
  jobs: File[];
  loading?: boolean;
}

const SKELETON_IDS = ["skel-0", "skel-1", "skel-2", "skel-3", "skel-4"];

export function ProcessingJobsTable({
  jobs,
  loading,
}: ProcessingJobsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {SKELETON_IDS.map((id) => (
          <Skeleton key={id} className="h-12" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <StateContainer
        icon={<Database className="h-6 w-6 text-zinc-500" />}
        title="No processing jobs yet"
        description="Upload a file to get started."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">Status</TableHead>
          <TableHead>Filename</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Records</TableHead>
          <TableHead className="text-right">Uploaded</TableHead>
          <TableHead className="text-right">Processed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell>
              <StatusIcon status={job.processingStatus} />
            </TableCell>
            <TableCell className="font-medium max-w-72 truncate">
              {job.filename}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatFileSize(job.size)}
            </TableCell>
            <TableCell className="text-right">
              {job.recordCount?.toLocaleString() ?? "-"}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {formatDate(job.uploadedAt)}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {job.processedAt ? formatDate(job.processedAt) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-zinc-500" />;
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
    case "ready":
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock className="h-4 w-4 text-zinc-500" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
