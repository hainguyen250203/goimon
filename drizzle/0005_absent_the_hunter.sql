DROP INDEX "orders_active_per_table_idx";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_active_per_table_idx" ON "orders" USING btree ("table_id") WHERE "orders"."status" = 'open' and "orders"."deleted_at" is null;