import { Suspense } from "react";
import { SourcesPage } from "@/components/sources";

export const metadata = {
  title: "Sources | Sanity API Logs",
  description: "Upload and manage your data sources",
};

export default function SourcesPageRoute() {
  return (
    <Suspense fallback={<SourcesSkeleton />}>
      <SourcesPage />
    </Suspense>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-32 bg-zinc-800/50 animate-pulse rounded" />
        <div className="mt-2 h-4 w-64 bg-zinc-800/50 animate-pulse rounded" />
      </div>

      {/* Upload zone skeleton */}
      <div className="h-48 rounded-xl bg-zinc-800/50 animate-pulse" />

      {/* List skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-32 bg-zinc-800/50 animate-pulse rounded" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
