import { ArticleBaseCefrLevel, ArticleType } from "@/types/enum";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ArticleGenerationLogger, ArticleIssue } from "@/lib/logger";
import {
  generateArticleContent,
  ArticleGeneratorResponse,
} from "@/server/utils/genaretors/article-content-generator";
import { evaluateRating } from "@/server/utils/genaretors/evaluate-rating-generator";
import { generatedImage } from "@/server/utils/genaretors/image-generator";
import { generateAudio } from "@/server/utils/genaretors/audio-generator";
import { generateAudioForFlashcard } from "@/server/utils/genaretors/audio-flashcard-generator";
import { convertCefrLevel } from "@/lib/utils";
import { fictionTopics } from "@/data/title-fiction";
import { nonFictionTopics } from "@/data/title-nonfiction";

// ─── Constants ───────────────────────────────────────────────────────────────

const CEFR_BATCHES: ArticleBaseCefrLevel[][] = [
  [ArticleBaseCefrLevel.A0, ArticleBaseCefrLevel.A1, ArticleBaseCefrLevel.A2],
  // [ArticleBaseCefrLevel.B1, ArticleBaseCefrLevel.B2],
];

const ARTICLE_TYPES: ArticleType[] = [
  ArticleType.FICTION,
  ArticleType.NONFICTION,
];

const MAX_RETRY_ATTEMPTS = 3;
const MIN_RATING = 3;
const RETRY_DELAY_BASE_MS = 1000; // exponential: 2s → 4s → 8s

// ─── Topic/Genre Selection ────────────────────────────────────────────────────

function selectRandomFictionGenreAndTopic(cefrLevel: ArticleBaseCefrLevel): {
  genre: string;
  topic: string;
} {
  const entry =
    fictionTopics.find((e) => e.cefrLevel === cefrLevel) ??
    fictionTopics[fictionTopics.length - 1];
  const stories = entry.storyCollection.stories;
  const pick = stories[Math.floor(Math.random() * stories.length)];
  return { genre: pick.genre, topic: pick.description };
}

function selectRandomNonfictionGenreAndTopic(cefrLevel: ArticleBaseCefrLevel): {
  genre: string;
  topic: string;
} {
  const entry =
    nonFictionTopics.find((e) => e.cefrLevel.trim() === cefrLevel) ??
    nonFictionTopics[nonFictionTopics.length - 1];
  const stories = entry.storyCollection.stories;
  const pick = stories[Math.floor(Math.random() * stories.length)];
  return { genre: pick.genre, topic: pick.description };
}

// ─── CEFR Band Validation ─────────────────────────────────────────────────────

/**
 * Validates the evaluated CEFR level stays within the target band.
 * e.g. target "A1" → only "A1-", "A1", "A1+" are valid.
 */
function isWithinCefrBand(target: string, evaluated: string): boolean {
  const base = evaluated.replace(/[+-]$/, "");
  return base === target;
}

// ─── Generation Summary ───────────────────────────────────────────────────────

interface GenerationSummary {
  total: number;
  succeeded: number;
  failed: number;
  errors: { level: string; type: string; error: string; articleId?: string }[];
}

// ─── DB Save ─────────────────────────────────────────────────────────────────

async function saveArticleToDB(
  content: ArticleGeneratorResponse,
  type: ArticleType,
  genre: string,
  topic: string,
  evaluatedCefrLevel: string,
  rating: number,
): Promise<string> {
  const raLevel = convertCefrLevel(evaluatedCefrLevel);

  const article = await prisma.$transaction(async (tx) => {
    return tx.article.create({
      data: {
        title: content.title,
        passage: content.passage,
        summary: content.summary,
        translatedSummary: content.translatedSummary as Prisma.InputJsonValue,
        imageDescription: content.imageDesc,
        genre,
        type,
        cefrLevel: evaluatedCefrLevel,
        raLevel,
        rating,
        topic,
        brainstorming: content.brainstorming,
        planning: content.planning,
        isPublished: true,
        multipleChoiceQuestions: {
          createMany: {
            data: content.multipleChoiceQuestions.map((q) => ({
              question: q.question,
              options: q.options,
              answer: q.answer,
            })),
          },
        },
        shortAnswerQuestions: {
          createMany: {
            data: content.shortAnswerQuestions.map((q) => ({
              question: q.question,
              answer: q.answer,
            })),
          },
        },
        longAnswerQuestions: {
          createMany: {
            data: content.longAnswerQuestions.map((q) => ({
              question: q.question,
            })),
          },
        },
        sentencsAndWordsForFlashcard: {
          create: {
            sentence: content.flashcard as unknown as Prisma.InputJsonValue,
            words: content.wordlist as unknown as Prisma.InputJsonValue,
          },
        },
      },
    });
  });

  return article.id;
}

// ─── Process Single Article ───────────────────────────────────────────────────

const processArticle = async (
  level: ArticleBaseCefrLevel,
  type: ArticleType,
  genre: string,
  topic: string,
  logger: ArticleGenerationLogger,
): Promise<{ articleId?: string }> => {
  let attempt = 0;
  let articleId: string | undefined;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    try {
      // ── Step 1: Generate article content ──
      let content: ArticleGeneratorResponse;
      try {
        console.log(
          `[article-content-generator] generating ${type}/${level} attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`,
        );
        content = await generateArticleContent({
          cefrLevel: level,
          type,
          genre,
          topic,
        });
      } catch (err: any) {
        logger.addIssue({
          step: "article_generation",
          severity: "WARN",
          message: `Attempt ${attempt + 1}: ${err?.message || String(err)}`,
          attempt: attempt + 1,
        });
        throw err;
      }

      // ── Step 2: Evaluate content ──
      let evaluation: { rating: number; cefrLevel?: string };
      try {
        evaluation = await evaluateRating({
          passage: content.passage,
          cefrLevel: level,
        });
      } catch (err: any) {
        logger.addIssue({
          step: "evaluation",
          severity: "WARN",
          message: `Attempt ${attempt + 1}: ${err?.message || String(err)}`,
          attempt: attempt + 1,
        });
        throw err;
      }

      // ── Step 3a: Rating gate ──
      if (evaluation.rating < MIN_RATING) {
        logger.addIssue({
          step: "rating_check",
          severity: "WARN",
          message: `Attempt ${attempt + 1}: Quality rating ${evaluation.rating} below minimum ${MIN_RATING}`,
          attempt: attempt + 1,
        });
        throw new Error(
          `Article quality rating ${evaluation.rating} below minimum ${MIN_RATING}`,
        );
      }

      // ── Step 3b: CEFR band gate ──
      if (!isWithinCefrBand(level, evaluation.cefrLevel || "")) {
        logger.addIssue({
          step: "cefr_band_check",
          severity: "WARN",
          message: `Attempt ${attempt + 1}: Evaluated level '${evaluation.cefrLevel}' is outside target band '${level}' (expected ${level}-, ${level}, or ${level}+)`,
          attempt: attempt + 1,
        });
        throw new Error(
          `Evaluated CEFR level '${evaluation.cefrLevel}' is outside target band for '${level}'`,
        );
      }

      // ── Step 4: Save to database ──
      let savedArticleId: string;
      try {
        savedArticleId = await saveArticleToDB(
          content,
          type,
          genre,
          topic,
          evaluation.cefrLevel!,
          evaluation.rating,
        );
        articleId = savedArticleId;
      } catch (err: any) {
        logger.addIssue({
          step: "save_to_db",
          severity: "WARN",
          message: `Attempt ${attempt + 1}: ${err?.message || String(err)}`,
          attempt: attempt + 1,
        });
        throw err;
      }

      console.log(
        `[article] ${type}/${level} saved — id: ${articleId}, CEFR: ${evaluation.cefrLevel}, rating: ${evaluation.rating}`,
      );

      // ── Steps 5-7: Media (allSettled — partial failure = warning, not error) ──
      const [imageResult, audioResult, flashcardAudioResult] =
        await Promise.allSettled([
          generatedImage({
            imageDesc: content.imageDesc,
            articleId: savedArticleId!,
            passage: content.passage,
          }),
          generateAudio({
            passage: content.passage,
            sentences: content.sentences,
            articleId: savedArticleId!,
          }),
          generateAudioForFlashcard({
            sentences: content.flashcard,
            words: content.wordlist.map((w) => ({
              vocabulary: w.vocabulary,
              definition: w.definitions,
            })),
            contentId: savedArticleId!,
            job: "article",
          }),
        ]);

      // ── Collect media step statuses ──
      let imageOk = true;
      let audioOk = true;
      let flashcardAudioOk = true;

      if (imageResult.status === "rejected") {
        imageOk = false;
        logger.addIssue({
          step: "image_generation",
          severity: "WARN",
          message: imageResult.reason?.message || String(imageResult.reason),
        });
      } else if (!imageResult.value.success) {
        imageOk = false;
        logger.addIssue({
          step: "image_upload",
          severity: "WARN",
          message: imageResult.value.error ?? "Image generation/upload failed",
        });
      }

      if (audioResult.status === "rejected") {
        audioOk = false;
        logger.addIssue({
          step: "audio_generation",
          severity: "WARN",
          message: audioResult.reason?.message || String(audioResult.reason),
        });
      }

      if (flashcardAudioResult.status === "rejected") {
        flashcardAudioOk = false;
        logger.addIssue({
          step: "flashcard_audio",
          severity: "WARN",
          message:
            flashcardAudioResult.reason?.message ||
            String(flashcardAudioResult.reason),
        });
      } else {
        if (!flashcardAudioResult.value.sentenceUploadSuccess) {
          flashcardAudioOk = false;
          logger.addIssue({
            step: "flashcard_audio_upload",
            severity: "WARN",
            message:
              flashcardAudioResult.value.sentenceUploadError ??
              "Flashcard sentence audio upload failed",
          });
        }
        if (!flashcardAudioResult.value.wordUploadSuccess) {
          flashcardAudioOk = false;
          logger.addIssue({
            step: "flashcard_audio_upload",
            severity: "WARN",
            message:
              flashcardAudioResult.value.wordUploadError ??
              "Flashcard word audio upload failed",
          });
        }
      }

      const allOk = imageOk && audioOk && flashcardAudioOk;
      if (!allOk) {
        console.warn(
          `[article] ${type}/${level} (${articleId}) — partial media failure: image:${imageOk ? "✓" : "✗"} audio:${audioOk ? "✓" : "✗"} flashcard:${flashcardAudioOk ? "✓" : "✗"}`,
        );
      }

      return { articleId };
    } catch (error: any) {
      attempt++;
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        logger.addIssue({
          step: "article_generation",
          severity: "ERROR",
          message: `Max retry attempts reached for level ${level} type ${type}: ${error?.message || String(error)}`,
          attempt,
        });
        throw new Error(
          `Max retry attempts reached for level ${level} type ${type}: ${error?.message || error}`,
        );
      }
      // Exponential backoff: 2s → 4s → 8s
      const delay = Math.pow(2, attempt) * RETRY_DELAY_BASE_MS;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { articleId };
};

// ─── Main Controller ──────────────────────────────────────────────────────────

export const generateArticleContentController = async (
  amountPerGen: number,
): Promise<GenerationSummary> => {
  const totalArticles =
    CEFR_BATCHES.flat().length * ARTICLE_TYPES.length * amountPerGen;

  const summary: GenerationSummary = {
    total: totalArticles,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < amountPerGen; i++) {
    for (const batch of CEFR_BATCHES) {
      // Run types sequentially to halve peak AI concurrency (rate limit safety)
      // Within each type, run the CEFR levels in parallel
      for (const type of ARTICLE_TYPES) {
        const batchResults = await Promise.allSettled(
          batch.map(async (level) => {
            const { genre, topic } =
              type === ArticleType.FICTION
                ? selectRandomFictionGenreAndTopic(level)
                : selectRandomNonfictionGenreAndTopic(level);

            const logger = new ArticleGenerationLogger();

            let result: { articleId?: string };
            try {
              result = await processArticle(level, type, genre, topic, logger);
            } catch (err) {
              await logger.flush({
                articleId: undefined,
                cefrLevel: level,
                type,
                genre,
                topic,
                totalAttempts: MAX_RETRY_ATTEMPTS,
                finalStatus: "failed",
              });
              throw err;
            }

            await logger.flush({
              articleId: result.articleId,
              cefrLevel: level,
              type,
              genre,
              topic,
              totalAttempts: 1,
              finalStatus: "succeeded",
            });

            return { level, type, articleId: result.articleId };
          }),
        );

        for (const result of batchResults) {
          if (result.status === "fulfilled") {
            summary.succeeded++;
          } else {
            summary.failed++;
            console.error(
              `[article-generation] failed:`,
              result.reason?.message || result.reason,
            );
            summary.errors.push({
              level: "unknown",
              type,
              error: String(result.reason?.message || result.reason),
            });
          }
        }
      }
    }
  }

  console.log(
    `[article-generation] done — ${summary.succeeded}/${summary.total} succeeded`,
  );
  return summary;
};
