"use client";

import { BarChart3, PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS, getStatusColor } from "@/lib/constants";
import type { DistributionItem } from "@/lib/types";
import { useDashboard } from "./data-state";

// ============================================================================
// Shared Components
// ============================================================================

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartEmpty({
  title,
  icon: Icon,
  height = "h-[300px]",
}: {
  title: string;
  icon: typeof BarChart3;
  height?: string;
}) {
  return (
    <div
      className={`flex ${height} flex-col items-center justify-center text-center`}
    >
      <Icon className="mb-3 h-10 w-10 text-zinc-700" />
      <p className="text-sm text-zinc-500">No {title.toLowerCase()} data</p>
      <p className="mt-1 text-xs text-zinc-600">Select a log file to view</p>
    </div>
  );
}

function ChartLoading({ height = "h-[300px]" }: { height?: string }) {
  return <Skeleton className={`w-full ${height}`} />;
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DistributionItem }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2 text-xs shadow-lg">
      <p className="font-mono text-zinc-100">{d.name}</p>
      <p className="text-zinc-400">
        Count: <span className="text-zinc-100">{d.count.toLocaleString()}</span>
      </p>
      {d.avgDuration !== undefined ? (
        <p className="text-zinc-400">
          Avg:{" "}
          <span className="text-zinc-100">{d.avgDuration.toFixed(1)}ms</span>
        </p>
      ) : null}
    </div>
  );
}

// ============================================================================
// Status Distribution
// ============================================================================

function StatusDistributionData({ data }: { data: DistributionItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          type="number"
          stroke="#52525b"
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#52525b"
          tick={{ fontSize: 10, fill: "#71717a", fontFamily: "monospace" }}
          width={40}
        />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={getStatusColor(Number.parseInt(entry.name, 10))}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusDistribution() {
  const { state } = useDashboard();

  const content = (() => {
    if (state.status === "empty") {
      return <ChartEmpty title="Status codes" icon={BarChart3} />;
    }
    if (state.status === "loading") {
      return <ChartLoading />;
    }
    if (state.status === "error" || !state.data?.statusDistribution) {
      return <ChartEmpty title="Status codes" icon={BarChart3} />;
    }
    return <StatusDistributionData data={state.data.statusDistribution} />;
  })();

  return <ChartCard title="Status Code Distribution">{content}</ChartCard>;
}

// ============================================================================
// Endpoint Distribution
// ============================================================================

function EndpointDistributionData({ data }: { data: DistributionItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          type="number"
          stroke="#52525b"
          tick={{ fontSize: 10, fill: "#71717a" }}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#52525b"
          tick={{ fontSize: 10, fill: "#71717a" }}
          width={70}
        />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="count" isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EndpointDistribution() {
  const { state } = useDashboard();

  const content = (() => {
    if (state.status === "empty") {
      return <ChartEmpty title="Endpoints" icon={BarChart3} />;
    }
    if (state.status === "loading") {
      return <ChartLoading />;
    }
    if (state.status === "error" || !state.data?.endpointDistribution) {
      return <ChartEmpty title="Endpoints" icon={BarChart3} />;
    }
    return <EndpointDistributionData data={state.data.endpointDistribution} />;
  })();

  return <ChartCard title="Top Endpoints">{content}</ChartCard>;
}

// ============================================================================
// Donut Chart
// ============================================================================

const RADIAN = Math.PI / 180;

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  percent: number;
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#a1a1aa"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

function DonutChartData({ data }: { data: DistributionItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="name"
          label={renderCustomLabel}
          isAnimationActive={false}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.8}
            />
          ))}
        </Pie>
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
      </PieChart>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  dataKey: "domainDistribution" | "methodDistribution";
  title: string;
}

export function DonutChart({ dataKey, title }: DonutChartProps) {
  const { state } = useDashboard();

  const content = (() => {
    if (state.status === "empty") {
      return (
        <ChartEmpty title={title} icon={PieChartIcon} height="h-[250px]" />
      );
    }
    if (state.status === "loading") {
      return <ChartLoading height="h-[250px]" />;
    }
    const data = state.data?.[dataKey];
    if (state.status === "error" || !data) {
      return (
        <ChartEmpty title={title} icon={PieChartIcon} height="h-[250px]" />
      );
    }
    return <DonutChartData data={data} />;
  })();

  return <ChartCard title={title}>{content}</ChartCard>;
}
