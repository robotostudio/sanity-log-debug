import { NextRequest, NextResponse } from "next/server";
import {
  loadRecords,
  getFilteredRecords,
  getAggregations,
  parseFiltersFromParams,
} from "@/lib/data";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = parseFiltersFromParams(params);

  const allRecords = loadRecords();
  const filtered = getFilteredRecords(allRecords, filters);
  const aggregations = getAggregations(filtered);

  return NextResponse.json(aggregations);
}
