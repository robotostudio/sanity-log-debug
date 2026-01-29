import { type NextRequest, NextResponse } from "next/server";
import {
  getFilteredRecords,
  loadRecords,
  parseFiltersFromParams,
} from "@/lib/data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = parseFiltersFromParams(params);
  const fileKey = params.get("fileKey") ?? undefined;

  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(params.get("pageSize") ?? "50", 10);
  const sortBy = params.get("sortBy") ?? "timestamp";
  const sortDir = params.get("sortDir") ?? "desc";

  const allRecords = await loadRecords(fileKey);
  const filtered = getFilteredRecords(allRecords, filters);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortBy) {
      case "timestamp":
        aVal = a.timestamp;
        bVal = b.timestamp;
        break;
      case "duration":
        aVal = a.body.duration;
        bVal = b.body.duration;
        break;
      case "status":
        aVal = a.body.status;
        bVal = b.body.status;
        break;
      case "responseSize":
        aVal = a.body.responseSize;
        bVal = b.body.responseSize;
        break;
      case "method":
        aVal = a.body.method;
        bVal = b.body.method;
        break;
      case "endpoint":
        aVal = a.attributes.sanity.endpoint;
        bVal = b.attributes.sanity.endpoint;
        break;
      default:
        aVal = a.timestamp;
        bVal = b.timestamp;
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);

  return NextResponse.json({
    data: paginated,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  });
}
