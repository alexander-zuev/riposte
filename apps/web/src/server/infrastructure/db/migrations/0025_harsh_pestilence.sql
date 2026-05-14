CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_channel_check" CHECK ("notification_preferences"."channel" in ('email', 'slack'))
);
--> statement-breakpoint
CREATE TABLE "slack_connections" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" text NOT NULL,
	"team_name" text,
	"channel_id" text,
	"channel_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"failure_reason" text,
	"webhook_ciphertext" text NOT NULL,
	"webhook_iv" text NOT NULL,
	"webhook_key_version" text NOT NULL,
	"connected_at" timestamp with time zone NOT NULL,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_connections_status_check" CHECK ("slack_connections"."status" in ('active', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_connections" ADD CONSTRAINT "slack_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_user_channel_unique" ON "notification_preferences" USING btree ("user_id","channel");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_connections_user_team_unique" ON "slack_connections" USING btree ("user_id","team_id");--> statement-breakpoint
CREATE INDEX "slack_connections_user_id_idx" ON "slack_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "slack_connections_team_id_idx" ON "slack_connections" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "slack_connections_status_idx" ON "slack_connections" USING btree ("status");