ALTER TABLE "dispute_cases" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD COLUMN "product_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispute_cases_product_id_idx" ON "dispute_cases" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_connections_product_id_unique" ON "stripe_connections" USING btree ("product_id");