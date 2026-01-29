"use client";

import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useDashboard } from "./data-state";
import {
  DonutChart,
  EndpointDistribution,
  StatusDistribution,
} from "./distribution-charts";
import { EmptyAnalytics } from "./empty-analytics";
import { FilterBar } from "./filter-bar";
import { KpiCards } from "./kpi-cards";
import { LatencyHistogram } from "./latency-histogram";
import { LogsTable } from "./logs-table";
import { QueryExplorer } from "./query-explorer";
import { SlowestRequests } from "./slowest-requests";
import { TimeSeriesChart } from "./time-series-chart";

export function AnalyticsContent() {
  const { state } = useDashboard();

  // Show empty state when no file is selected
  if (state.status === "empty") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Select a data source to view analytics"
        />
        <EmptyAnalytics />
      </div>
    );
  }

  // Show error state when data fails to load
  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Failed to load analytics data"
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-zinc-100">
            Error Loading Data
          </h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-md">
            {state.error ??
              "An unexpected error occurred while loading the analytics data."}
          </p>
        </div>
      </div>
    );
  }

  const recordCount = state.data?.totalFiltered ?? 0;
  const description =
    state.status === "loading"
      ? "Loading data..."
      : `${recordCount.toLocaleString()} records`;

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics" description={description} />

      <FilterBar />

      <KpiCards />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimeSeriesChart />
        </div>
        <StatusDistribution />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <EndpointDistribution />
        <DonutChart dataKey="domainDistribution" title="By Domain" />
        <DonutChart dataKey="methodDistribution" title="By Method" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LatencyHistogram />
        <SlowestRequests />
      </div>

      <QueryExplorer />

      <LogsTable />
    </div>
  );
}
