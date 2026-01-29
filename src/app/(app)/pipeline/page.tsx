import { Suspense } from "react";
import { PipelineContent } from "@/components/processing/pipeline-content";

export const metadata = {
  title: "Pipeline | Sanity API Logs",
  description: "Monitor file processing workflows",
};

export default function PipelinePage() {
  return (
    <Suspense fallback={<PipelineSkeleton />}>
      <PipelineContent />
    </Suspense>
  );
}

const PIPELINE_SKELETON_IDS = ["kpi-0", "kpi-1", "kpi-2", "kpi-3"];

function PipelineSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-zinc-800/50" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-800/50" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PIPELINE_SKELETON_IDS.map((id) => (
          <div
            key={id}
            className="h-24 animate-pulse rounded-xl bg-zinc-800/50"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="h-64 animate-pulse rounded-xl bg-zinc-800/50" />
    </div>
  );
}
