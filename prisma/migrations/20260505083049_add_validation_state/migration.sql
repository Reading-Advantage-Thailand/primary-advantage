-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'OK', 'BROKEN', 'PERMANENTLY_BROKEN');

-- AlterTable
ALTER TABLE "article" ADD COLUMN     "last_validation_issues" JSONB,
ADD COLUMN     "repair_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validated_at" TIMESTAMP(3),
ADD COLUMN     "validation_status" "ValidationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "last_validation_issues" JSONB,
ADD COLUMN     "repair_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "validated_at" TIMESTAMP(3),
ADD COLUMN     "validation_status" "ValidationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "validation_runs" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "items_checked" INTEGER NOT NULL DEFAULT 0,
    "items_ok" INTEGER NOT NULL DEFAULT 0,
    "items_repaired" INTEGER NOT NULL DEFAULT 0,
    "items_broken" INTEGER NOT NULL DEFAULT 0,
    "items_permanently_broken" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validation_runs_content_type_started_at_idx" ON "validation_runs"("content_type", "started_at");

-- CreateIndex
CREATE INDEX "article_validation_status_validated_at_idx" ON "article"("validation_status", "validated_at");

-- CreateIndex
CREATE INDEX "stories_validation_status_validated_at_idx" ON "stories"("validation_status", "validated_at");
