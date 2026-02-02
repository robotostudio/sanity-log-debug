import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StateContainer } from "@/components/ui/state-container";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card className="border-zinc-800 bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface ChartEmptyProps {
  title: string;
  icon: LucideIcon;
  height?: string;
}

export function ChartEmpty({
  title,
  icon: Icon,
  height = "h-[300px]",
}: ChartEmptyProps) {
  return (
    <StateContainer
      icon={<Icon className="h-6 w-6 text-zinc-500" />}
      title={`No ${title.toLowerCase()} data`}
      description="Select a log file to view"
      className={`${height} py-0`}
    />
  );
}

interface ChartLoadingProps {
  height?: string;
}

export function ChartLoading({ height = "h-[300px]" }: ChartLoadingProps) {
  return <Skeleton className={`w-full ${height}`} />;
}
