"use client";

import { format, parseISO } from "date-fns";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AsyncState } from "@/components/ui/async-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateContainer } from "@/components/ui/state-container";
import { SEVERITY_COLORS } from "@/lib/constants";
import type { TimeSeriesBucket } from "@/lib/types";
import {
  ANIMATION_DEFAULTS,
  AreaGradientDefs,
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  ChartTooltipWrapper,
  GRID_PROPS,
  TooltipDot,
} from "./chart-config";
import { useDashboard } from "./data-state";

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload) return null;
  return (
    <ChartTooltipWrapper>
      <p className="mb-1.5 font-mono text-zinc-400">
        {label
          ? (() => {
              try {
                return format(parseISO(label), "MMM d, HH:mm");
              } catch {
                return label;
              }
            })()
          : ""}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <TooltipDot color={p.color} />
          <span className="text-zinc-300">{p.dataKey.toUpperCase()}</span>
          <span className="ml-auto font-mono text-zinc-100">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </ChartTooltipWrapper>
  );
}

// ============================================================================
// Chart Card Wrapper
// ============================================================================

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Requests Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function TimeSeriesEmpty() {
  return (
    <ChartCard>
      <StateContainer
        icon={<TrendingUp className="h-6 w-6 text-zinc-500" />}
        title="No time series data"
        description="Select a log file to view request trends"
        className="h-72 py-0"
      />
    </ChartCard>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function TimeSeriesLoading() {
  return (
    <ChartCard>
      <Skeleton className="h-72 w-full" />
    </ChartCard>
  );
}

// ============================================================================
// Data State
// ============================================================================

function TimeSeriesData({ data }: { data: TimeSeriesBucket[] }) {
  return (
    <ChartCard>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <AreaGradientDefs />
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="hour"
            tickFormatter={(v) => {
              try {
                return format(parseISO(v), "M/d HH:mm");
              } catch {
                return v;
              }
            }}
            stroke={AXIS_STROKE}
            tick={AXIS_TICK_STYLE}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            stroke={AXIS_STROKE}
            tick={AXIS_TICK_STYLE}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <Tooltip
            content={<CustomTooltip />}
            isAnimationActive={false}
            cursor={{ stroke: "#52525b", strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="error"
            stackId="1"
            stroke={SEVERITY_COLORS.ERROR}
            fill="url(#gradient-error)"
            {...ANIMATION_DEFAULTS}
            activeDot={{
              r: 4,
              fill: SEVERITY_COLORS.ERROR,
              stroke: "#18181b",
              strokeWidth: 2,
            }}
          />
          <Area
            type="monotone"
            dataKey="warn"
            stackId="1"
            stroke={SEVERITY_COLORS.WARN}
            fill="url(#gradient-warn)"
            {...ANIMATION_DEFAULTS}
            activeDot={{
              r: 4,
              fill: SEVERITY_COLORS.WARN,
              stroke: "#18181b",
              strokeWidth: 2,
            }}
          />
          <Area
            type="monotone"
            dataKey="info"
            stackId="1"
            stroke={SEVERITY_COLORS.INFO}
            fill="url(#gradient-info)"
            {...ANIMATION_DEFAULTS}
            activeDot={{
              r: 4,
              fill: SEVERITY_COLORS.INFO,
              stroke: "#18181b",
              strokeWidth: 2,
            }}
          />
          <Brush
            dataKey="hour"
            height={28}
            stroke="#3f3f46"
            fill="#0a0a0a"
            travellerWidth={10}
            tickFormatter={(v) => {
              try {
                return format(parseISO(v), "M/d");
              } catch {
                return "";
              }
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function TimeSeriesChart() {
  const { state } = useDashboard();

  return (
    <AsyncState
      status={state.status}
      data={state.data?.timeSeries ?? null}
      empty={<TimeSeriesEmpty />}
      loading={<TimeSeriesLoading />}
    >
      {(data) => <TimeSeriesData data={data} />}
    </AsyncState>
  );
}
