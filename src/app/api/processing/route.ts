import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, files, logRecords } from "@/lib/db";

export async function GET() {
  const [stats, recentJobs, activeJobs] = await Promise.all([
    // Status counts
    db
      .select({
        status: files.processingStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(files)
      .groupBy(files.processingStatus),

    // Recent jobs with full details
    db.select().from(files).orderBy(desc(files.uploadedAt)).limit(20),

    // Active jobs (pending or processing)
    db
      .select()
      .from(files)
      .where(sql`${files.processingStatus} IN ('pending', 'processing')`)
      .orderBy(files.uploadedAt),
  ]);

  // For active jobs that are processing, get current record count for progress tracking
  const processingJobIds = activeJobs
    .filter((job) => job.processingStatus === "processing")
    .map((job) => job.id);

  let progressMap: Record<string, number> = {};

  if (processingJobIds.length > 0) {
    const progressCounts = await db
      .select({
        fileId: logRecords.fileId,
        count: sql<number>`count(*)::int`,
      })
      .from(logRecords)
      .where(sql`${logRecords.fileId} IN ${processingJobIds}`)
      .groupBy(logRecords.fileId);

    progressMap = Object.fromEntries(
      progressCounts.map((p) => [p.fileId, p.count])
    );
  }

  // Enrich active jobs with current progress
  const activeJobsWithProgress = activeJobs.map((job) => ({
    ...job,
    currentRecordCount: progressMap[job.id] ?? 0,
  }));

  // Calculate total records processed
  const totalRecords = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(logRecords);

  return NextResponse.json({
    stats: Object.fromEntries(stats.map((s) => [s.status, s.count])),
    recentJobs,
    activeJobs: activeJobsWithProgress,
    totalRecords: totalRecords[0]?.total ?? 0,
  });
}
