"use client";

import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "./context";

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

function EmptyState({
  title = "No data",
  description = "Select a log file to view analytics",
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-zinc-800/50 p-4">
        {icon ?? <FileText className="h-8 w-8 text-zinc-500" />}
      </div>
      <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

// ============================================================================
// Loading State Component
// ============================================================================

interface LoadingStateProps {
  height?: string;
  variant?: "chart" | "table" | "kpi";
}

function LoadingState({
  height = "h-[200px]",
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
  loadingHeight = "h-[200px]",
  loadingVariant = "chart",
}: DataCardContentProps) {
  const { state } = useDashboard();

  if (state.status === "empty") {
    return emptyState ?? <EmptyState />;
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
      <EmptyState
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
  Empty: EmptyState,
  Loading: LoadingState,
};

export { useDashboard };
