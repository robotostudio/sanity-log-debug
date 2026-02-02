"use client";

import { Clock } from "lucide-react";
import { useState } from "react";
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
import { StateContainer } from "@/components/ui/state-container";
import { LATENCY_BUCKETS } from "@/lib/constants";
import type { DistributionItem } from "@/lib/types";
import {
  ANIMATION_DEFAULTS,
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  ChartTooltipWrapper,
  GRID_PROPS,
} from "./chart-config";
import { useDashboard } from "./data-state";

// ============================================================================
// Chart Card Wrapper
// ============================================================================

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zinc-800 bg-transparent">
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
      <StateContainer
        icon={<Clock className="h-6 w-6 text-zinc-500" />}
        title="No latency data"
        description="Select a log file to view distribution"
        className="h-[300px] py-0"
      />
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ChartCard>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="name" stroke={AXIS_STROKE} tick={AXIS_TICK_STYLE} />
          <YAxis
            stroke={AXIS_STROKE}
            tick={AXIS_TICK_STYLE}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <Tooltip
            isAnimationActive={false}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const d = payload[0].payload as DistributionItem;
              return (
                <ChartTooltipWrapper>
                  <p className="font-mono text-zinc-100">{d.name}</p>
                  <p className="text-zinc-400">
                    {d.count.toLocaleString()} requests
                  </p>
                </ChartTooltipWrapper>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} {...ANIMATION_DEFAULTS}>
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={LATENCY_BUCKETS[i]?.color ?? "#6b7280"}
                fillOpacity={
                  activeIndex === null ? 0.8 : activeIndex === i ? 1.0 : 0.4
                }
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
                className="transition-opacity"
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
