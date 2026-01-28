"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/constants";

export function StatusBadge({ status }: { status: number }) {
  const color = getStatusColor(status);
  return (
    <Badge
      variant="outline"
      className="font-mono text-xs"
      style={{ borderColor: color, color }}
    >
      {status}
    </Badge>
  );
}

export function SeverityBadge({
  severity,
}: {
  severity: "INFO" | "WARN" | "ERROR";
}) {
  const colors = {
    INFO: "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
    WARN: "border-amber-500/50 text-amber-400 bg-amber-500/10",
    ERROR: "border-red-500/50 text-red-400 bg-red-500/10",
  };
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${colors[severity]}`}
    >
      {severity}
    </Badge>
  );
}
