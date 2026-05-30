import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generatedImage } from "@/server/utils/genaretors/image-generator";
import {
  generateAudio,
  splitIntoSentences,
} from "@/server/utils/genaretors/audio-generator";
import { generateAudioForFlashcard } from "@/server/utils/genaretors/audio-flashcard-generator";
import { regenerateFlashcardContent } from "@/server/utils/genaretors/flashcard-content-generator";
import { translateAndStoreSentences } from "@/server/utils/genaretors/sentence-translator";
import { translateSummary } from "@/server/utils/genaretors/summary-translator";
import {
  Issue,
  RepairAction,
  RepairResult,
} from "@/server/utils/validators/types";

interface ArticleForRepair {
  id: string;
  passage: string;
  summary: string;
  imageDescription: string;
  cefrLevel: string;
  sentences: unknown;
  words: unknown;
  translatedSummary: unknown;
}

// ─── Atomic repair functions ─────────────────────────────────────────────────

async function repairImages(article: ArticleForRepair): Promise<void> {
  const result = await generatedImage({
    imageDesc: article.imageDescription,
    articleId: article.id,
    passage: article.passage,
  });
  if (!result.success) {
    throw new Error(result.error ?? "Image regeneration failed");
  }
}

async function repairAudio(article: ArticleForRepair): Promise<void> {
  let sentences = Array.isArray(article.sentences)
    ? (article.sentences as Array<{ sentence?: string }>)
        .map((s) => s?.sentence ?? "")
        .filter((s) => s.length > 0)
    : [];
  // Fall back to splitting the passage when stored sentences are empty —
  // otherwise the timepoint aligner re-saves [] and the row stays broken.
  if (sentences.length === 0) {
    sentences = await splitIntoSentences(article.passage);
  }
  // generateAudio also rewrites article.sentences and triggers
  // translateAndStoreSentences — fixing audio side-effects translation too.
  await generateAudio({
    passage: article.passage,
    sentences,
    articleId: article.id,
  });
}

async function repairTranslatedPassage(
  article: ArticleForRepair,
): Promise<void> {
  await translateAndStoreSentences({ articleId: article.id });
}

async function repairTranslatedSummary(
  article: ArticleForRepair,
): Promise<void> {
  const translated = await translateSummary(article.summary, article.cefrLevel);
  await prisma.article.update({
    where: { id: article.id },
    data: { translatedSummary: translated as unknown as Prisma.InputJsonValue },
  });
}

async function repairFlashcardAudio(article: ArticleForRepair): Promise<void> {
  const row = await prisma.sentencsAndWordsForFlashcard.findFirst({
    where: { articleId: article.id },
  });
  if (!row) {
    throw new Error("Cannot repair flashcard audio — flashcard row missing");
  }

  // Flashcards are an AI-curated subset (3-5 difficult sentences + 10-15
  // vocab), not the full passage. If either column is null/empty, the audio
  // synthesizer has nothing to TTS and the repair becomes a no-op. Re-pick
  // the missing side(s) via AI from the passage.
  let sentenceData: unknown = row.sentence;
  let wordsData: unknown = row.words;
  const sentenceMissing =
    !Array.isArray(row.sentence) || row.sentence.length === 0;
  const wordsMissing = !Array.isArray(row.words) || row.words.length === 0;

  if (sentenceMissing || wordsMissing) {
    const regenerated = await regenerateFlashcardContent(
      article.passage,
      article.cefrLevel,
    );
    const updateData: Prisma.SentencsAndWordsForFlashcardUpdateInput = {};
    if (sentenceMissing) {
      sentenceData = regenerated.flashcard;
      updateData.sentence =
        regenerated.flashcard as unknown as Prisma.InputJsonValue;
    }
    if (wordsMissing) {
      wordsData = regenerated.wordlist;
      updateData.words =
        regenerated.wordlist as unknown as Prisma.InputJsonValue;
    }
    await prisma.sentencsAndWordsForFlashcard.update({
      where: { id: row.id },
      data: updateData,
    });
  }

  await generateAudioForFlashcard({
    sentences: (sentenceData ?? []) as never,
    words: (wordsData ?? []) as never,
    contentId: article.id,
    job: "article",
  });
}

async function repairFlashcardRow(article: ArticleForRepair): Promise<void> {
  // Re-pick flashcard sentences + vocabulary via AI, matching the original
  // generator's pedagogical curation (subset of the passage, not all of it).
  const regenerated = await regenerateFlashcardContent(
    article.passage,
    article.cefrLevel,
  );
  await prisma.sentencsAndWordsForFlashcard.create({
    data: {
      articleId: article.id,
      sentence: regenerated.flashcard as unknown as Prisma.InputJsonValue,
      words: regenerated.wordlist as unknown as Prisma.InputJsonValue,
    },
  });
  // Now run flashcard audio repair to populate the audio URLs.
  await repairFlashcardAudio(article);
}

// ─── planArticleRepair: dispatch ─────────────────────────────────────────────

export function planArticleRepair(
  issues: Issue[],
  article: ArticleForRepair,
): RepairAction[] {
  const need = {
    images: false,
    audio: false,
    translatedPassage: false,
    translatedSummary: false,
    flashcardAudio: false,
    flashcardRow: false,
  };

  for (const issue of issues) {
    switch (issue.type) {
      case "image_missing":
        need.images = true;
        break;
      case "audio_missing":
      case "sentences_empty":
      case "sentences_count_mismatch":
      case "sentences_partial_coverage":
      case "sentences_timing_integrity":
        need.audio = true;
        break;
      case "translation_locale_missing":
        if (issue.field === "passage") need.translatedPassage = true;
        else if (issue.field === "summary") need.translatedSummary = true;
        break;
      case "translation_count_mismatch":
        if (issue.field === "passage") need.translatedPassage = true;
        break;
      case "flashcard_row_missing":
        need.flashcardRow = true;
        break;
      case "flashcard_sentence_audio_missing":
      case "flashcard_word_audio_missing":
        need.flashcardAudio = true;
        break;
    }
  }

  // Audio repair side-effects translatedPassage; if both flagged, audio covers it.
  if (need.audio) need.translatedPassage = false;
  // Flashcard row rebuild includes audio; if both flagged, row covers it.
  if (need.flashcardRow) need.flashcardAudio = false;

  const actions: RepairAction[] = [];
  if (need.images)
    actions.push(wrap("repair_images", () => repairImages(article)));
  if (need.audio)
    actions.push(wrap("repair_audio", () => repairAudio(article)));
  if (need.translatedPassage)
    actions.push(
      wrap("repair_translated_passage", () => repairTranslatedPassage(article)),
    );
  if (need.translatedSummary)
    actions.push(
      wrap("repair_translated_summary", () => repairTranslatedSummary(article)),
    );
  if (need.flashcardRow)
    actions.push(
      wrap("repair_flashcard_row", () => repairFlashcardRow(article)),
    );
  if (need.flashcardAudio)
    actions.push(
      wrap("repair_flashcard_audio", () => repairFlashcardAudio(article)),
    );
  return actions;
}

function wrap(name: string, fn: () => Promise<void>): RepairAction {
  return {
    name,
    run: async (): Promise<RepairResult> => {
      try {
        await fn();
        return { name, success: true };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { name, success: false, error };
      }
    },
  };
}
