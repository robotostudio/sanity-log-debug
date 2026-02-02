"use client";

import { AlertCircle, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateContainer } from "@/components/ui/state-container";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";

// ============================================================================
// Loading State Component
// ============================================================================

interface LoadingStateProps {
  height?: string;
  variant?: "chart" | "table" | "kpi";
}

function LoadingState({
  height = "h-52",
  variant = "chart",
}: LoadingStateProps) {
  if (variant === "kpi") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-2">
        {["s1", "s2", "s3", "s4", "s5"].map((id) => (
          <Skeleton key={id} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return <Skeleton className={`w-full ${height}`} />;
}

// ============================================================================
// Data Card Wrapper - Compound Component
// ============================================================================

interface DataCardProps {
  children: ReactNode;
  title: string;
  className?: string;
}

function DataCardRoot({ children, title, className = "" }: DataCardProps) {
  return (
    <Card className={`border-zinc-800 bg-zinc-900/50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface DataCardContentProps {
  children: ReactNode;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  loadingHeight?: string;
  loadingVariant?: "chart" | "table" | "kpi";
}

function DataCardContent({
  children,
  emptyState,
  loadingState,
  loadingHeight = "h-52",
  loadingVariant = "chart",
}: DataCardContentProps) {
  const state = useDashboardData();

  if (state.status === "empty") {
    return (
      emptyState ?? (
        <StateContainer
          icon={<FileText className="h-6 w-6 text-zinc-500" />}
          title="No data"
          description="Select a log file to view analytics"
        />
      )
    );
  }

  if (state.status === "loading") {
    return (
      loadingState ?? (
        <LoadingState height={loadingHeight} variant={loadingVariant} />
      )
    );
  }

  if (state.status === "error") {
    return (
      <StateContainer
        icon={<AlertCircle className="h-6 w-6 text-red-400" />}
        iconBg="bg-red-500/10"
        title="Error loading data"
        description={state.error ?? "Something went wrong"}
      />
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Compound Export
// ============================================================================

export const DataCard = {
  Root: DataCardRoot,
  Content: DataCardContent,
  Loading: LoadingState,
};
