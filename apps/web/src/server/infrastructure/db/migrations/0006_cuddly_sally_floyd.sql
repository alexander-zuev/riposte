ALTER TABLE "stripe_connections" DROP CONSTRAINT "stripe_connections_status_check";--> statement-breakpoint
DROP INDEX "stripe_connections_status_idx";--> statement-breakpoint
CREATE INDEX "stripe_connections_user_id_idx" ON "stripe_connections" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "stripe_connections" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "stripe_connections" DROP COLUMN "revoked_at";