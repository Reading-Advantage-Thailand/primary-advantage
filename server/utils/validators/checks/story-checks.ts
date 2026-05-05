import { prisma } from "@/lib/prisma";
import { fileExistsInBucket } from "@/utils/storage";
import { Issue, REQUIRED_LOCALES } from "@/server/utils/validators/types";

export interface StoryForCheck {
  id: string;
  summary: string;
  translatedSummary: unknown;
}

export interface StoryChapterForCheck {
  id: string;
  chapterNumber: number;
  audioSentencesUrl: string | null;
  sentences: unknown;
  translatedSentences: unknown;
  translatedSummary: unknown;
}

export async function checkStory(
  story: StoryForCheck,
  chapters: StoryChapterForCheck[],
): Promise<Issue[]> {
  const issues: Issue[] = [];

  // ── S1: Story.translatedSummary all 4 locales ──
  const ts = (story.translatedSummary ?? {}) as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const v = ts[locale];
    if (typeof v !== "string" || v.trim().length === 0) {
      issues.push({ type: "story_translated_summary_missing", locale });
    }
  }

  // ── S7: Cover image exists ──
  const coverExists = await fileExistsInBucket(`images/story/${story.id}.png`);
  if (!coverExists) issues.push({ type: "story_cover_image_missing" });

  // ── Each chapter ──
  await Promise.all(chapters.map((ch) => checkChapter(ch, issues)));

  return issues;
}

async function checkChapter(
  chapter: StoryChapterForCheck,
  issues: Issue[],
): Promise<void> {
  const { id, chapterNumber } = chapter;

  // ── S8: Chapter image ──
  const imgExists = await fileExistsInBucket(`images/story/${id}.png`);
  if (!imgExists) {
    issues.push({ type: "chapter_image_missing", chapterId: id, chapterNumber });
  }

  // ── S2: Chapter long audio ──
  if (!chapter.audioSentencesUrl) {
    issues.push({ type: "chapter_audio_missing", chapterId: id, chapterNumber });
  } else {
    const exists = await fileExistsInBucket(chapter.audioSentencesUrl);
    if (!exists)
      issues.push({ type: "chapter_audio_missing", chapterId: id, chapterNumber });
  }

  // ── S3: Sentences populated ──
  const sentences = Array.isArray(chapter.sentences)
    ? (chapter.sentences as unknown[])
    : [];
  if (sentences.length === 0) {
    issues.push({ type: "chapter_sentences_empty", chapterId: id, chapterNumber });
  }

  // ── S4: translatedSentences per locale + count match ──
  const tsents = (chapter.translatedSentences ?? {}) as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const arr = tsents[locale];
    if (!Array.isArray(arr)) {
      issues.push({
        type: "chapter_translation_missing",
        chapterId: id,
        chapterNumber,
        field: "sentences",
        locale,
      });
      continue;
    }
    if (sentences.length > 0 && arr.length !== sentences.length) {
      issues.push({
        type: "chapter_translation_count_mismatch",
        chapterId: id,
        chapterNumber,
        locale,
        expected: sentences.length,
        actual: arr.length,
      });
    }
  }

  // ── S5: translatedSummary per locale ──
  const tsum = (chapter.translatedSummary ?? {}) as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const v = tsum[locale];
    if (typeof v !== "string" || v.trim().length === 0) {
      issues.push({
        type: "chapter_translation_missing",
        chapterId: id,
        chapterNumber,
        field: "summary",
        locale,
      });
    }
  }

  // ── S6: Flashcard row + audio (per chapter) ──
  const fcRow = await prisma.sentencsAndWordsForFlashcard.findFirst({
    where: { storyChapterId: id },
    select: { audioSentencesUrl: true, wordsUrl: true },
  });

  if (!fcRow) {
    issues.push({ type: "chapter_flashcard_row_missing", chapterId: id, chapterNumber });
    return;
  }

  if (!fcRow.audioSentencesUrl) {
    issues.push({
      type: "chapter_flashcard_sentence_audio_missing",
      chapterId: id,
      chapterNumber,
    });
  } else {
    const exists = await fileExistsInBucket(fcRow.audioSentencesUrl);
    if (!exists)
      issues.push({
        type: "chapter_flashcard_sentence_audio_missing",
        chapterId: id,
        chapterNumber,
      });
  }

  if (!fcRow.wordsUrl) {
    issues.push({
      type: "chapter_flashcard_word_audio_missing",
      chapterId: id,
      chapterNumber,
    });
  } else {
    const exists = await fileExistsInBucket(fcRow.wordsUrl);
    if (!exists)
      issues.push({
        type: "chapter_flashcard_word_audio_missing",
        chapterId: id,
        chapterNumber,
      });
  }
}
