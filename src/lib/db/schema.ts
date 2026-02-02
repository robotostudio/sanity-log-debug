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
  // Error tracking columns
  errorMessage: text("error_message"),
  lastErrorAt: timestamp("last_error_at"),
  failedRecords: integer("failed_records").default(0),
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

// Batch progress tracking table for recovery
export const batchProgress = pgTable(
  "batch_progress",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    batchIndex: integer("batch_index").notNull(),
    status: text("status").notNull().default("pending"), // pending, completed, failed
    recordCount: integer("record_count"),
    parseErrors: integer("parse_errors").default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
  },
  (table) => [index("idx_batch_file_index").on(table.fileId, table.batchIndex)],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type LogRecord = typeof logRecords.$inferSelect;
export type NewLogRecord = typeof logRecords.$inferInsert;
export type BatchProgress = typeof batchProgress.$inferSelect;
export type NewBatchProgress = typeof batchProgress.$inferInsert;
