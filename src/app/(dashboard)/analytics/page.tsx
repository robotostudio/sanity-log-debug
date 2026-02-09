import { Suspense } from "react";
import { AnalyticsContent } from "@/components/dashboard/analytics-content";

export const metadata = {
  title: "Analytics | Sanity API Logs",
  description: "Operational dashboard for Sanity API request logs",
};

const SKELETON_IDS = ["skeleton-0", "skeleton-1", "skeleton-2", "skeleton-3"];

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-32 bg-zinc-800/50 animate-pulse rounded" />
        <div className="mt-2 h-4 w-48 bg-zinc-800/50 animate-pulse rounded" />
      </div>

      {/* Filter bar skeleton */}
      <div className="h-12 rounded-lg bg-zinc-800/50 animate-pulse" />

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SKELETON_IDS.map((id) => (
          <div
            key={id}
            className="h-24 rounded-xl bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 h-80 rounded-xl bg-zinc-800/50 animate-pulse" />
        <div className="h-80 rounded-xl bg-zinc-800/50 animate-pulse" />
      </div>
    </div>
  );
}
