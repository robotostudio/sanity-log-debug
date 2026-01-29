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
});

export const logRecords = pgTable(
  "log_records",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id),
    timestamp: timestamp("timestamp").notNull(),
    traceId: text("trace_id"),
    severity: text("severity"),
    method: text("method"),
    status: integer("status"),
    duration: real("duration"),
    url: text("url"),
    endpoint: text("endpoint"),
    domain: text("domain"),
    isStudioRequest: integer("is_studio_request"),
    groqQueryId: text("groq_query_id"),
  },
  (table) => [
    index("idx_file_timestamp").on(table.fileId, table.timestamp),
    index("idx_file_severity").on(table.fileId, table.severity),
    index("idx_file_status").on(table.fileId, table.status),
    index("idx_file_endpoint").on(table.fileId, table.endpoint),
  ],
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type LogRecord = typeof logRecords.$inferSelect;
export type NewLogRecord = typeof logRecords.$inferInsert;
