"use client";

import { AlertCircle } from "lucide-react";
import { use } from "react";
import spinners from "unicode-animations";
import {
  DonutChart,
  EndpointDistribution,
  StatusDistribution,
} from "@/components/dashboard/distribution-charts";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { LatencyHistogram } from "@/components/dashboard/latency-histogram";
import { LogsTable } from "@/components/dashboard/logs-table";
import { QueryExplorer } from "@/components/dashboard/query-explorer";
import { SlowestRequests } from "@/components/dashboard/slowest-requests";
import { TimeSeriesChart } from "@/components/dashboard/time-series-chart";
import { StateContainer } from "@/components/ui/state-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnicodeSpinner } from "@/components/ui/unicode-spinner";
import { FileKeyProvider } from "@/lib/hooks/use-file-key-context";
import { SourceDetailHeader } from "./source-detail-header";
import { useSourceDetail } from "./use-source-detail";

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

function AnalyticsTabContent() {
  return (
    <div className="space-y-4">
      <FilterBar />
      <div className="pt-2" />
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
    </div>
  );
}

function LogsTabContent() {
  return (
    <div className="space-y-4">
      <FilterBar />
      <div className="pt-2" />
      <LogsTable />
    </div>
  );
}

export function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = use(params);
  const {
    source,
    isLoading,
    error,
    isDeleting,
    deleteSource,
    isRetrying,
    retrySource,
  } = useSourceDetail(id);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <UnicodeSpinner
          animation={spinners.braille}
          size="xl"
          className="text-zinc-500"
          label="Loading source"
        />
      </div>
    );
  }

  if (error || !source) {
    return (
      <StateContainer
        icon={<AlertCircle className="h-6 w-6 text-red-400" />}
        iconBg="bg-red-500/10"
        title="Source not found"
        description={
          error?.message ?? "The source you're looking for doesn't exist."
        }
        className="flex-1 py-24"
      />
    );
  }

  const isReady = source.processingStatus === "ready";
  const isFailed =
    source.processingStatus === "failed" || source.processingStatus === "error";

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SourceDetailHeader
        source={source}
        onDelete={deleteSource}
        isDeleting={isDeleting}
        onRetry={retrySource}
        isRetrying={isRetrying}
      />

      {isReady ? (
        <FileKeyProvider fileKey={source.key}>
          <Tabs defaultValue="analytics">
            <TabsList
              variant="line"
              className="-mx-6 w-[calc(100%+46px)] border-b border-zinc-800 pl-4 pr-6 pb-0"
            >
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="pt-6">
              <AnalyticsTabContent />
            </TabsContent>

            <TabsContent value="logs" className="pt-6">
              <LogsTabContent />
            </TabsContent>
          </Tabs>
        </FileKeyProvider>
      ) : isFailed ? (
        <StateContainer
          variant="card"
          icon={<AlertCircle className="h-6 w-6 text-red-400" />}
          iconBg="bg-red-500/10"
          title="Processing failed"
          description={
            source.errorMessage ??
            "An error occurred during processing. You can retry from the menu above."
          }
        />
      ) : (
        <StateContainer
          variant="card"
          icon={
            <UnicodeSpinner
              animation={spinners.dna}
              size="xl"
              className="text-zinc-400"
              label="Processing source"
            />
          }
          title="Processing source"
          description="Analytics will be available once processing is complete."
        />
      )}
    </div>
  );
}
