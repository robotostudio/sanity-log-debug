"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LATENCY_BUCKETS } from "@/lib/constants";
import type { DistributionItem } from "@/lib/types";

export function LatencyHistogram({
  data,
}: {
  data: DistributionItem[] | null;
}) {
  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">
            Latency Distribution
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
          Latency Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              {data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={LATENCY_BUCKETS[i]?.color ?? "#6b7280"}
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
