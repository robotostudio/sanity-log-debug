"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/constants";
import type { KpiData } from "@/lib/types";

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-bold text-zinc-100">
          {value}
        </div>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export function KpiCards({ data }: { data: KpiData | null }) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {["kpi-1", "kpi-2", "kpi-3", "kpi-4", "kpi-5"].map((id) => (
          <Card key={id} className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        title="Total Requests"
        value={data.totalRequests.toLocaleString()}
        subtitle={`${data.requestsPerHour.toFixed(0)} req/hr avg`}
      />
      <KpiCard title="Avg Duration" value={formatDuration(data.avgDuration)} />
      <KpiCard
        title="Error Rate"
        value={`${data.errorRate.toFixed(2)}%`}
        subtitle={`${Math.round((data.totalRequests * data.errorRate) / 100).toLocaleString()} errors`}
      />
      <KpiCard
        title="P95 Latency"
        value={formatDuration(data.p95Latency)}
        subtitle={`P50: ${formatDuration(data.p50Latency)}`}
      />
      <KpiCard title="P99 Latency" value={formatDuration(data.p99Latency)} />
    </div>
  );
}
