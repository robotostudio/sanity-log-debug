import { pgTable, index, foreignKey, text, bigint, integer, timestamp, jsonb, unique, uniqueIndex, boolean, real, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const userRole = pgEnum("user_role", ['user', 'admin'])


export const uploadSessions = pgTable("upload_sessions", {
	id: text().primaryKey().notNull(),
	fileId: text("file_id"),
	r2UploadId: text("r2_upload_id").notNull(),
	r2Key: text("r2_key").notNull(),
	filename: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalSize: bigint("total_size", { mode: "number" }).notNull(),
	chunkSize: integer("chunk_size").notNull(),
	totalChunks: integer("total_chunks").notNull(),
	uploadedChunks: integer("uploaded_chunks").default(0).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	bytesUploaded: bigint("bytes_uploaded", { mode: "number" }).default(0).notNull(),
	status: text().default('created').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	errorMessage: text("error_message"),
	metadata: jsonb(),
	userId: text("user_id"),
}, (table) => [
	index("idx_upload_sessions_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_upload_sessions_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_upload_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "upload_sessions_file_id_files_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "upload_sessions_user_id_user_id_fk"
		}).onDelete("set null"),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const userProfile = pgTable("user_profile", {
	userId: text("user_id").primaryKey().notNull(),
	role: userRole().default('user').notNull(),
	maxSources: integer("max_sources").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_profile_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const batchProgress = pgTable("batch_progress", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "batch_progress_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	fileId: text("file_id").notNull(),
	batchIndex: integer("batch_index").notNull(),
	status: text().default('pending').notNull(),
	recordCount: integer("record_count"),
	parseErrors: integer("parse_errors").default(0),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	errorMessage: text("error_message"),
}, (table) => [
	index("idx_batch_file_index").using("btree", table.fileId.asc().nullsLast().op("int4_ops"), table.batchIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "batch_progress_file_id_files_id_fk"
		}).onDelete("cascade"),
]);

export const uploadChunks = pgTable("upload_chunks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "upload_chunks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	sessionId: text("session_id").notNull(),
	chunkNumber: integer("chunk_number").notNull(),
	size: integer().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	byteStart: bigint("byte_start", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	byteEnd: bigint("byte_end", { mode: "number" }).notNull(),
	status: text().default('pending').notNull(),
	etag: text(),
	checksum: text(),
	attempts: integer().default(0).notNull(),
	lastAttemptAt: timestamp("last_attempt_at", { mode: 'string' }),
	errorMessage: text("error_message"),
}, (table) => [
	uniqueIndex("idx_upload_chunks_session_number").using("btree", table.sessionId.asc().nullsLast().op("text_ops"), table.chunkNumber.asc().nullsLast().op("int4_ops")),
	index("idx_upload_chunks_session_status").using("btree", table.sessionId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [uploadSessions.id],
			name: "upload_chunks_session_id_upload_sessions_id_fk"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const files = pgTable("files", {
	id: text().primaryKey().notNull(),
	key: text().notNull(),
	filename: text().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size: bigint({ mode: "number" }).notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
	processingStatus: text("processing_status").default('pending').notNull(),
	recordCount: integer("record_count"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	workflowRunId: text("workflow_run_id"),
	errorMessage: text("error_message"),
	lastErrorAt: timestamp("last_error_at", { mode: 'string' }),
	failedRecords: integer("failed_records").default(0),
	userId: text("user_id"),
}, (table) => [
	index("idx_files_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "files_user_id_user_id_fk"
		}).onDelete("set null"),
	unique("files_key_unique").on(table.key),
]);

export const logRecords = pgTable("log_records", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "log_records_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	fileId: text("file_id").notNull(),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	traceId: text("trace_id"),
	spanId: text("span_id"),
	severityText: text("severity_text"),
	severityNumber: integer("severity_number"),
	duration: real(),
	insertId: text("insert_id"),
	method: text(),
	referer: text(),
	remoteIp: text("remote_ip"),
	requestSize: integer("request_size"),
	responseSize: integer("response_size"),
	status: integer(),
	url: text(),
	userAgent: text("user_agent"),
	projectId: text("project_id"),
	dataset: text(),
	domain: text(),
	endpoint: text(),
	groqQueryId: text("groq_query_id"),
	apiVersion: text("api_version"),
	tags: text(),
	isStudioRequest: integer("is_studio_request"),
	resourceServiceName: text("resource_service_name"),
	resourceSanityType: text("resource_sanity_type"),
	resourceSanityVersion: text("resource_sanity_version"),
}, (table) => [
	index("idx_file_domain").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.domain.asc().nullsLast().op("text_ops")),
	index("idx_file_duration").using("btree", table.fileId.asc().nullsLast().op("float4_ops"), table.duration.asc().nullsLast().op("float4_ops")),
	index("idx_file_endpoint").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.endpoint.asc().nullsLast().op("text_ops")),
	index("idx_file_groq_query_id").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.groqQueryId.asc().nullsLast().op("text_ops")),
	index("idx_file_method").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.method.asc().nullsLast().op("text_ops")),
	index("idx_file_severity").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.severityText.asc().nullsLast().op("text_ops")),
	index("idx_file_status").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_file_timestamp").using("btree", table.fileId.asc().nullsLast().op("timestamp_ops"), table.timestamp.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [files.id],
			name: "log_records_file_id_files_id_fk"
		}).onDelete("cascade"),
]);
