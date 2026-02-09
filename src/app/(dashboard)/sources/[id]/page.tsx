import { Suspense } from "react";
import { SourceDetailPage } from "@/components/sources/source-detail-page";

export const metadata = {
  title: "Source Details | Sanity API Logs",
  description: "View source file details, analytics, and logs",
};

export default function SourceDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<SourceDetailSkeleton />}>
      <SourceDetailPage params={params} />
    </Suspense>
  );
}

function SourceDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Breadcrumb */}
      <div>
        <div className="h-5 w-40 animate-pulse rounded bg-zinc-800/50" />
        <div className="mt-8 flex items-center gap-3">
          <div className="h-8 w-56 animate-pulse rounded bg-zinc-800/50" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-zinc-800/50" />
        </div>
        <div className="mt-6 grid grid-cols-5 gap-x-12">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded bg-zinc-800/50" />
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-800/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-800/50" />
        <div className="h-5 w-20 animate-pulse rounded bg-zinc-800/50" />
        <div className="h-5 w-14 animate-pulse rounded bg-zinc-800/50" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="h-48 animate-pulse rounded-lg bg-zinc-800/50" />
        <div className="h-48 animate-pulse rounded-lg bg-zinc-800/50" />
      </div>
    </div>
  );
}
