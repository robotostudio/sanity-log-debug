"use step";

import { db, logRecords } from "@/lib/db";
import { getFileContent } from "@/lib/r2";
import type { LogRecord } from "@/lib/types";

const BATCH_SIZE = 1000;

export async function processRecords({
  fileId,
  fileKey,
}: {
  fileId: string;
  fileKey: string;
}) {
  const content = await getFileContent(fileKey);
  const lines = content.trim().split("\n").filter(Boolean);

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).map((line) => {
      const record = JSON.parse(line) as LogRecord;
      const body = record.body;
      const sanity = record.attributes?.sanity;
      const resource = record.resource;

      return {
        fileId,
        // Root level fields
        timestamp: new Date(record.timestamp),
        traceId: record.traceId,
        spanId: record.spanId,
        severityText: record.severityText,
        severityNumber: record.severityNumber,
        // Body fields
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
        // attributes.sanity fields
        projectId: sanity?.projectId,
        dataset: sanity?.dataset,
        domain: sanity?.domain,
        endpoint: sanity?.endpoint,
        groqQueryId: sanity?.groqQueryIdentifier,
        apiVersion: sanity?.apiVersion,
        tags: sanity?.tags ? JSON.stringify(sanity.tags) : null,
        isStudioRequest: sanity?.studioRequest ? 1 : 0,
        // resource fields
        resourceServiceName: resource?.service?.name,
        resourceSanityType: resource?.sanity?.type,
        resourceSanityVersion: resource?.sanity?.version,
      };
    });
    await db.insert(logRecords).values(batch);
  }

  return { recordCount: lines.length };
}
