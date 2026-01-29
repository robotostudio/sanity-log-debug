import { Database } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-zinc-800/50 p-4">
        <Database className="h-8 w-8 text-zinc-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-zinc-300">
        No data sources
      </h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Upload your first .ndjson file to start analyzing your Sanity API logs.
      </p>
    </div>
  );
}
