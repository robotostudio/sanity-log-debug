import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    filename: text("filename").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
    processingStatus: text("processing_status").notNull().default("pending"),
    recordCount: integer("record_count"),
    processedAt: timestamp("processed_at"),
    workflowRunId: text("workflow_run_id"),
    // Error tracking columns
    errorMessage: text("error_message"),
    lastErrorAt: timestamp("last_error_at"),
    failedRecords: integer("failed_records").default(0),
    // Owner
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [index("idx_files_user_id").on(table.userId)],
);

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
    index("idx_file_method").on(table.fileId, table.method),
    index("idx_file_domain").on(table.fileId, table.domain),
    index("idx_file_duration").on(table.fileId, table.duration),
    index("idx_file_groq_query_id").on(table.fileId, table.groqQueryId),
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

// ============================================================================
// Upload Session Tables (for chunked/resumable uploads)
// ============================================================================

/**
 * Upload session tracking for chunked/multipart uploads
 * Supports R2 multipart upload API with resume capability
 */
export const uploadSessions = pgTable(
  "upload_sessions",
  {
    id: text("id").primaryKey(),
    fileId: text("file_id").references(() => files.id, { onDelete: "cascade" }),
    r2UploadId: text("r2_upload_id").notNull(), // Multipart upload ID from R2
    r2Key: text("r2_key").notNull(), // Final object key in R2
    filename: text("filename").notNull(),
    totalSize: bigint("total_size", { mode: "number" }).notNull(), // Total file size in bytes
    chunkSize: integer("chunk_size").notNull(), // Chunk size for this upload
    totalChunks: integer("total_chunks").notNull(),
    uploadedChunks: integer("uploaded_chunks").notNull().default(0),
    bytesUploaded: bigint("bytes_uploaded", { mode: "number" })
      .notNull()
      .default(0),
    status: text("status").notNull().default("created"), // created/uploading/completing/completed/failed/cancelled
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(), // Auto-cleanup for abandoned uploads
    errorMessage: text("error_message"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    metadata: jsonb("metadata"), // Custom metadata (content-type, etc.)
  },
  (table) => [
    index("idx_upload_sessions_status").on(table.status),
    index("idx_upload_sessions_expires").on(table.expiresAt),
    index("idx_upload_sessions_user_id").on(table.userId),
  ],
);

/**
 * Individual chunk tracking for multipart uploads
 * Enables resume and retry at chunk level
 */
export const uploadChunks = pgTable(
  "upload_chunks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: text("session_id")
      .notNull()
      .references(() => uploadSessions.id, { onDelete: "cascade" }),
    chunkNumber: integer("chunk_number").notNull(), // 1-indexed (R2 part numbers)
    size: integer("size").notNull(),
    byteStart: bigint("byte_start", { mode: "number" }).notNull(), // Start offset in original file
    byteEnd: bigint("byte_end", { mode: "number" }).notNull(), // End offset (exclusive)
    status: text("status").notNull().default("pending"), // pending/uploading/completed/failed
    etag: text("etag"), // ETag from R2 after successful upload
    checksum: text("checksum"), // Client-computed checksum for validation
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at"),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("idx_upload_chunks_session_number").on(
      table.sessionId,
      table.chunkNumber,
    ),
    index("idx_upload_chunks_session_status").on(table.sessionId, table.status),
  ],
);

// ============================================================================
// Type Exports
// ============================================================================

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type LogRecord = typeof logRecords.$inferSelect;
export type NewLogRecord = typeof logRecords.$inferInsert;
export type BatchProgress = typeof batchProgress.$inferSelect;
export type NewBatchProgress = typeof batchProgress.$inferInsert;

// Upload table types
export type UploadSession = typeof uploadSessions.$inferSelect;
export type NewUploadSession = typeof uploadSessions.$inferInsert;
export type UploadChunk = typeof uploadChunks.$inferSelect;
export type NewUploadChunk = typeof uploadChunks.$inferInsert;
