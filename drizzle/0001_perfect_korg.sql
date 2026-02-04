CREATE TABLE "processing_batches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "processing_batches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_id" text NOT NULL,
	"batch_index" integer NOT NULL,
	"byte_start" bigint NOT NULL,
	"byte_end" bigint NOT NULL,
	"row_start" bigint,
	"row_end" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"records_parsed" integer DEFAULT 0 NOT NULL,
	"records_inserted" integer DEFAULT 0 NOT NULL,
	"parse_errors" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"error_message" text,
	"error_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"workflow_run_id" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"total_rows" bigint,
	"processed_rows" bigint DEFAULT 0 NOT NULL,
	"failed_rows" bigint DEFAULT 0 NOT NULL,
	"current_batch" integer DEFAULT 0 NOT NULL,
	"total_batches" integer,
	"total_bytes" bigint,
	"processed_bytes" bigint DEFAULT 0 NOT NULL,
	"queued_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_completion" timestamp,
	"rows_per_second" real,
	"bytes_per_second" real,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"last_error_at" timestamp,
	"checkpoint_offset" bigint DEFAULT 0 NOT NULL,
	"checkpoint_row" bigint DEFAULT 0 NOT NULL,
	"checkpoint_batch" integer DEFAULT 0 NOT NULL,
	"checkpoint_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "upload_chunks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "upload_chunks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" text NOT NULL,
	"chunk_number" integer NOT NULL,
	"size" integer NOT NULL,
	"byte_start" bigint NOT NULL,
	"byte_end" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"etag" text,
	"checksum" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text,
	"r2_upload_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"filename" text NOT NULL,
	"total_size" bigint NOT NULL,
	"chunk_size" integer NOT NULL,
	"total_chunks" integer NOT NULL,
	"uploaded_chunks" integer DEFAULT 0 NOT NULL,
	"bytes_uploaded" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "processing_batches" ADD CONSTRAINT "processing_batches_job_id_processing_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."processing_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_processing_batches_job_index" ON "processing_batches" USING btree ("job_id","batch_index");--> statement-breakpoint
CREATE INDEX "idx_processing_batches_job_status" ON "processing_batches" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_status" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_file" ON "processing_jobs" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_processing_jobs_priority" ON "processing_jobs" USING btree ("priority","queued_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_upload_chunks_session_number" ON "upload_chunks" USING btree ("session_id","chunk_number");--> statement-breakpoint
CREATE INDEX "idx_upload_chunks_session_status" ON "upload_chunks" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_status" ON "upload_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_expires" ON "upload_sessions" USING btree ("expires_at");