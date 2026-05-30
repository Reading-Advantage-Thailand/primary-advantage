import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { prisma } from "@/lib/prisma";
import { SentenceTimepoint } from "@/types";
import { z } from "zod";

// Translation schema matching your existing pattern
const sentenceTranslationSchema = z.object({
  translatedSentences: z.object({
    th: z.array(z.string()).describe("Thai translations of the sentences"),
    cn: z
      .array(z.string())
      .describe("Simplified Chinese translations of the sentences"),
    tw: z
      .array(z.string())
      .describe("Traditional Chinese translations of the sentences"),
    vi: z
      .array(z.string())
      .describe("Vietnamese translations of the sentences"),
  }),
});

interface TranslateSentencesParams {
  articleId: string;
  targetLanguages?: string[]; // Optional: specify which languages to translate to
  forceRetranslate?: boolean; // Optional: retranslate even if translations exist
}

interface TranslatedSentences {
  th: string[];
  cn: string[];
  tw: string[];
  vi: string[];
}

/**
 * Extract sentences from the article's sentence timepoints
 */
function extractSentencesFromTimepoints(
  sentences: SentenceTimepoint[],
): string[] {
  return sentences.map((sentenceData) => sentenceData.sentence);
}

/**
 * Translate sentences using AI
 */
async function translateSentencesWithAI(
  sentences: string[],
  targetLanguages: string[],
  cefrLevel?: string,
): Promise<TranslatedSentences> {
  const systemPrompt = `You are a professional translator specializing in educational content for language learners. Translate the following sentences accurately while maintaining:

        1. Appropriate language level${cefrLevel ? ` for CEFR level ${cefrLevel}` : ""}
        2. Natural flow and readability
        3. Educational context and meaning
        4. Cultural appropriateness

        Translate each sentence to:
        - th: Thai
        - cn: Simplified Chinese  
        - tw: Traditional Chinese
        - vi: Vietnamese

        Maintain the same number of sentences in each translation as the original.`;

  const userPrompt = `Translate these sentences:

          ${sentences.map((s, i) => `sentences ${i + 1}: ${s}`).join("\n")}

          Provide translations in the exact same order, maintaining sentence structure and meaning appropriate for language learners.`;

  try {
    const { model, modelId, providerName, temperature } =
      await resolveTaskModel(TASK_KEYS.TRANSLATION_SENTENCE);
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.TRANSLATION_SENTENCE,
        modelId,
        providerName,
      }),
    );

    const result = await generateText({
      model,
      temperature,
      output: Output.object({ schema: sentenceTranslationSchema }),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.output.translatedSentences;
  } catch (error) {
    console.error("Error translating AI :", error);
    throw new Error("Failed to translate sentences with both AI providers");
  }
}

/**
 * Main function to translate sentences and store in database
 */
export async function translateAndStoreSentences({
  articleId,
  targetLanguages = ["th", "cn", "tw", "vi"],
  forceRetranslate = true,
}: TranslateSentencesParams): Promise<void> {
  try {
    // Get the article with current sentences and translations
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        sentences: true,
        translatedPassage: true,
        cefrLevel: true,
      },
    });

    if (!article) {
      throw new Error(`Article with ID ${articleId} not found`);
    }

    if (!article.sentences) {
      throw new Error(
        `No sentences found for article ${articleId}. Generate audio first.`,
      );
    }

    // Check if translations already exist and forceRetranslate is false
    if (article.translatedPassage && !forceRetranslate) {
      console.log(
        `Translations already exist for article ${articleId}. Use forceRetranslate=true to retranslate.`,
      );
      return;
    }

    // Parse the sentences from the JSON field
    const sentenceTimepoints =
      article.sentences as unknown as SentenceTimepoint[];
    const sentences = extractSentencesFromTimepoints(sentenceTimepoints);

    if (sentences.length === 0) {
      throw new Error(`No sentences to translate for article ${articleId}`);
    }

    const originalCount = sentences.length;

    // ── Attempt batch translation (3 retries, same as story path) ──
    let translatedSentences: TranslatedSentences | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const candidate = await translateSentencesWithAI(
          sentences,
          targetLanguages,
          article.cefrLevel,
        );

        const counts = {
          th: candidate.th.length,
          cn: candidate.cn.length,
          tw: candidate.tw.length,
          vi: candidate.vi.length,
        };

        const mismatched = Object.entries(counts).filter(
          ([_, count]) => count !== originalCount,
        );

        if (mismatched.length > 0) {
          throw new Error(
            `Translation count mismatch for article ${articleId}: ` +
              `Original ${originalCount}, Got ${JSON.stringify(counts)}`,
          );
        }

        translatedSentences = candidate;
        break;
      } catch (error) {
        attempts++;
        console.warn(
          `[translateAndStoreSentences] attempt ${attempts} failed: ${error}.`,
        );
        if (attempts < maxAttempts) {
          console.warn(`Retrying...`);
        }
      }
    }

    // ── Per-sentence fallback on persistent count-mismatch ──
    // NEVER trim/pad — that silently misaligns translations (wrong tooltip for learners).
    // Translate each sentence individually (1:1 guaranteed). If one fails, leave null.
    if (translatedSentences === null) {
      console.warn(
        `[translateAndStoreSentences][${articleId}] batch translation ` +
          `failed after ${maxAttempts} attempts — falling back to per-sentence translation.`,
      );

      const perSentence = await Promise.all(
        sentences.map((s) => translateSingleSentence(s, article.cefrLevel)),
      );

      translatedSentences = {
        th: perSentence.map((r) => r.th ?? ""),
        cn: perSentence.map((r) => r.cn ?? ""),
        tw: perSentence.map((r) => r.tw ?? ""),
        vi: perSentence.map((r) => r.vi ?? ""),
      };

      const nullCount = perSentence.filter(
        (r) => r.th === null || r.cn === null || r.tw === null || r.vi === null,
      ).length;
      if (nullCount > 0) {
        console.warn(
          `[translateAndStoreSentences][${articleId}] ` +
            `${nullCount}/${sentences.length} sentences have null translations — ` +
            `stored as empty strings. No tooltip for those sentences.`,
        );
      }
    }

    // Store translations in database
    await prisma.article.update({
      where: { id: articleId },
      data: {
        translatedPassage: JSON.parse(JSON.stringify(translatedSentences)),
      },
    });
  } catch (error: any) {
    console.error(
      `Failed to translate sentences for article ${articleId}:`,
      error,
    );
    throw new Error(`Failed to translate sentences: ${error.message}`);
  }
}

/**
 * Translate a single sentence for all target languages.
 * Returns null entries for languages that fail — never throws.
 */
async function translateSingleSentence(
  sentence: string,
  cefrLevel?: string,
): Promise<{
  th: string | null;
  cn: string | null;
  tw: string | null;
  vi: string | null;
}> {
  try {
    const result = await translateSentencesWithAI(
      [sentence],
      ["th", "cn", "tw", "vi"],
      cefrLevel,
    );
    return {
      th: result.th[0] ?? null,
      cn: result.cn[0] ?? null,
      tw: result.tw[0] ?? null,
      vi: result.vi[0] ?? null,
    };
  } catch {
    return { th: null, cn: null, tw: null, vi: null };
  }
}

export async function translateAndStoreSentencesForStory({
  sentences,
  chapterId,
  chapterNumber,
  cefrLevel,
  targetLanguages = ["th", "cn", "tw", "vi"],
  forceRetranslate = true,
}: {
  sentences: string[];
  chapterId: string;
  chapterNumber: number;
  cefrLevel?: string;
  targetLanguages?: string[];
  forceRetranslate?: boolean;
}): Promise<void> {
  try {
    if (sentences.length === 0 && !forceRetranslate) {
      console.log(
        `Translations already exist for article. Use forceRetranslate=true to retranslate.`,
      );
      return;
    }

    const originalCount = sentences.length;
    let translatedSentences: TranslatedSentences | null = null;

    // ── Attempt batch translation (3 retries) ──
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const candidate = await translateSentencesWithAI(
          sentences,
          targetLanguages,
          cefrLevel,
        );

        const counts = {
          th: candidate.th.length,
          cn: candidate.cn.length,
          tw: candidate.tw.length,
          vi: candidate.vi.length,
        };

        const mismatched = Object.entries(counts).filter(
          ([_, count]) => count !== originalCount,
        );

        if (mismatched.length > 0) {
          throw new Error(
            `Translation count mismatch for chapter ${chapterId}: ` +
              `Original ${originalCount}, Got ${JSON.stringify(counts)}`,
          );
        }

        translatedSentences = candidate;
        break;
      } catch (error) {
        attempts++;
        console.warn(
          `[translateAndStoreSentencesForStory] attempt ${attempts} failed: ${error}.`,
        );
        if (attempts < maxAttempts) {
          console.warn(`Retrying...`);
        }
      }
    }

    // ── Per-sentence fallback on persistent count-mismatch ──
    // NEVER trim/pad — that silently misaligns translations (wrong tooltip for learners).
    // Instead translate each sentence individually (1:1 guaranteed). If one fails,
    // leave null for that position rather than shift everything.
    if (translatedSentences === null) {
      console.warn(
        `[translateAndStoreSentencesForStory][${chapterId}] batch translation ` +
          `failed after ${maxAttempts} attempts — falling back to per-sentence translation.`,
      );

      const perSentence = await Promise.all(
        sentences.map((s) => translateSingleSentence(s, cefrLevel)),
      );

      translatedSentences = {
        th: perSentence.map((r) => r.th ?? ""),
        cn: perSentence.map((r) => r.cn ?? ""),
        tw: perSentence.map((r) => r.tw ?? ""),
        vi: perSentence.map((r) => r.vi ?? ""),
      };

      const nullCount = perSentence.filter(
        (r) => r.th === null || r.cn === null || r.tw === null || r.vi === null,
      ).length;
      if (nullCount > 0) {
        console.warn(
          `[translateAndStoreSentencesForStory][${chapterId}] ` +
            `${nullCount}/${sentences.length} sentences have null translations — ` +
            `stored as empty strings. No tooltip for those sentences.`,
        );
      }
    }

    // Store translations in database
    await prisma.storyChapter.updateMany({
      where: { id: chapterId, chapterNumber },
      data: {
        translatedSentences: JSON.parse(JSON.stringify(translatedSentences)),
      },
    });
  } catch (error: any) {
    console.error(
      `Failed to translate sentences for chapter ${chapterId}:`,
      error,
    );
    throw new Error(`Failed to translate sentences: ${error.message}`);
  }
}
