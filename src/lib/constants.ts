export const STATUS_COLORS: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#3b82f6",
  "4xx": "#f59e0b",
  "5xx": "#ef4444",
};

export const METHOD_COLORS: Record<string, string> = {
  GET: "#3b82f6",
  POST: "#22c55e",
  PUT: "#f59e0b",
  PATCH: "#a855f7",
  DELETE: "#ef4444",
  OPTIONS: "#6b7280",
  HEAD: "#8b5cf6",
};

export const SEVERITY_COLORS: Record<string, string> = {
  INFO: "#3b82f6",
  WARN: "#f59e0b",
  ERROR: "#ef4444",
};

export const SEVERITY_BG: Record<string, string> = {
  INFO: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  WARN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  ERROR: "bg-red-500/15 text-red-400 border-red-500/20",
};

export const STATUS_BG: Record<string, string> = {
  "2xx": "bg-green-500/15 text-green-400 border-green-500/20",
  "3xx": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "4xx": "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "5xx": "bg-red-500/15 text-red-400 border-red-500/20",
};

export const METHOD_BG: Record<string, string> = {
  GET: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  POST: "bg-green-500/15 text-green-400 border-green-500/20",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  PATCH: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
  OPTIONS: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  HEAD: "bg-violet-500/15 text-violet-400 border-violet-500/20",
};

export const LATENCY_BUCKETS = [
  { label: "0-1ms", min: 0, max: 1, color: "#22c55e" },
  { label: "1-10ms", min: 1, max: 10, color: "#4ade80" },
  { label: "10-50ms", min: 10, max: 50, color: "#86efac" },
  { label: "50-100ms", min: 50, max: 100, color: "#fbbf24" },
  { label: "100-500ms", min: 100, max: 500, color: "#f59e0b" },
  { label: "500ms-1s", min: 500, max: 1000, color: "#f97316" },
  { label: "1-5s", min: 1000, max: 5000, color: "#ef4444" },
  { label: "5s+", min: 5000, max: Infinity, color: "#dc2626" },
];

export const CHART_COLORS_MAP = {
  green: "#22c55e",
  blue: "#3b82f6",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#f97316",
  lime: "#84cc16",
  emerald: "#10b981",
  indigo: "#6366f1",
  rose: "#f43f5e",
  teal: "#14b8a6",
  sky: "#0ea5e9",
  fuchsia: "#d946ef",
};

export const CHART_COLORS = Object.values(CHART_COLORS_MAP);

export function getStatusCategory(status: number): string {
  if (status === 0) return "0xx";
  if (status < 200) return "1xx";
  if (status < 300) return "2xx";
  if (status < 400) return "3xx";
  if (status < 500) return "4xx";
  return "5xx";
}

export function getStatusColor(status: number): string {
  const cat = getStatusCategory(status);
  return STATUS_COLORS[cat] ?? "#6b7280";
}

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
