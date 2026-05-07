CREATE TABLE "stripe_connections" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"stripe_account_id" text NOT NULL,
	"livemode" boolean NOT NULL,
	"status" text NOT NULL,
	"scope" text,
	"token_type" text,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"connected_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_connections_status_check" CHECK ("stripe_connections"."status" in ('active', 'revoked', 'needs_reauth'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connections_account_mode_unique" ON "stripe_connections" USING btree ("stripe_account_id","livemode");--> statement-breakpoint
CREATE INDEX "stripe_connections_status_idx" ON "stripe_connections" USING btree ("status");