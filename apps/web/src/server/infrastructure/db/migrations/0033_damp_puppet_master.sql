CREATE TABLE "product_app_data_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"mcp_server_id" text NOT NULL,
	"alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_app_data_sources" ADD CONSTRAINT "product_app_data_sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_app_data_sources_product_id_idx" ON "product_app_data_sources" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_app_data_sources_product_mcp_server_unique" ON "product_app_data_sources" USING btree ("product_id","mcp_server_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_app_data_sources_product_alias_unique" ON "product_app_data_sources" USING btree ("product_id","alias");