"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/constants";
import { useFilters } from "@/lib/hooks/use-filters";
import type { Aggregations } from "@/lib/types";
import {
  DonutChart,
  EndpointDistribution,
  StatusDistribution,
} from "./distribution-charts";
import { FilterBar } from "./filter-bar";
import { KpiCards } from "./kpi-cards";
import { LatencyHistogram } from "./latency-histogram";
import { LogsTable } from "./logs-table";
import { QueryExplorer } from "./query-explorer";
import { StatusBadge } from "./status-badge";
import { TimeSeriesChart } from "./time-series-chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DashboardShell() {
  const { queryString } = useFilters();

  const aggUrl = queryString
    ? `/api/logs/aggregations?${queryString}`
    : "/api/logs/aggregations";

  const { data: agg } = useSWR<Aggregations>(aggUrl, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-mono text-lg font-bold tracking-tight text-zinc-100">
                Sanity API Logs
              </h1>
              <p className="font-mono text-xs text-zinc-500">
                kn0uy6kh &middot; Jan 21 &ndash; Jan 28, 2026
                {agg && (
                  <span className="ml-2">
                    &middot; {agg.totalFiltered.toLocaleString()} records
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <FilterBar />

        <KpiCards data={agg?.kpis ?? null} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TimeSeriesChart data={agg?.timeSeries ?? null} />
          </div>
          <StatusDistribution data={agg?.statusDistribution ?? null} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <EndpointDistribution data={agg?.endpointDistribution ?? null} />
          <DonutChart
            data={agg?.domainDistribution ?? null}
            title="By Domain"
          />
          <DonutChart
            data={agg?.methodDistribution ?? null}
            title="By Method"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LatencyHistogram data={agg?.latencyBuckets ?? null} />

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                Top 20 Slowest Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-xs text-zinc-500">
                        Duration
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Method
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Status
                      </TableHead>
                      <TableHead className="text-xs text-zinc-500">
                        Endpoint
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agg?.topSlowRequests.map((r) => (
                      <TableRow
                        key={r.traceId}
                        className="border-zinc-800/50 hover:bg-zinc-800/40"
                      >
                        <TableCell className="font-mono text-xs text-red-400">
                          {formatDuration(r.duration)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-300">
                          {r.method}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400">
                          {r.endpoint}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <QueryExplorer data={agg?.queryExplorer ?? null} />

        <LogsTable queryString={queryString} />
      </main>
    </div>
  );
}
