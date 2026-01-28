"use client";

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
      {d.avgDuration !== undefined && (
        <p className="text-zinc-400">
          Avg:{" "}
          <span className="text-zinc-100">{d.avgDuration.toFixed(1)}ms</span>
        </p>
      )}
    </div>
  );
}

export function StatusDistribution({
  data,
}: {
  data: DistributionItem[] | null;
}) {
  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Status Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Status Code Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

export function EndpointDistribution({
  data,
}: {
  data: DistributionItem[] | null;
}) {
  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          Top Endpoints
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

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

export function DonutChart({
  data,
  title,
}: {
  data: DistributionItem[] | null;
  title: string;
}) {
  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
