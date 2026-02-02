"use client";

import { Gauge } from "lucide-react";
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
import { formatDuration } from "@/lib/constants";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { StatusBadge } from "./status-badge";

// ============================================================================
// Types
// ============================================================================

interface SlowRequest {
  traceId: string;
  url: string;
  duration: number;
  method: string;
  status: number;
  endpoint: string;
  timestamp: string;
}

// ============================================================================
// Card Wrapper
// ============================================================================

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Top 20 Slowest Requests
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function SlowestRequestsEmpty() {
  return (
    <CardWrapper>
      <StateContainer
        icon={<Gauge className="h-6 w-6 text-zinc-500" />}
        title="No request data"
        description="Select a log file to view slow requests"
        className="h-72 py-0"
      />
    </CardWrapper>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function SlowestRequestsLoading() {
  return (
    <CardWrapper>
      <div className="space-y-2">
        {["r1", "r2", "r3", "r4", "r5"].map((id) => (
          <Skeleton key={id} className="h-8 w-full" />
        ))}
      </div>
    </CardWrapper>
  );
}

// ============================================================================
// Data State
// ============================================================================

function SlowestRequestsData({ data }: { data: SlowRequest[] }) {
  return (
    <CardWrapper>
      <div className="max-h-72 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs text-zinc-500">Duration</TableHead>
              <TableHead className="text-xs text-zinc-500">Method</TableHead>
              <TableHead className="text-xs text-zinc-500">Status</TableHead>
              <TableHead className="text-xs text-zinc-500">Endpoint</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow
                key={r.traceId}
                className="border-zinc-800/50 hover:bg-zinc-800/40"
              >
                <TableCell className="font-mono text-xs text-red-400">
                  {formatDuration(r.duration)}
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-300">
                  {r.method}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-xs text-zinc-400">
                  {r.endpoint}
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

export function SlowestRequests() {
  const state = useDashboardData();

  if (state.status === "empty") {
    return <SlowestRequestsEmpty />;
  }

  if (state.status === "loading") {
    return <SlowestRequestsLoading />;
  }

  if (state.status === "error" || !state.data?.topSlowRequests) {
    return <SlowestRequestsEmpty />;
  }

  return <SlowestRequestsData data={state.data.topSlowRequests} />;
}
