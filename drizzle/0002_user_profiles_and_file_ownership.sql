DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"max_sources" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_files_user_id" ON "files" USING btree ("user_id");
