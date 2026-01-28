"use client";

import { format, parseISO } from "date-fns";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SEVERITY_COLORS } from "@/lib/constants";
import type { TimeSeriesBucket } from "@/lib/types";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-mono text-zinc-400">
        {label ? format(parseISO(label), "MMM d, HH:mm") : ""}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-zinc-300">{p.dataKey.toUpperCase()}</span>
          <span className="ml-auto font-mono text-zinc-100">
            {p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeSeriesChart({ data }: { data: TimeSeriesBucket[] | null }) {
  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">
            Requests Over Time
          </CardTitle>
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
          Requests Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="hour"
              tickFormatter={(v) => {
                try {
                  return format(parseISO(v), "M/d HH:mm");
                } catch {
                  return v;
                }
              }}
              stroke="#52525b"
              tick={{ fontSize: 10, fill: "#71717a" }}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              stroke="#52525b"
              tick={{ fontSize: 10, fill: "#71717a" }}
              tickFormatter={(v) => v.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="info"
              stackId="1"
              stroke={SEVERITY_COLORS.INFO}
              fill={SEVERITY_COLORS.INFO}
              fillOpacity={0.3}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="warn"
              stackId="1"
              stroke={SEVERITY_COLORS.WARN}
              fill={SEVERITY_COLORS.WARN}
              fillOpacity={0.4}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="error"
              stackId="1"
              stroke={SEVERITY_COLORS.ERROR}
              fill={SEVERITY_COLORS.ERROR}
              fillOpacity={0.5}
              isAnimationActive={false}
            />
            <Brush
              dataKey="hour"
              height={20}
              stroke="#52525b"
              fill="#18181b"
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
      </CardContent>
    </Card>
  );
}
