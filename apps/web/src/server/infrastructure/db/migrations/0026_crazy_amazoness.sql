CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"product_type" text DEFAULT 'digital_product_or_service' NOT NULL,
	"product_description" text,
	"service_start_rule" text,
	"refund_policy_disclosure" text,
	"cancellation_policy_disclosure" text,
	"status" text DEFAULT 'setup_pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_status_check" CHECK ("products"."status" in ('setup_pending', 'setup_complete', 'disabled')),
	CONSTRAINT "products_product_type_check" CHECK ("products"."product_type" in ('physical_product', 'digital_product_or_service', 'offline_service')),
	CONSTRAINT "products_service_start_rule_check" CHECK ("products"."service_start_rule" is null or "products"."service_start_rule" in ('charge_succeeded_at', 'billing_period_start', 'app_entitlement_started_at', 'first_verified_usage_at', 'merchant_provided'))
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_user_id_idx" ON "products" USING btree ("user_id");