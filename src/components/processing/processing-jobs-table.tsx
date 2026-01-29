"use client";

import { CheckCircle2, Clock, Cog, XCircle } from "lucide-react";
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

export function ProcessingJobsTable({
  jobs,
  loading,
}: ProcessingJobsTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No processing jobs yet. Upload a file to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]">Status</TableHead>
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
            <TableCell className="font-medium max-w-[300px] truncate">
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
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "processing":
      return <Cog className="h-4 w-4 text-blue-500 animate-spin" />;
    case "ready":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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
