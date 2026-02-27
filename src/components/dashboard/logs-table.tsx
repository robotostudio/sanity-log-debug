"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { List } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiFetcher } from "@/lib/api-client";
import { formatBytes, formatDuration } from "@/lib/constants";
import { useFileKeyContext } from "@/lib/hooks/use-file-key-context";
import { useFilters } from "@/lib/hooks/use-filters";
import { useSelectedFile } from "@/lib/hooks/use-selected-file";
import { logKeys } from "@/lib/query-keys";
import type { LogRecord } from "@/lib/types";
import { LogDetailSheet } from "./log-detail-sheet";
import { SeverityBadge, StatusBadge } from "./status-badge";

interface LogsResponse {
  data: LogRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SORT_COLUMNS = [
  "timestamp",
  "method",
  "status",
  "endpoint",
  "duration",
  "responseSize",
] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];

function CardWrapper({
  children,
  total,
}: {
  children: React.ReactNode;
  total?: number;
}) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Log Entries
            {total !== undefined ? (
              <span className="ml-2 font-mono text-zinc-500">
                ({total.toLocaleString()} total)
              </span>
            ) : null}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LogsTableEmpty() {
  return (
    <CardWrapper>
      <StateContainer
        icon={<List className="h-6 w-6 text-zinc-500" />}
        title="No log entries"
        description="Select a log file to view detailed entries"
        className="h-72 py-0"
      />
    </CardWrapper>
  );
}

function LogsTableLoading() {
  return (
    <CardWrapper>
      <div className="space-y-2">
        {["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10"].map(
          (id) => (
            <Skeleton key={id} className="h-8 w-full" />
          ),
        )}
      </div>
    </CardWrapper>
  );
}

interface LogsTableDataProps {
  selectedFile: string;
  queryString: string;
  isActive: boolean;
}

/**
 * Logs table data component. Uses key prop pattern to reset pagination
 * when filters change - parent passes key={queryString} to trigger reset.
 */
function LogsTableData({ selectedFile, queryString, isActive }: LogsTableDataProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortColumn>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedRecord, setSelectedRecord] = useState<LogRecord | null>(null);

  const params = new URLSearchParams(queryString);
  params.set("page", String(page));
  params.set("pageSize", "50");
  params.set("sortBy", sortBy);
  params.set("sortDir", sortDir);
  params.set("fileKey", selectedFile);

  const paramsObj = Object.fromEntries(params.entries());

  const { data, isPending } = useQuery({
    queryKey: logKeys.list(paramsObj),
    queryFn: ({ signal }) =>
      apiFetcher<LogsResponse>(`/api/logs?${params.toString()}`, signal),
    enabled: isActive,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const handleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const SortHeader = ({
    col,
    children,
  }: {
    col: SortColumn;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none text-xs text-zinc-500 hover:text-zinc-300"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortBy === col ? (
          <span className="text-zinc-400">
            {sortDir === "asc" ? "\u2191" : "\u2193"}
          </span>
        ) : null}
      </span>
    </TableHead>
  );

  if (isPending && !data) {
    return <LogsTableLoading />;
  }

  return (
    <CardWrapper total={data?.total}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <SortHeader col="timestamp">Time</SortHeader>
              <SortHeader col="method">Method</SortHeader>
              <SortHeader col="status">Status</SortHeader>
              <TableHead className="text-xs text-zinc-500">Severity</TableHead>
              <SortHeader col="endpoint">Endpoint</SortHeader>
              <TableHead className="text-xs text-zinc-500">Domain</TableHead>
              <SortHeader col="duration">Duration</SortHeader>
              <SortHeader col="responseSize">Size</SortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((record) => {
              const durationColor =
                record.body.duration > 1000
                  ? "text-red-400"
                  : record.body.duration > 200
                    ? "text-amber-400"
                    : "text-zinc-300";
              return (
                <TableRow
                  key={`${record.body.insertId}-${record.traceId}`}
                  className="cursor-pointer border-zinc-800/50 hover:bg-zinc-800/40"
                  onClick={() => setSelectedRecord(record)}
                >
                  <TableCell className="font-mono text-xs text-zinc-400">
                    {format(parseISO(record.timestamp), "MM/dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-300">
                    {record.body.method}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.body.status} />
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={record.severityText} />
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">
                    {record.attributes.sanity.endpoint}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {record.attributes.sanity.domain}
                  </TableCell>
                  <TableCell className={`font-mono text-xs ${durationColor}`}>
                    {formatDuration(record.body.duration)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-400">
                    {formatBytes(record.body.responseSize)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-zinc-700 text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-zinc-700 text-xs"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <LogDetailSheet
        record={selectedRecord}
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </CardWrapper>
  );
}

export function LogsTable({ isActive = true }: { isActive?: boolean }) {
  const contextFileKey = useFileKeyContext();
  const { selectedFile: urlFile } = useSelectedFile();
  const { queryString } = useFilters();

  const selectedFile = contextFileKey ?? urlFile;

  if (!selectedFile) {
    return <LogsTableEmpty />;
  }

  return (
    <LogsTableData
      key={queryString}
      selectedFile={selectedFile}
      queryString={queryString}
      isActive={isActive}
    />
  );
}
