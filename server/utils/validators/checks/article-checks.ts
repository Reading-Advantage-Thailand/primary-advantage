import { prisma } from "@/lib/prisma";
import { fileExistsInBucket } from "@/utils/storage";
import {
  Issue,
  REQUIRED_LOCALES,
  EXPECTED_IMAGES_PER_ARTICLE,
} from "@/server/utils/validators/types";

interface ArticleSentence {
  startTime?: number;
  endTime?: number;
  words?: unknown[];
  sentence?: string;
}

export interface ArticleForCheck {
  id: string;
  passage: string;
  summary: string;
  audioUrl: string | null;
  sentences: unknown; // Json
  translatedPassage: unknown; // Json
  translatedSummary: unknown; // Json
}

/**
 * Runs every check on the given article and returns all issues found.
 * Pure-ish — reads DB and GCS but never writes.
 */
export async function checkArticle(article: ArticleForCheck): Promise<Issue[]> {
  const issues: Issue[] = [];

  // ── A1: 3 images exist in GCS ──
  await Promise.all(
    Array.from({ length: EXPECTED_IMAGES_PER_ARTICLE }, (_, i) => i + 1).map(
      async (index) => {
        const path = `images/${article.id}_${index}.png`;
        const exists = await fileExistsInBucket(path);
        if (!exists) issues.push({ type: "image_missing", index });
      },
    ),
  );

  // ── A2: Audio file exists ──
  if (!article.audioUrl) {
    issues.push({ type: "audio_missing" });
  } else {
    // audioUrl is stored as "/audios/articles/<id>.mp3" — strip leading slash for GCS key
    const key = article.audioUrl.replace(/^\//, "");
    const exists = await fileExistsInBucket(key);
    if (!exists) issues.push({ type: "audio_missing" });
  }

  // ── A4 + A5: Sentences populated and non-empty ──
  const sentences = Array.isArray(article.sentences)
    ? (article.sentences as ArticleSentence[])
    : [];
  if (sentences.length === 0) {
    issues.push({ type: "sentences_empty" });
  }

  // ── A6: translatedPassage complete (per-locale arrays match sentence count) ──
  const tp = (article.translatedPassage ?? {}) as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const arr = tp[locale];
    if (!Array.isArray(arr)) {
      issues.push({ type: "translation_locale_missing", field: "passage", locale });
      continue;
    }
    if (sentences.length > 0 && arr.length !== sentences.length) {
      issues.push({
        type: "translation_count_mismatch",
        field: "passage",
        locale,
        expected: sentences.length,
        actual: arr.length,
      });
    }
  }

  // ── A7: translatedSummary complete ──
  const ts = (article.translatedSummary ?? {}) as Record<string, unknown>;
  for (const locale of REQUIRED_LOCALES) {
    const value = ts[locale];
    if (typeof value !== "string" || value.trim().length === 0) {
      issues.push({ type: "translation_locale_missing", field: "summary", locale });
    }
  }

  // ── A8 + A9 + A10: Flashcard row + audio ──
  const flashcardRow = await prisma.sentencsAndWordsForFlashcard.findFirst({
    where: { articleId: article.id },
    select: { audioSentencesUrl: true, wordsUrl: true },
  });

  if (!flashcardRow) {
    issues.push({ type: "flashcard_row_missing" });
  } else {
    await Promise.all([
      checkFlashcardAudio(flashcardRow.audioSentencesUrl, "flashcard_sentence_audio_missing", issues),
      checkFlashcardAudio(flashcardRow.wordsUrl, "flashcard_word_audio_missing", issues),
    ]);
  }

  return issues;
}

async function checkFlashcardAudio(
  url: string | null,
  missingType:
    | "flashcard_sentence_audio_missing"
    | "flashcard_word_audio_missing",
  issues: Issue[],
): Promise<void> {
  if (!url) {
    issues.push({ type: missingType });
    return;
  }
  const exists = await fileExistsInBucket(url);
  if (!exists) issues.push({ type: missingType });
}
