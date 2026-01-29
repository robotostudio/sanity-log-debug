"use step";

import { getFileContent } from "@/lib/r2";
import { Logger } from "@/lib/logger";
import type { LogRecord } from "@/lib/types";

const logger = new Logger("workflow/create-batches");
const BATCH_SIZE = 1000;

export interface BatchInfo {
  batchIndex: number;
  startLine: number;
  endLine: number;
  records: ParsedRecord[];
}

export interface ParsedRecord {
  timestamp: string;
  traceId?: string;
  spanId?: string;
  severityText?: string;
  severityNumber?: number;
  duration?: number;
  insertId?: string;
  method?: string;
  referer?: string;
  remoteIp?: string;
  requestSize?: number;
  responseSize?: number;
  status?: number;
  url?: string;
  userAgent?: string;
  projectId?: string;
  dataset?: string;
  domain?: string;
  endpoint?: string;
  groqQueryId?: string;
  apiVersion?: string;
  tags?: string | null;
  isStudioRequest: number;
  resourceServiceName?: string;
  resourceSanityType?: string;
  resourceSanityVersion?: string;
}

function parseRecord(line: string): ParsedRecord {
  const record = JSON.parse(line) as LogRecord;
  const body = record.body;
  const sanity = record.attributes?.sanity;
  const resource = record.resource;

  return {
    timestamp: record.timestamp,
    traceId: record.traceId,
    spanId: record.spanId,
    severityText: record.severityText,
    severityNumber: record.severityNumber,
    duration: body?.duration,
    insertId: body?.insertId,
    method: body?.method,
    referer: body?.referer,
    remoteIp: body?.remoteIp,
    requestSize: body?.requestSize,
    responseSize: body?.responseSize,
    status: body?.status,
    url: body?.url,
    userAgent: body?.userAgent,
    projectId: sanity?.projectId,
    dataset: sanity?.dataset,
    domain: sanity?.domain,
    endpoint: sanity?.endpoint,
    groqQueryId: sanity?.groqQueryIdentifier,
    apiVersion: sanity?.apiVersion,
    tags: sanity?.tags ? JSON.stringify(sanity.tags) : null,
    isStudioRequest: sanity?.studioRequest ? 1 : 0,
    resourceServiceName: resource?.service?.name,
    resourceSanityType: resource?.sanity?.type,
    resourceSanityVersion: resource?.sanity?.version,
  };
}

export async function createBatches({ fileKey }: { fileKey: string }) {
  logger.info("Creating batches from file", { fileKey });

  const content = await getFileContent(fileKey);
  const lines = content.trim().split("\n").filter(Boolean);
  const totalRecords = lines.length;

  logger.info("File loaded", { fileKey, totalRecords });

  const batches: BatchInfo[] = [];

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const endIndex = Math.min(i + BATCH_SIZE, lines.length);
    const batchLines = lines.slice(i, endIndex);
    const records = batchLines.map(parseRecord);

    batches.push({
      batchIndex: batches.length,
      startLine: i,
      endLine: endIndex - 1,
      records,
    });
  }

  logger.info("Batches created", {
    fileKey,
    totalRecords,
    totalBatches: batches.length,
    batchSize: BATCH_SIZE,
  });

  return {
    totalRecords,
    totalBatches: batches.length,
    batches,
  };
}
