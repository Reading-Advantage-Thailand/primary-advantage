-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('RPG_BATTLE', 'RUNE_MATCH', 'ENCHANTED_LIBRARY', 'DRAGON_RIDER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'RUNE_MATCH';
ALTER TYPE "ActivityType" ADD VALUE 'RPG_BATTLE';

-- CreateTable
CREATE TABLE "game_rankings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_type" "GameType" NOT NULL,
    "difficulty" TEXT NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_rankings_game_type_difficulty_total_xp_idx" ON "game_rankings"("game_type", "difficulty", "total_xp");

-- CreateIndex
CREATE UNIQUE INDEX "game_rankings_user_id_game_type_difficulty_key" ON "game_rankings"("user_id", "game_type", "difficulty");

-- AddForeignKey
ALTER TABLE "game_rankings" ADD CONSTRAINT "game_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
