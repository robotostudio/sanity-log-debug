import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function Home() {
  return (
    <NuqsAdapter>
      <Suspense>
        <DashboardShell />
      </Suspense>
    </NuqsAdapter>
  );
}
