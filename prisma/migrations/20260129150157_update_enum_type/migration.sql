/*
  Warnings:

  - The values [CHAPTER_RATING,CHAPTER_READ] on the enum `ActivityType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `passage` to the `story_chapters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('ARTICLE_RATING', 'ARTICLE_READ', 'LEVEL_TEST', 'MC_QUESTION', 'SA_QUESTION', 'LA_QUESTION', 'SENTENCE_FLASHCARDS', 'SENTENCE_MATCHING', 'SENTENCE_ORDERING', 'SENTENCE_WORD_ORDERING', 'SENTENCE_CLOZE_TEST', 'VOCABULARY_FLASHCARDS', 'VOCABULARY_MATCHING', 'STORIES_RATING', 'STORIES_READ', 'STORIES_CHAPTER_RATING', 'STORIES_CHAPTER_READ', 'STORIES_MC_QUESTION', 'STORIES_SA_QUESTION', 'STORIES_LA_QUESTION');
ALTER TABLE "xp_logs" ALTER COLUMN "activityType" TYPE "ActivityType_new" USING ("activityType"::text::"ActivityType_new");
ALTER TABLE "user_activities" ALTER COLUMN "activityType" TYPE "ActivityType_new" USING ("activityType"::text::"ActivityType_new");
ALTER TABLE "goal_progress_logs" ALTER COLUMN "activity_type" TYPE "ActivityType_new" USING ("activity_type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- AlterTable
ALTER TABLE "story_chapters" ADD COLUMN     "passage" TEXT NOT NULL;
