/*
  Warnings:

  - The `title` column on the `ai_insights` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `description` column on the `ai_insights` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ai_insights" DROP COLUMN "title",
ADD COLUMN     "title" JSONB,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB;
