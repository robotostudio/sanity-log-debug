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
      return {
        fileId,
        timestamp: new Date(record.timestamp),
        traceId: record.traceId,
        severity: record.severityText,
        method: record.body.method,
        status: record.body.status,
        duration: record.body.duration,
        url: record.body.url,
        endpoint: record.attributes.sanity.endpoint,
        domain: record.attributes.sanity.domain,
        isStudioRequest: record.attributes.sanity.studioRequest ? 1 : 0,
        groqQueryId: record.attributes.sanity.groqQueryIdentifier,
      };
    });
    await db.insert(logRecords).values(batch);
  }

  return { recordCount: lines.length };
}
