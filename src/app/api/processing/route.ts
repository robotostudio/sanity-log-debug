import { desc, inArray, sql } from "drizzle-orm";
import { handleError, success } from "@/lib/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("api/processing");

export async function GET() {
  try {
    const [stats, recentJobs, activeJobs] = await Promise.all([
      db
        .select({
          status: files.processingStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(files)
        .groupBy(files.processingStatus),

      db.select().from(files).orderBy(desc(files.uploadedAt)).limit(20),

      db
        .select()
        .from(files)
        .where(inArray(files.processingStatus, ["pending", "processing"]))
        .orderBy(files.uploadedAt),
    ]);

    // Get progress counts for processing jobs
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
        .where(inArray(logRecords.fileId, processingJobIds))
        .groupBy(logRecords.fileId);

      progressMap = Object.fromEntries(
        progressCounts.map((p) => [p.fileId, p.count]),
      );
    }

    const activeJobsWithProgress = activeJobs.map((job) => ({
      ...job,
      currentRecordCount: progressMap[job.id] ?? 0,
    }));

    const totalRecords = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(logRecords);

    logger.info("Processing stats fetched", {
      activeJobs: activeJobs.length,
      recentJobs: recentJobs.length,
      totalRecords: totalRecords[0]?.total ?? 0,
    });

    return success({
      stats: Object.fromEntries(stats.map((s) => [s.status, s.count])),
      recentJobs,
      activeJobs: activeJobsWithProgress,
      totalRecords: totalRecords[0]?.total ?? 0,
    });
  } catch (error) {
    logger.error("Failed to fetch processing stats", error);
    return handleError(error, "Failed to fetch processing stats");
  }
}
