import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { z } from "zod";

const flashcardContentSchema = z.object({
  flashcard: z
    .array(
      z.object({
        sentence: z
          .string()
          .describe("A sentence taken verbatim from the passage"),
        translation: z.object({
          th: z.string().describe("Thai translation of the sentence"),
          cn: z
            .string()
            .describe("Simplified Chinese translation of the sentence"),
          tw: z
            .string()
            .describe("Traditional Chinese translation of the sentence"),
          vi: z.string().describe("Vietnamese translation of the sentence"),
        }),
      }),
    )
    .min(3)
    .max(5)
    .describe("3 to 5 of the most difficult sentences from the passage"),
  wordlist: z
    .array(
      z.object({
        vocabulary: z
          .string()
          .describe("A word, phrase, or idiom taken verbatim from the passage"),
        definition: z.object({
          en: z.string().describe("English definition"),
          th: z.string().describe("Thai definition"),
          cn: z.string().describe("Simplified Chinese definition"),
          tw: z.string().describe("Traditional Chinese definition"),
          vi: z.string().describe("Vietnamese definition"),
        }),
      }),
    )
    .min(10)
    .max(15)
    .describe(
      "10 to 15 of the most difficult vocabulary items from the passage",
    ),
});

export interface FlashcardContent {
  flashcard: Array<{
    sentence: string;
    translation: { th: string; cn: string; tw: string; vi: string };
  }>;
  wordlist: Array<{
    vocabulary: string;
    definition: { en: string; th: string; cn: string; tw: string; vi: string };
  }>;
}

/**
 * Re-pick flashcard sentences + vocabulary for a passage. Used by validation
 * repair when the original generator produced an empty/null flashcard row.
 * Returned shapes match the storage shape on SentencsAndWordsForFlashcard
 * (`definition` is singular here, unlike the article generator's `definitions`).
 */
export async function regenerateFlashcardContent(
  passage: string,
  cefrLevel?: string | null,
): Promise<FlashcardContent> {
  const systemPrompt = `You select flashcard content for English language learners.${cefrLevel ? ` Target CEFR level: ${cefrLevel}.` : ""}

Given a passage, return:
- flashcard: 3 to 5 of the most difficult or pedagogically valuable sentences from the passage, each with translations in Thai (th), Simplified Chinese (cn), Traditional Chinese (tw), and Vietnamese (vi). Use sentences VERBATIM from the passage.
- wordlist: 10 to 15 of the most difficult vocabulary words/phrases/idioms from the passage, each with English definition (en) and translations in th, cn, tw, vi. Use words VERBATIM from the passage.

Do not invent sentences or vocabulary that do not appear in the passage.`;

  const { model, modelId, providerName, temperature } = await resolveTaskModel(
    TASK_KEYS.FLASHCARD_CONTENT,
  );
  console.log(
    formatTaskLog({
      taskKey: TASK_KEYS.FLASHCARD_CONTENT,
      modelId,
      providerName,
    }),
  );

  const { output } = await generateText({
    model,
    output: Output.object({ schema: flashcardContentSchema }),
    system: systemPrompt,
    prompt: `Passage:\n\n${passage}`,
    temperature: temperature,
  });

  return output as FlashcardContent;
}
