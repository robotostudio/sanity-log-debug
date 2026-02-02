-- Add error tracking columns to files table
ALTER TABLE "files" ADD COLUMN "error_message" text;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "last_error_at" timestamp;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "failed_records" integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "workflow_run_id" text;
--> statement-breakpoint

-- Create batch progress tracking table for recovery
CREATE TABLE "batch_progress" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "batch_progress_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text NOT NULL,
	"batch_index" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"record_count" integer,
	"parse_errors" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	CONSTRAINT "batch_progress_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "idx_batch_file_index" ON "batch_progress" USING btree ("file_id","batch_index");
--> statement-breakpoint

-- Update log_records foreign key to cascade on delete
ALTER TABLE "log_records" DROP CONSTRAINT "log_records_file_id_files_id_fk";
--> statement-breakpoint
ALTER TABLE "log_records" ADD CONSTRAINT "log_records_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
