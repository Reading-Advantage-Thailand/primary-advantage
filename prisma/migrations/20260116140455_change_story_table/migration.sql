/*
  Warnings:

  - You are about to drop the column `audio_words_url` on the `story_chapters` table. All the data in the column will be lost.
  - You are about to drop the column `words` on the `story_chapters` table. All the data in the column will be lost.
  - Added the required column `topic` to the `stories` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sentencs_and_words_for_flashcard" ADD COLUMN     "story_chapter_id" TEXT,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "characters" JSONB,
ADD COLUMN     "is_published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "topic" TEXT NOT NULL,
ADD COLUMN     "translatedSummary" JSONB;

-- AlterTable
ALTER TABLE "story_chapters" DROP COLUMN "audio_words_url",
DROP COLUMN "words";

-- CreateIndex
CREATE INDEX "long_answer_questions_article_id_idx" ON "long_answer_questions"("article_id");

-- CreateIndex
CREATE INDEX "long_answer_questions_story_chapter_id_idx" ON "long_answer_questions"("story_chapter_id");

-- CreateIndex
CREATE INDEX "multiple_choice_questions_article_id_idx" ON "multiple_choice_questions"("article_id");

-- CreateIndex
CREATE INDEX "multiple_choice_questions_story_chapter_id_idx" ON "multiple_choice_questions"("story_chapter_id");

-- CreateIndex
CREATE INDEX "sentencs_and_words_for_flashcard_article_id_idx" ON "sentencs_and_words_for_flashcard"("article_id");

-- CreateIndex
CREATE INDEX "sentencs_and_words_for_flashcard_story_chapter_id_idx" ON "sentencs_and_words_for_flashcard"("story_chapter_id");

-- CreateIndex
CREATE INDEX "short_answer_questions_article_id_idx" ON "short_answer_questions"("article_id");

-- CreateIndex
CREATE INDEX "short_answer_questions_story_chapter_id_idx" ON "short_answer_questions"("story_chapter_id");

-- AddForeignKey
ALTER TABLE "sentencs_and_words_for_flashcard" ADD CONSTRAINT "sentencs_and_words_for_flashcard_story_chapter_id_fkey" FOREIGN KEY ("story_chapter_id") REFERENCES "story_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
