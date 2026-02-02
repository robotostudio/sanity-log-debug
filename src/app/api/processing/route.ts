import { desc, inArray, sql } from "drizzle-orm";
import { getRun, Run } from "workflow/api";
import { handleError, success } from "@/lib/api";
import { db, files, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";

const logger = new Logger("api/processing");

type WorkflowStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

async function getWorkflowStatus(
  runId: string | null,
): Promise<{ status: WorkflowStatus; error?: string }> {
  if (!runId) return { status: "unknown" };

  try { 
    const run = getRun(runId);
    const status = await run.status;
    return { status: status as WorkflowStatus };
  } catch (error) {
    logger.warn("Failed to get workflow status", { runId, error });
    return { status: "unknown", error: String(error) };
  }
}

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

    const workflowStatuses = await Promise.all(
      activeJobs.map(async (job) => {
        const workflowInfo = await getWorkflowStatus(job.workflowRunId);
        return { id: job.id, ...workflowInfo };
      }),
    );

    const workflowStatusMap = Object.fromEntries(
      workflowStatuses.map((ws) => [ws.id, ws]),
    );

    const activeJobsWithProgress = activeJobs.map((job) => ({
      ...job,
      currentRecordCount: progressMap[job.id] ?? 0,
      workflowStatus: workflowStatusMap[job.id]?.status ?? "unknown",
    }));

    const recentJobWorkflowStatuses = await Promise.all(
      recentJobs.map(async (job) => {
        const workflowInfo = await getWorkflowStatus(job.workflowRunId);
        return { id: job.id, ...workflowInfo };
      }),
    );

    const recentWorkflowStatusMap = Object.fromEntries(
      recentJobWorkflowStatuses.map((ws) => [ws.id, ws]),
    );

    const recentJobsWithStatus = recentJobs.map((job) => ({
      ...job,
      workflowStatus: recentWorkflowStatusMap[job.id]?.status ?? "unknown",
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
      recentJobs: recentJobsWithStatus,
      activeJobs: activeJobsWithProgress,
      totalRecords: totalRecords[0]?.total ?? 0,
    });
  } catch (error) {
    logger.error("Failed to fetch processing stats", error);
    return handleError(error, "Failed to fetch processing stats");
  }
}
