ALTER TABLE "dispute_cases" DROP CONSTRAINT "dispute_cases_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "dispute_playbooks" DROP CONSTRAINT "dispute_playbooks_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "stripe_connections" DROP CONSTRAINT "stripe_connections_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "dispute_cases" ADD CONSTRAINT "dispute_cases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispute_playbooks" ADD CONSTRAINT "dispute_playbooks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_connections" ADD CONSTRAINT "stripe_connections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;