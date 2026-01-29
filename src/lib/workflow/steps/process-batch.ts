"use step";

import { db, logRecords } from "@/lib/db";
import { Logger } from "@/lib/logger";
import type { BatchInfo, ParsedRecord } from "./create-batches";

const logger = new Logger("workflow/process-batch");

export async function processBatch({
  fileId,
  batch,
}: {
  fileId: string;
  batch: BatchInfo;
}) {
  logger.info("Processing batch", {
    fileId,
    batchIndex: batch.batchIndex,
    recordCount: batch.records.length,
    lineRange: `${batch.startLine}-${batch.endLine}`,
  });

  const dbRecords = batch.records.map((record: ParsedRecord) => ({
    fileId,
    timestamp: new Date(record.timestamp),
    traceId: record.traceId,
    spanId: record.spanId,
    severityText: record.severityText,
    severityNumber: record.severityNumber,
    duration: record.duration,
    insertId: record.insertId,
    method: record.method,
    referer: record.referer,
    remoteIp: record.remoteIp,
    requestSize: record.requestSize,
    responseSize: record.responseSize,
    status: record.status,
    url: record.url,
    userAgent: record.userAgent,
    projectId: record.projectId,
    dataset: record.dataset,
    domain: record.domain,
    endpoint: record.endpoint,
    groqQueryId: record.groqQueryId,
    apiVersion: record.apiVersion,
    tags: record.tags,
    isStudioRequest: record.isStudioRequest,
    resourceServiceName: record.resourceServiceName,
    resourceSanityType: record.resourceSanityType,
    resourceSanityVersion: record.resourceSanityVersion,
  }));

  await db.insert(logRecords).values(dbRecords);

  logger.info("Batch processed", {
    fileId,
    batchIndex: batch.batchIndex,
    recordsInserted: dbRecords.length,
  });

  return {
    batchIndex: batch.batchIndex,
    recordsInserted: dbRecords.length,
  };
}
