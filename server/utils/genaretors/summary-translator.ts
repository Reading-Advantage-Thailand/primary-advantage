import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { z } from "zod";

const summaryTranslationSchema = z.object({
  th: z.string().describe("Thai translation of the summary"),
  cn: z.string().describe("Simplified Chinese translation of the summary"),
  tw: z.string().describe("Traditional Chinese translation of the summary"),
  vi: z.string().describe("Vietnamese translation of the summary"),
});

export interface TranslatedSummary {
  th: string;
  cn: string;
  tw: string;
  vi: string;
}

/**
 * Translates a single summary string to all four target locales.
 * Used by validation/repair when only the summary translation is missing
 * (the sentence-level translator handles passages and chapter sentences).
 */
export async function translateSummary(
  summary: string,
  cefrLevel?: string,
): Promise<TranslatedSummary> {
  const systemPrompt = `You are a professional translator specializing in educational content for language learners. Translate the given summary accurately while maintaining:

1. Appropriate language level${cefrLevel ? ` for CEFR level ${cefrLevel}` : ""}
2. Natural flow and readability
3. Educational context and meaning
4. Cultural appropriateness

Translate to:
- th: Thai
- cn: Simplified Chinese
- tw: Traditional Chinese
- vi: Vietnamese`;

  const userPrompt = `Translate this summary:\n\n${summary}\n\nProvide a single translation per language; do not split into sentences.`;

  const { model, modelId, providerName, temperature } = await resolveTaskModel(
    TASK_KEYS.TRANSLATION_SUMMARY,
  );
  console.log(
    formatTaskLog({
      taskKey: TASK_KEYS.TRANSLATION_SUMMARY,
      modelId,
      providerName,
    }),
  );

  const { output } = await generateText({
    model,
    temperature,
    output: Output.object({ schema: summaryTranslationSchema }),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return output;
}
