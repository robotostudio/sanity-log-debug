"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusCategory, SEVERITY_BG, STATUS_BG } from "@/lib/constants";

export function StatusBadge({ status }: { status: number }) {
  const cat = getStatusCategory(status);
  const bg =
    STATUS_BG[cat] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <Badge variant="outline" className={`font-pixel text-xs ${bg}`}>
      {status}
    </Badge>
  );
}

export function SeverityBadge({
  severity,
}: {
  severity: "INFO" | "WARN" | "ERROR";
}) {
  const bg =
    SEVERITY_BG[severity] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
  return (
    <Badge variant="outline" className={`font-pixel text-xs ${bg}`}>
      {severity}
    </Badge>
  );
}
