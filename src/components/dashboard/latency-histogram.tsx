"use client";

import { Clock } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LATENCY_BUCKETS } from "@/lib/constants";
import type { DistributionItem } from "@/lib/types";
import { useDashboard } from "./data-state";

// ============================================================================
// Chart Card Wrapper
// ============================================================================

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Latency Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function LatencyEmpty() {
  return (
    <ChartCard>
      <div className="flex h-[300px] flex-col items-center justify-center text-center">
        <Clock className="mb-3 h-10 w-10 text-zinc-700" />
        <p className="text-sm text-zinc-500">No latency data</p>
        <p className="mt-1 text-xs text-zinc-600">
          Select a log file to view distribution
        </p>
      </div>
    </ChartCard>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LatencyLoading() {
  return (
    <ChartCard>
      <Skeleton className="h-[300px] w-full" />
    </ChartCard>
  );
}

// ============================================================================
// Data State
// ============================================================================

function LatencyData({ data }: { data: DistributionItem[] }) {
  return (
    <ChartCard>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="name"
            stroke="#52525b"
            tick={{ fontSize: 10, fill: "#71717a" }}
          />
          <YAxis
            stroke="#52525b"
            tick={{ fontSize: 10, fill: "#71717a" }}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as DistributionItem;
              return (
                <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-lg">
                  <p className="font-mono text-zinc-100">{d.name}</p>
                  <p className="text-zinc-400">
                    {d.count.toLocaleString()} requests
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={LATENCY_BUCKETS[i]?.color ?? "#6b7280"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function LatencyHistogram() {
  const { state } = useDashboard();

  if (state.status === "empty") {
    return <LatencyEmpty />;
  }

  if (state.status === "loading") {
    return <LatencyLoading />;
  }

  if (state.status === "error" || !state.data?.latencyBuckets) {
    return <LatencyEmpty />;
  }

  return <LatencyData data={state.data.latencyBuckets} />;
}
