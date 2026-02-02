"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { DatabaseIconSm } from "@/components/icons";
import { PageHeader } from "@/components/layout/page-header";
import { StateContainer } from "@/components/ui/state-container";
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
      <div className="flex flex-1 flex-col">
        <PageHeader title="Analytics">
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#f4f4f5] px-[12px] py-[8px] text-[15px] font-medium leading-[20px] text-[#09090b] transition-colors hover:bg-zinc-200"
          >
            <DatabaseIconSm className="h-4 w-4" />
            Browse sources
          </Link>
        </PageHeader>
        <EmptyAnalytics />
      </div>
    );
  }

  // Show error state when data fails to load
  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <PageHeader title="Analytics">
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#f4f4f5] px-[12px] py-[8px] text-[15px] font-medium leading-[20px] text-[#09090b] transition-colors hover:bg-zinc-200"
          >
            <DatabaseIconSm className="h-4 w-4" />
            Browse sources
          </Link>
        </PageHeader>
        <StateContainer
          variant="card"
          icon={<AlertCircle className="h-6 w-6 text-red-400" />}
          iconBg="bg-red-500/10"
          title="Error Loading Data"
          description={state.error ?? "An unexpected error occurred while loading the analytics data."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Analytics">
        <Link
          href="/sources"
          className="inline-flex items-center gap-2 rounded-[8px] bg-[#f4f4f5] px-[12px] py-[8px] text-[15px] font-medium leading-[20px] text-[#09090b] transition-colors hover:bg-zinc-200"
        >
          <DatabaseIconSm className="h-4 w-4" />
          Browse sources
        </Link>
      </PageHeader>

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
