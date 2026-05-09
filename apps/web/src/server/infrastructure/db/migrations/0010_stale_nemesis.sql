ALTER TABLE "stripe_connections" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "revoked_stripe_event_id" text;--> statement-breakpoint
CREATE INDEX "stripe_connections_status_idx" ON "stripe_connections" USING btree ("status");--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_status_check" CHECK ("stripe_connections"."status" in ('active', 'revoked'));