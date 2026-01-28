"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/constants";

interface QueryData {
  groqId: string;
  count: number;
  avgDuration: number;
  p99Duration: number;
  endpoint: string;
}

export function QueryExplorer({ data }: { data: QueryData[] | null }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!data) return null;
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter((q) => q.groqId.toLowerCase().includes(s));
  }, [data, search]);

  if (!data) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-sm text-zinc-400">
            GROQ Query Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-400">
            GROQ Query Explorer
          </CardTitle>
          <Input
            placeholder="Filter query ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-48 border-zinc-700 bg-zinc-950 text-xs text-zinc-300"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-xs text-zinc-500">
                  Query ID
                </TableHead>
                <TableHead className="text-right text-xs text-zinc-500">
                  Count
                </TableHead>
                <TableHead className="text-right text-xs text-zinc-500">
                  Avg Duration
                </TableHead>
                <TableHead className="text-right text-xs text-zinc-500">
                  P99 Duration
                </TableHead>
                <TableHead className="text-xs text-zinc-500">
                  Endpoint
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map((q) => (
                <TableRow
                  key={q.groqId}
                  className="border-zinc-800 hover:bg-zinc-800/50"
                >
                  <TableCell className="font-mono text-xs text-zinc-300">
                    {q.groqId}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-300">
                    {q.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-300">
                    {formatDuration(q.avgDuration)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-zinc-300">
                    {formatDuration(q.p99Duration)}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">
                    {q.endpoint}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
