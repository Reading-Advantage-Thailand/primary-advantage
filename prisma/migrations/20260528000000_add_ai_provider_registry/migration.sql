-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('VERTEX', 'OPENAI', 'OPENAI_COMPATIBLE');

-- CreateEnum
CREATE TYPE "AiCapability" AS ENUM ('TEXT', 'IMAGE', 'STREAMING');

-- CreateTable
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AiProviderKind" NOT NULL,
    "base_url" TEXT,
    "api_key_ref" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_task_configs" (
    "id" TEXT NOT NULL,
    "task_key" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "temperature" DOUBLE PRECISION,
    "max_tokens" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ai_task_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_providers_name_key" ON "ai_providers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_task_configs_task_key_key" ON "ai_task_configs"("task_key");

-- AddForeignKey
ALTER TABLE "ai_task_configs" ADD CONSTRAINT "ai_task_configs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "ai_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
