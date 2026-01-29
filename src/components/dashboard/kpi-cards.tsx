"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/constants";
import type { KpiData } from "@/lib/types";
import { useDashboard } from "./data-state";

// ============================================================================
// KPI Card Component
// ============================================================================

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

function KpiCard({ title, value, subtitle }: KpiCardProps) {
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
        {subtitle ? (
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function KpiCardSkeleton() {
  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
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
        <Card key={label} className="border-zinc-800 bg-zinc-900/50">
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
// Data State
// ============================================================================

function KpiCardsData({ data }: { data: KpiData }) {
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

// ============================================================================
// Main Export
// ============================================================================

export function KpiCards() {
  const { state } = useDashboard();

  if (state.status === "empty") {
    return <KpiCardsEmpty />;
  }

  if (state.status === "loading") {
    return <KpiCardsLoading />;
  }

  if (state.status === "error" || !state.data?.kpis) {
    return <KpiCardsEmpty />;
  }

  return <KpiCardsData data={state.data.kpis} />;
}
