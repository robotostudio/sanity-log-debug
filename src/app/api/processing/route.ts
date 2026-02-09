import { desc, eq, inArray, sql, and, type SQL } from "drizzle-orm";
import { handleError, requireAuth, success } from "@/lib/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("api/processing");

export async function GET() {
  try {
    const user = await requireAuth();
    const isAdmin = user.role === "admin";

    // Scope filter: admin sees all, user sees own
    const scopeFilter: SQL | undefined = isAdmin
      ? undefined
      : eq(files.userId, user.id);

    const [stats, recentJobs, activeJobs] = await Promise.all([
      db
        .select({
          status: files.processingStatus,
          count: sql<number>`count(*)::int`,
        })
        .from(files)
        .where(scopeFilter)
        .groupBy(files.processingStatus),

      db
        .select()
        .from(files)
        .where(scopeFilter)
        .orderBy(desc(files.uploadedAt))
        .limit(20),

      db
        .select()
        .from(files)
        .where(
          scopeFilter
            ? and(
                scopeFilter,
                inArray(files.processingStatus, ["pending", "processing"]),
              )
            : inArray(files.processingStatus, ["pending", "processing"]),
        )
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

    // Scope total records count too
    const totalRecordsQuery = isAdmin
      ? db.select({ total: sql<number>`count(*)::int` }).from(logRecords)
      : db
          .select({ total: sql<number>`count(*)::int` })
          .from(logRecords)
          .innerJoin(files, eq(logRecords.fileId, files.id))
          .where(eq(files.userId, user.id));

    const totalRecords = await totalRecordsQuery;

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
