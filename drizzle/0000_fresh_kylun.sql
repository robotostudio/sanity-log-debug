CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"filename" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"record_count" integer,
	"processed_at" timestamp,
	CONSTRAINT "files_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "log_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "log_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"trace_id" text,
	"span_id" text,
	"severity_text" text,
	"severity_number" integer,
	"duration" real,
	"insert_id" text,
	"method" text,
	"referer" text,
	"remote_ip" text,
	"request_size" integer,
	"response_size" integer,
	"status" integer,
	"url" text,
	"user_agent" text,
	"project_id" text,
	"dataset" text,
	"domain" text,
	"endpoint" text,
	"groq_query_id" text,
	"api_version" text,
	"tags" text,
	"is_studio_request" integer,
	"resource_service_name" text,
	"resource_sanity_type" text,
	"resource_sanity_version" text
);
--> statement-breakpoint
ALTER TABLE "log_records" ADD CONSTRAINT "log_records_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_file_timestamp" ON "log_records" USING btree ("file_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_file_severity" ON "log_records" USING btree ("file_id","severity_text");--> statement-breakpoint
CREATE INDEX "idx_file_status" ON "log_records" USING btree ("file_id","status");--> statement-breakpoint
CREATE INDEX "idx_file_endpoint" ON "log_records" USING btree ("file_id","endpoint");