import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const files = pgTable("files", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
  processingStatus: text("processing_status").notNull().default("pending"),
  recordCount: integer("record_count"),
  processedAt: timestamp("processed_at"),
  workflowRunId: text("workflow_run_id"),
});

export const logRecords = pgTable(
  "log_records",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    // Root level fields
    timestamp: timestamp("timestamp").notNull(),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    severityText: text("severity_text"),
    severityNumber: integer("severity_number"),
    // Body fields
    duration: real("duration"),
    insertId: text("insert_id"),
    method: text("method"),
    referer: text("referer"),
    remoteIp: text("remote_ip"),
    requestSize: integer("request_size"),
    responseSize: integer("response_size"),
    status: integer("status"),
    url: text("url"),
    userAgent: text("user_agent"),
    // attributes.sanity fields
    projectId: text("project_id"),
    dataset: text("dataset"),
    domain: text("domain"),
    endpoint: text("endpoint"),
    groqQueryId: text("groq_query_id"),
    apiVersion: text("api_version"),
    tags: text("tags"), // JSON array stored as text
    isStudioRequest: integer("is_studio_request"),
    // resource fields
    resourceServiceName: text("resource_service_name"),
    resourceSanityType: text("resource_sanity_type"),
    resourceSanityVersion: text("resource_sanity_version"),
  },
  (table) => [
    index("idx_file_timestamp").on(table.fileId, table.timestamp),
    index("idx_file_severity").on(table.fileId, table.severityText),
    index("idx_file_status").on(table.fileId, table.status),
    index("idx_file_endpoint").on(table.fileId, table.endpoint),
  ],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type LogRecord = typeof logRecords.$inferSelect;
export type NewLogRecord = typeof logRecords.$inferInsert;
