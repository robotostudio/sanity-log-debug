"use client";

import { BarChart3, PieChartIcon } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, getStatusColor } from "@/lib/constants";
import type { DistributionItem } from "@/lib/types";
import {
  ANIMATION_DEFAULTS,
  AXIS_STROKE,
  AXIS_TICK_STYLE,
  ChartTooltipWrapper,
  GRID_PROPS,
} from "./chart-config";
import { ChartCard, ChartEmpty, ChartLoading } from "./charts/chart-wrapper";
import { useDashboard } from "./data-state";

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
    <ChartTooltipWrapper>
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
    </ChartTooltipWrapper>
  );
}

// ============================================================================
// Status Distribution
// ============================================================================

function StatusDistributionData({ data }: { data: DistributionItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          type="number"
          stroke={AXIS_STROKE}
          tick={AXIS_TICK_STYLE}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={AXIS_STROKE}
          tick={{ ...AXIS_TICK_STYLE, fontFamily: "monospace" }}
          width={40}
        />
        <Tooltip
          content={<BarTooltip />}
          isAnimationActive={false}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="count" {...ANIMATION_DEFAULTS} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={getStatusColor(Number.parseInt(entry.name, 10))}
              fillOpacity={
                activeIndex === null ? 0.8 : activeIndex === i ? 1.0 : 0.4
              }
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid {...GRID_PROPS} />
        <XAxis
          type="number"
          stroke={AXIS_STROKE}
          tick={AXIS_TICK_STYLE}
          tickFormatter={(v) => v.toLocaleString()}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={AXIS_STROKE}
          tick={AXIS_TICK_STYLE}
          width={70}
        />
        <Tooltip
          content={<BarTooltip />}
          isAnimationActive={false}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="count" {...ANIMATION_DEFAULTS} radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={
                activeIndex === null ? 0.8 : activeIndex === i ? 1.0 : 0.4
              }
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
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
  const radius = innerRadius + (outerRadius - innerRadius) * 1.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
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
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
          stroke="none"
          dataKey="count"
          nameKey="name"
          label={renderCustomLabel}
          {...ANIMATION_DEFAULTS}
          animationBegin={100}
          activeIndex={activeIndex}
          activeShape={(props: any) => (
            <Sector
              {...props}
              outerRadius={(props.outerRadius as number) + 6}
            />
          )}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(undefined)}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.8}
            />
          ))}
        </Pie>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          fill="#f4f4f5"
          fontSize={18}
          fontWeight={600}
          fontFamily="var(--font-geist-mono)"
        >
          {total.toLocaleString()}
        </text>
        <text x="50%" y="58%" textAnchor="middle" fill="#71717a" fontSize={10}>
          total
        </text>
        <Tooltip
          isAnimationActive={false}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as DistributionItem;
            return (
              <ChartTooltipWrapper>
                <p className="font-mono text-zinc-100">{d.name}</p>
                <p className="text-zinc-400">
                  {d.count.toLocaleString()} requests
                  <span className="ml-1 text-zinc-500">
                    ({total > 0 ? ((d.count / total) * 100).toFixed(1) : 0}%)
                  </span>
                </p>
              </ChartTooltipWrapper>
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
        <ChartEmpty title={title} icon={PieChartIcon} height="h-[280px]" />
      );
    }
    if (state.status === "loading") {
      return <ChartLoading height="h-[280px]" />;
    }
    const data = state.data?.[dataKey];
    if (state.status === "error" || !data) {
      return (
        <ChartEmpty title={title} icon={PieChartIcon} height="h-[280px]" />
      );
    }
    return <DonutChartData data={data} />;
  })();

  return <ChartCard title={title}>{content}</ChartCard>;
}
