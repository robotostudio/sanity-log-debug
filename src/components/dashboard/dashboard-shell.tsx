"use client";

import { DashboardProvider, useDashboard } from "./data-state";
import {
  DonutChart,
  EndpointDistribution,
  StatusDistribution,
} from "./distribution-charts";
import { FileManagerDefault } from "./file-manager";
import { FilterBar } from "./filter-bar";
import { KpiCards } from "./kpi-cards";
import { LatencyHistogram } from "./latency-histogram";
import { LogsTable } from "./logs-table";
import { QueryExplorer } from "./query-explorer";
import { SlowestRequests } from "./slowest-requests";
import { TimeSeriesChart } from "./time-series-chart";

// ============================================================================
// Header Component
// ============================================================================

function DashboardHeader() {
  const { state, actions } = useDashboard();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-tight text-zinc-100">
              Sanity API Logs
            </h1>
            <p className="font-mono text-xs text-zinc-500">
              {state.data ? (
                <span>{state.data.totalFiltered.toLocaleString()} records</span>
              ) : (
                <span>No file selected</span>
              )}
            </p>
          </div>
          <FileManagerDefault
            selectedFile={state.selectedFile}
            onSelectFile={actions.selectFile}
          />
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Dashboard Content
// ============================================================================

function DashboardContent() {
  return (
    <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
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
    </main>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function DashboardShell() {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <DashboardHeader />
        <DashboardContent />
      </div>
    </DashboardProvider>
  );
}
