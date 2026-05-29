ALTER TABLE "product_app_data_sources" RENAME COLUMN "alias" TO "server_name";--> statement-breakpoint
DROP INDEX "product_app_data_sources_product_alias_unique";--> statement-breakpoint
ALTER TABLE "product_app_data_sources" ADD COLUMN "server_url" text NOT NULL;