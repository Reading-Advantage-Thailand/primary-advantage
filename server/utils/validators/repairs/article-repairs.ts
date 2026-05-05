import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generatedImage } from "@/server/utils/genaretors/image-generator";
import { generateAudio } from "@/server/utils/genaretors/audio-generator";
import { generateAudioForFlashcard } from "@/server/utils/genaretors/audio-flashcard-generator";
import { translateAndStoreSentences } from "@/server/utils/genaretors/sentence-translator";
import { translateSummary } from "@/server/utils/genaretors/summary-translator";
import { Issue, RepairAction, RepairResult } from "@/server/utils/validators/types";

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
  const sentences = Array.isArray(article.sentences)
    ? (article.sentences as Array<{ sentence: string }>).map((s) => s.sentence)
    : [];
  // generateAudio also rewrites article.sentences and triggers
  // translateAndStoreSentences — fixing audio side-effects translation too.
  await generateAudio({
    passage: article.passage,
    sentences,
    articleId: article.id,
  });
}

async function repairTranslatedPassage(article: ArticleForRepair): Promise<void> {
  await translateAndStoreSentences({ articleId: article.id });
}

async function repairTranslatedSummary(article: ArticleForRepair): Promise<void> {
  const translated = await translateSummary(article.summary, article.cefrLevel);
  await prisma.article.update({
    where: { id: article.id },
    data: { translatedSummary: translated as unknown as Prisma.InputJsonValue },
  });
}

async function repairFlashcardAudio(article: ArticleForRepair): Promise<void> {
  // Re-fetch flashcard row to get current sentence/word lists; if absent,
  // throw so the controller registers the issue as still unresolved.
  const row = await prisma.sentencsAndWordsForFlashcard.findFirst({
    where: { articleId: article.id },
  });
  if (!row || !row.sentence || !row.words) {
    throw new Error("Cannot repair flashcard audio — flashcard row missing or empty");
  }
  await generateAudioForFlashcard({
    sentences: row.sentence as never,
    words: row.words as never,
    contentId: article.id,
    job: "article",
  });
}

async function repairFlashcardRow(article: ArticleForRepair): Promise<void> {
  // Best-effort rebuild from article.sentences and article.words.
  if (!Array.isArray(article.sentences) || !Array.isArray(article.words)) {
    throw new Error("Cannot rebuild flashcard row — article.sentences/words missing");
  }
  await prisma.sentencsAndWordsForFlashcard.create({
    data: {
      articleId: article.id,
      sentence: article.sentences as unknown as Prisma.InputJsonValue,
      words: article.words as unknown as Prisma.InputJsonValue,
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
  if (need.images) actions.push(wrap("repair_images", () => repairImages(article)));
  if (need.audio) actions.push(wrap("repair_audio", () => repairAudio(article)));
  if (need.translatedPassage)
    actions.push(wrap("repair_translated_passage", () => repairTranslatedPassage(article)));
  if (need.translatedSummary)
    actions.push(wrap("repair_translated_summary", () => repairTranslatedSummary(article)));
  if (need.flashcardRow)
    actions.push(wrap("repair_flashcard_row", () => repairFlashcardRow(article)));
  if (need.flashcardAudio)
    actions.push(wrap("repair_flashcard_audio", () => repairFlashcardAudio(article)));
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
