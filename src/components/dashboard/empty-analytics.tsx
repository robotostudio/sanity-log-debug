import Link from "next/link";
import { BarChart3, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 py-20 text-center">
      <div className="rounded-full bg-zinc-800/50 p-4">
        <BarChart3 className="h-10 w-10 text-zinc-500" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-zinc-200">
        No data source selected
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        Select a data source from the Sources page to view analytics and explore
        your Sanity API logs.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/sources">
          <Database className="mr-2 h-4 w-4" />
          Go to Sources
        </Link>
      </Button>
    </div>
  );
}
