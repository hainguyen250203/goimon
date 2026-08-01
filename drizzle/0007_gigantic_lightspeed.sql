DROP INDEX "tables_status_idx";--> statement-breakpoint
ALTER TABLE "tables" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."table_status";