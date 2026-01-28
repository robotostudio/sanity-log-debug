import { format } from "date-fns";

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, HH:mm:ss");
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), "MMM d HH:mm");
}

export function formatPercent(value: number): string {
  if (value < 0.01) return `${(value * 100).toFixed(3)}%`;
  if (value < 1) return `${(value * 100).toFixed(2)}%`;
  return `${(value * 100).toFixed(1)}%`;
}

export function getStatusGroup(status: number): string {
  if (status < 200) return "1xx";
  if (status < 300) return "2xx";
  if (status < 400) return "3xx";
  if (status < 500) return "4xx";
  return "5xx";
}

export function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return `${url.slice(0, maxLength - 3)}...`;
}

export function truncateMiddle(str: string, maxLength: number = 40): string {
  if (str.length <= maxLength) return str;
  const half = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, half)}...${str.slice(-half)}`;
}
