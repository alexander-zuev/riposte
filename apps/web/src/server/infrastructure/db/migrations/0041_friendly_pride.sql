DROP INDEX "outbox_pending_idx";--> statement-breakpoint
ALTER TABLE "message_outbox" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "message_outbox" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message_outbox" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_outbox" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "message_outbox" USING btree ("available_at","created_at") WHERE "message_outbox"."published_at" is null and "message_outbox"."failed_at" is null;