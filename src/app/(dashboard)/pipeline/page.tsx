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
const TABLE_SKELETON_IDS = [
  "tskel-0",
  "tskel-1",
  "tskel-2",
  "tskel-3",
  "tskel-4",
];

function PipelineSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton matching PageHeader structure */}
      <div className="shrink-0">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-800/50" />
        <div className="mt-8 h-9 w-32 animate-pulse rounded bg-zinc-800/50" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PIPELINE_SKELETON_IDS.map((id) => (
          <div
            key={id}
            className="h-24 animate-pulse rounded-xl border border-zinc-800 bg-transparent"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        {TABLE_SKELETON_IDS.map((id) => (
          <div
            key={id}
            className="border-b border-zinc-800 px-4 py-3.5 last:border-b-0"
          >
            <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
