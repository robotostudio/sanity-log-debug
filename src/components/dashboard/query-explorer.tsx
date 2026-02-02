"use client";

import { Database } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { formatDuration } from "@/lib/constants";
import { useDashboard } from "./data-state";

// ============================================================================
// Types
// ============================================================================

interface QueryData {
  groqId: string;
  count: number;
  avgDuration: number;
  p99Duration: number;
  endpoint: string;
}

// ============================================================================
// Card Wrapper
// ============================================================================

function CardWrapper({
  children,
  searchValue,
  onSearchChange,
  showSearch,
}: {
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-400">
            GROQ Query Explorer
          </CardTitle>
          {showSearch ? (
            <Input
              placeholder="Filter query ID..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-7 w-48 border-zinc-800 bg-transparent dark:bg-transparent text-xs text-zinc-300 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-500"
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function QueryExplorerEmpty() {
  return (
    <CardWrapper>
      <StateContainer
        icon={<Database className="h-6 w-6 text-zinc-500" />}
        title="No query data"
        description="Select a log file to explore GROQ queries"
        className="h-[200px] py-0"
      />
    </CardWrapper>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function QueryExplorerLoading() {
  return (
    <CardWrapper>
      <div className="space-y-2">
        {["q1", "q2", "q3", "q4", "q5"].map((id) => (
          <Skeleton key={id} className="h-8 w-full" />
        ))}
      </div>
    </CardWrapper>
  );
}

// ============================================================================
// Data State
// ============================================================================

function QueryExplorerData({ data }: { data: QueryData[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter((q) => q.groqId.toLowerCase().includes(s));
  }, [data, search]);

  return (
    <CardWrapper showSearch searchValue={search} onSearchChange={setSearch}>
      <div className="max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs text-zinc-500">Query ID</TableHead>
              <TableHead className="text-right text-xs text-zinc-500">
                Count
              </TableHead>
              <TableHead className="text-right text-xs text-zinc-500">
                Avg Duration
              </TableHead>
              <TableHead className="text-right text-xs text-zinc-500">
                P99 Duration
              </TableHead>
              <TableHead className="text-xs text-zinc-500">Endpoint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((q) => (
              <TableRow
                key={q.groqId}
                className="border-zinc-800 hover:bg-zinc-800/50"
              >
                <TableCell className="font-mono text-xs text-zinc-300">
                  {q.groqId}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-300">
                  {q.count.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-300">
                  {formatDuration(q.avgDuration)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-zinc-300">
                  {formatDuration(q.p99Duration)}
                </TableCell>
                <TableCell className="text-xs text-zinc-400">
                  {q.endpoint}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardWrapper>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function QueryExplorer() {
  const { state } = useDashboard();

  if (state.status === "empty") {
    return <QueryExplorerEmpty />;
  }

  if (state.status === "loading") {
    return <QueryExplorerLoading />;
  }

  if (state.status === "error" || !state.data?.queryExplorer) {
    return <QueryExplorerEmpty />;
  }

  return <QueryExplorerData data={state.data.queryExplorer} />;
}
