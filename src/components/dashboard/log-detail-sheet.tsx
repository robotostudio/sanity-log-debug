"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDuration, formatBytes } from "@/lib/constants";
import type { LogRecord } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { StatusBadge, SeverityBadge } from "./status-badge";

function parseGroqQuery(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const query = urlObj.searchParams.get("query");
    if (query) return query;
  } catch {
    const match = url.match(/[?&]query=([^&]*)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      if (key !== "query") {
        params[key] = value;
      }
    });
  } catch {
    // ignore
  }
  return params;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <div className="font-mono text-[13px] leading-tight text-zinc-200">
        {value}
      </div>
    </div>
  );
}

export function LogDetailSheet({
  record,
  open,
  onClose,
}: {
  record: LogRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;

  const durationColor =
    record.body.duration > 1000
      ? "text-red-400"
      : record.body.duration > 200
        ? "text-amber-400"
        : "text-emerald-400";

  const groqQuery = parseGroqQuery(record.body.url);
  const queryParams = parseQueryParams(record.body.url);
  const basePath = record.body.url.split("?")[0];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[520px] overflow-y-auto border-zinc-800 bg-zinc-950 p-0 sm:max-w-[520px]">
        {/* Colored accent bar at top */}
        <div
          className="h-1"
          style={{
            background:
              record.body.status >= 500
                ? "#ef4444"
                : record.body.status >= 400
                  ? "#f59e0b"
                  : record.body.status >= 300
                    ? "#3b82f6"
                    : "#22c55e",
          }}
        />

        <SheetHeader className="px-6 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2.5 text-sm text-zinc-200">
            <StatusBadge status={record.body.status} />
            <span className="font-mono font-semibold">
              {record.body.method}
            </span>
            <SeverityBadge severity={record.severityText} />
            <span className="ml-auto font-mono text-xs text-zinc-500">
              {format(parseISO(record.timestamp), "MMM d, HH:mm:ss.SSS")}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-6 pt-5 pb-8">
          {/* Duration hero */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Duration
            </span>
            <div className={`mt-0.5 font-mono text-3xl font-bold tracking-tight ${durationColor}`}>
              {formatDuration(record.body.duration)}
            </div>
          </div>

          {/* Path */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Path
            </span>
            <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-zinc-300 break-all">
              {basePath}
            </div>
          </div>

          {/* GROQ Query */}
          {groqQuery && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-500">
                GROQ Query
              </span>
              <pre className="rounded-md border border-emerald-900/40 bg-emerald-950/30 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-emerald-300 whitespace-pre-wrap break-all max-h-56 overflow-y-auto">
                {groqQuery}
              </pre>
            </div>
          )}

          {/* Query parameters */}
          {Object.keys(queryParams).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Parameters
              </span>
              <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2 space-y-1.5">
                {Object.entries(queryParams).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2 text-[12px]">
                    <span className="shrink-0 font-mono font-medium text-cyan-400">
                      {k}
                    </span>
                    <span className="font-mono text-zinc-400 break-all">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-zinc-800/60" />

          {/* Network info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field
              label="Request Size"
              value={formatBytes(record.body.requestSize)}
            />
            <Field
              label="Response Size"
              value={formatBytes(record.body.responseSize)}
            />
            <Field label="Remote IP" value={record.body.remoteIp} />
            <Field label="Method" value={record.body.method} />
          </div>

          <Separator className="bg-zinc-800/60" />

          {/* Tracing */}
          <div className="grid grid-cols-1 gap-y-3">
            <Field label="Trace ID" value={
              <span className="text-[11px] text-zinc-400">{record.traceId}</span>
            } />
            <Field label="Span ID" value={
              <span className="text-[11px] text-zinc-400">{record.spanId}</span>
            } />
          </div>

          <Separator className="bg-zinc-800/60" />

          {/* Sanity attributes */}
          <div className="space-y-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Sanity Attributes
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field
                label="Project ID"
                value={record.attributes.sanity.projectId}
              />
              <Field
                label="Dataset"
                value={record.attributes.sanity.dataset}
              />
              <Field label="Domain" value={record.attributes.sanity.domain} />
              <Field
                label="Endpoint"
                value={record.attributes.sanity.endpoint}
              />
              <Field
                label="API Version"
                value={record.attributes.sanity.apiVersion || "\u2014"}
              />
              <Field
                label="Studio Request"
                value={
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${record.attributes.sanity.studioRequest ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400" : "border-zinc-700 text-zinc-500"}`}
                  >
                    {record.attributes.sanity.studioRequest ? "Yes" : "No"}
                  </Badge>
                }
              />
              {record.attributes.sanity.groqQueryIdentifier && (
                <div className="col-span-2">
                  <Field
                    label="GROQ Query ID"
                    value={
                      <span className="text-[11px] text-zinc-400">
                        {record.attributes.sanity.groqQueryIdentifier}
                      </span>
                    }
                  />
                </div>
              )}
              {record.attributes.sanity.tags.length > 0 && (
                <div className="col-span-2 space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                    Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {record.attributes.sanity.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-zinc-700 bg-zinc-800/50 font-mono text-[10px] text-zinc-400"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User agent */}
          {record.body.userAgent && (
            <>
              <Separator className="bg-zinc-800/60" />
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  User Agent
                </span>
                <p className="font-mono text-[11px] leading-relaxed text-zinc-500 break-all">
                  {record.body.userAgent}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
