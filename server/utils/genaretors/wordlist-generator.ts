// import { WordListResponse } from "./audio-words-generator";
import { generateText, Output } from "ai";
import { resolveTaskModel, formatTaskLog } from "@/server/ai/modelResolver";
import { TASK_KEYS } from "@/server/ai/taskKeys";
import { VocabularySchema } from "@/lib/zod";

interface GenerateWordListParams {
  passage: string;
}

export type WordListResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type GenerateWordListResponse = {
  wordlist: WordListResponse[];
};

export async function generateWordList(
  params: GenerateWordListParams,
): Promise<WordListResponse[]> {
  try {
    const userPrompt = `Extract the ten to fifteen most difficult vocabulary words, phrases, or idioms from the following passage: ${params.passage}`;

    const { model, modelId, providerName, temperature } = await resolveTaskModel(
      TASK_KEYS.WORDLIST_GENERATE,
    );
    console.log(
      formatTaskLog({
        taskKey: TASK_KEYS.WORDLIST_GENERATE,
        modelId,
        providerName,
      }),
    );

    const { output: wordlist } = await generateText({
      model,
      temperature,
      output: Output.object({ schema: VocabularySchema }),
      system: "You are an article database assisstant.",
      prompt: userPrompt,
    });

    return wordlist;
  } catch (error) {
    throw `failed to generate : ${
      error as unknown
    } \n\n error: ${JSON.stringify((error as any).response.data)}`;
  }
}
