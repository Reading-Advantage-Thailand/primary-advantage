import { generateText, Output } from "ai";
import { google, googleModelLite } from "@/utils/google";
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
    const result = await generateText({
      model: google(googleModelLite),
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

    console.log(
      `Translating ${sentences.length} sentences for article ${articleId}...`,
    );

    // Translate sentences
    const translatedSentences = await translateSentencesWithAI(
      sentences,
      targetLanguages,
      article.cefrLevel,
    );

    // Validate that all translations have the same number of sentences
    const originalCount = sentences.length;
    const translationCounts = {
      th: translatedSentences.th.length,
      cn: translatedSentences.cn.length,
      tw: translatedSentences.tw.length,
      vi: translatedSentences.vi.length,
    };

    const invalidCounts = Object.entries(translationCounts).filter(
      ([_, count]) => count !== originalCount,
    );

    if (invalidCounts.length > 0) {
      console.warn(`Translation count mismatch for article ${articleId}:`, {
        original: originalCount,
        translations: translationCounts,
      });
    }

    // Store translations in database
    await prisma.article.update({
      where: { id: articleId },
      data: {
        translatedPassage: JSON.parse(JSON.stringify(translatedSentences)),
      },
    });

    console.log(
      `Successfully translated and stored sentences for article ${articleId}`,
    );
  } catch (error: any) {
    console.error(
      `Failed to translate sentences for article ${articleId}:`,
      error,
    );
    throw new Error(`Failed to translate sentences: ${error.message}`);
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
    // Check if translations already exist and forceRetranslate is false
    if (sentences.length === 0 && !forceRetranslate) {
      console.log(
        `Translations already exist for article. Use forceRetranslate=true to retranslate.`,
      );
      return;
    }

    let attempts = 0;
    const maxAttempts = 3;
    let translatedSentences: TranslatedSentences | null = null;

    while (attempts < maxAttempts) {
      try {
        translatedSentences = await translateSentencesWithAI(
          sentences,
          targetLanguages,
          cefrLevel,
        );

        const originalCount = sentences.length;
        const translationCounts = {
          th: translatedSentences.th.length,
          cn: translatedSentences.cn.length,
          tw: translatedSentences.tw.length,
          vi: translatedSentences.vi.length,
        };

        const invalidCounts = Object.entries(translationCounts).filter(
          ([_, count]) => count !== originalCount,
        );

        if (invalidCounts.length > 0) {
          const errorMsg = `Translation count mismatch for article ${chapterId}: Original ${originalCount}, Got ${JSON.stringify(translationCounts)}`;
          throw new Error(errorMsg);
        }

        break; // Exit loop if successful
      } catch (error) {
        attempts++;
        console.warn(`Attempt ${attempts} failed: ${error}. Retrying...`);
        if (attempts === maxAttempts) {
          throw new Error(
            `Failed to translate sentences after ${maxAttempts} attempts`,
          );
        }
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
      `Failed to translate sentences for article ${chapterId}:`,
      error,
    );
    throw new Error(`Failed to translate sentences: ${error.message}`);
  }
}
