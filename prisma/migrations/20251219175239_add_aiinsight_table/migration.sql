-- CreateEnum
CREATE TYPE "AIInsightType" AS ENUM ('TREND', 'ALERT', 'RECOMMENDATION', 'ACHIEVEMENT', 'WARNING');

-- CreateEnum
CREATE TYPE "AIInsightScope" AS ENUM ('STUDENT', 'TEACHER', 'CLASSROOM', 'LICENSE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AIInsightPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ai_insights" (
    "id" TEXT NOT NULL,
    "insight_type" "AIInsightType" NOT NULL,
    "scope" "AIInsightScope" NOT NULL,
    "priority" "AIInsightPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "data" JSONB,
    "user_id" TEXT,
    "classroom_id" TEXT,
    "license_id" TEXT,
    "generated_by" TEXT NOT NULL DEFAULT 'ai',
    "model_version" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissed_at" TIMESTAMP(3),
    "action_taken" BOOLEAN NOT NULL DEFAULT false,
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_insights_user_id_dismissed_valid_until_idx" ON "ai_insights"("user_id", "dismissed", "valid_until");

-- CreateIndex
CREATE INDEX "ai_insights_classroom_id_dismissed_valid_until_idx" ON "ai_insights"("classroom_id", "dismissed", "valid_until");

-- CreateIndex
CREATE INDEX "ai_insights_license_id_dismissed_valid_until_idx" ON "ai_insights"("license_id", "dismissed", "valid_until");

-- CreateIndex
CREATE INDEX "ai_insights_scope_priority_created_at_idx" ON "ai_insights"("scope", "priority", "created_at");
