"use client";

import { ArrowDown, ArrowUp, BarChart3, TriangleAlert } from "lucide-react";
import { AsyncState } from "@/components/ui/async-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/constants";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import type { KpiData, TimeSeriesBucket } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Trend helpers
// ============================================================================

type Trend = "up" | "down" | "flat";

function computeTrend(data: number[]): { trend: Trend; pct: number } {
  if (data.length < 4) return { trend: "flat", pct: 0 };
  const mid = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, mid);
  const secondHalf = data.slice(mid);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const a = avg(firstHalf);
  const b = avg(secondHalf);
  if (a === 0) return { trend: "flat", pct: 0 };
  const pct = ((b - a) / a) * 100;
  if (Math.abs(pct) < 3) return { trend: "flat", pct: 0 };
  return { trend: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

function TrendBadge({
  trend,
  pct,
  invertColor = false,
}: {
  trend: Trend;
  pct: number;
  invertColor?: boolean;
}) {
  if (trend === "flat") return null;
  const isGood = invertColor ? trend === "up" : trend === "down";
  const color = isGood ? "text-emerald-400" : "text-red-400";
  const Icon = trend === "up" ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        color,
      )}
    >
      <Icon className="h-3 w-3" />
      {pct.toFixed(0)}%
    </span>
  );
}

// ============================================================================
// KPI Card Component
// ============================================================================

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { trend: Trend; pct: number };
  invertTrendColor?: boolean;
  anomaly?: string;
}

function KpiCard({
  title,
  value,
  subtitle,
  trend,
  invertTrendColor,
  anomaly,
}: KpiCardProps) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-medium text-zinc-100">
          {value}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-zinc-500">{subtitle ?? "\u00A0"}</p>
          <div className="flex items-center gap-2">
            {anomaly && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                <TriangleAlert className="h-3 w-3" />
                {anomaly}
              </span>
            )}
            {trend && (
              <TrendBadge
                trend={trend.trend}
                pct={trend.pct}
                invertColor={invertTrendColor}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function KpiCardSkeleton() {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <Skeleton className="h-3 w-20" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-2 h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function KpiCardsLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {KPI_LABELS.map((label) => (
        <KpiCardSkeleton key={label} />
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

const KPI_LABELS = ["Requests", "Avg Duration", "Error Rate", "P95", "P99"];

function KpiCardsEmpty() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {KPI_LABELS.map((label) => (
        <Card key={label} className="border-zinc-800 bg-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-zinc-600">
              <BarChart3 className="h-5 w-5" />
              <span className="font-mono text-lg">--</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Anomaly detection
// ============================================================================

function detectP99Anomaly(kpis: KpiData): string | undefined {
  if (kpis.p95Latency > 0 && kpis.p99Latency / kpis.p95Latency > 3) {
    return `${(kpis.p99Latency / kpis.p95Latency).toFixed(0)}× P95`;
  }
  if (kpis.p99Latency > 5000) {
    return "Unusually high";
  }
  return undefined;
}

function detectErrorAnomaly(kpis: KpiData): string | undefined {
  if (kpis.errorRate > 10) {
    return "Above 10%";
  }
  return undefined;
}

// ============================================================================
// Data State
// ============================================================================

function KpiCardsData({
  data,
  timeSeries,
}: {
  data: KpiData;
  timeSeries: TimeSeriesBucket[];
}) {
  const requestSpark = timeSeries.map((b) => b.info + b.warn + b.error);
  const durationSpark = timeSeries.map((b) => b.avgDuration);
  const errorSpark = timeSeries.map((b) => b.error);

  const requestTrend = computeTrend(requestSpark);
  const durationTrend = computeTrend(durationSpark);
  const errorTrend = computeTrend(errorSpark);

  const p99Anomaly = detectP99Anomaly(data);
  const errorAnomaly = detectErrorAnomaly(data);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        title="Total Requests"
        value={data.totalRequests.toLocaleString()}
        subtitle={`${data.requestsPerHour.toFixed(0)} req/hr avg`}
        trend={requestTrend}
        invertTrendColor
      />
      <KpiCard
        title="Avg Duration"
        value={formatDuration(data.avgDuration)}
        subtitle={`P50: ${formatDuration(data.p50Latency)}`}
        trend={durationTrend}
      />
      <KpiCard
        title="Error Rate"
        value={`${data.errorRate.toFixed(2)}%`}
        subtitle={`${Math.round((data.totalRequests * data.errorRate) / 100).toLocaleString()} errors`}
        trend={errorTrend}
        anomaly={errorAnomaly}
      />
      <KpiCard
        title="P95 Latency"
        value={formatDuration(data.p95Latency)}
        subtitle={`Avg: ${formatDuration(data.avgDuration)}`}
      />
      <KpiCard
        title="P99 Latency"
        value={formatDuration(data.p99Latency)}
        subtitle={`P95: ${formatDuration(data.p95Latency)}`}
        anomaly={p99Anomaly}
      />
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function KpiCards() {
  const state = useDashboardData();

  return (
    <AsyncState
      status={state.status}
      data={state.data?.kpis ?? null}
      empty={<KpiCardsEmpty />}
      loading={<KpiCardsLoading />}
    >
      {(kpis) => (
        <KpiCardsData data={kpis} timeSeries={state.data?.timeSeries ?? []} />
      )}
    </AsyncState>
  );
}
